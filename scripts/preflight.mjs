#!/usr/bin/env node
/* global AbortSignal, URL, clearTimeout, fetch, process, setTimeout */
import { readFile } from 'node:fs/promises';
import { connect as tcpConnect } from 'node:net';
import { connect as tlsConnect } from 'node:tls';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const repoDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2] ?? 'validate';
const checks = [];
const failed = new Set();
const add = (id, status, code) => {
  checks.push({ id, status, code });
  if (status === 'fail') failed.add(id);
};
const fail = (id, code) => add(id, 'fail', code);
const pass = (id, code = 'accepted') => add(id, 'pass', code);
const skip = (id, code = 'not-applicable') => add(id, 'skip', code);
const hasFailed = (...ids) => ids.some((id) => failed.has(id));
const env = process.env;
let contract;
let contractValid = false;
let profile = env['DEPLOYMENT_PROFILE'] ?? '';
let timeoutMs = 5000;
const overallDeadline = Date.now() + 30_000;
const remainingTimeout = () => Math.max(1, Math.min(timeoutMs, overallDeadline - Date.now()));
const expectedFields = [
  ['DEPLOYMENT_PROFILE', 'operator', false, ['DEV', 'SMB'], 'profile'],
  ['DATABASE_URL', 'runtime', true, ['DEV', 'SMB'], 'postgres-url'],
  ['MIGRATION_DATABASE_URL', 'migration-owner', true, ['SMB'], 'postgres-url'],
  ['OIDC_ISSUER', 'identity-admin', false, ['DEV', 'SMB'], 'issuer-url'],
  ['OIDC_AUDIENCE', 'identity-admin', false, ['DEV', 'SMB'], 'identifier'],
  ['OIDC_CLIENT_ID', 'identity-admin', false, ['DEV', 'SMB'], 'identifier'],
  ['OIDC_REDIRECT_URI', 'operator', false, ['DEV', 'SMB'], 'redirect-url'],
  ['SESSION_SECRET', 'secret-manager', true, ['DEV', 'SMB'], 'secret', 32],
  ['MIGRATION_BACKUP_SIGNING_KEY', 'secret-manager', true, ['SMB'], 'secret', 32],
  ['API_INTERNAL_URL', 'operator', false, ['DEV', 'SMB'], 'internal-url'],
  ['OTEL_EXPORTER_OTLP_ENDPOINT', 'operator', false, ['DEV', 'SMB'], 'telemetry-url'],
  ['WEB_ARTIFACT_DIR', 'release-manager', false, ['DEV', 'SMB'], 'artifact-directory'],
  ['S3_ENDPOINT', 'operator', false, [], 'https-url'],
  ['S3_ACCESS_KEY', 'secret-manager', true, [], 'secret', 16],
  ['S3_SECRET_KEY', 'secret-manager', true, [], 'secret', 32],
];

function safeUrl(name, kind) {
  try {
    const value = new URL(env[name]);
    if (kind === 'postgres-url' && !['postgres:', 'postgresql:'].includes(value.protocol))
      fail(`config.${name}`, 'protocol-invalid');
    if (kind !== 'postgres-url' && (value.username !== '' || value.password !== ''))
      fail(`config.${name}`, 'userinfo-forbidden');
    if (
      profile === 'SMB' &&
      ['issuer-url', 'redirect-url', 'https-url', 'telemetry-url'].includes(kind) &&
      value.protocol !== 'https:'
    )
      fail(`config.${name}`, 'https-required');
    if (kind === 'redirect-url' && value.pathname !== '/auth/callback')
      fail(`config.${name}`, 'callback-path-invalid');
    if (kind === 'issuer-url' && !value.pathname.includes('/realms/'))
      fail(`config.${name}`, 'realm-path-invalid');
    if (profile === 'SMB' && value.hostname.endsWith('.invalid'))
      fail(`config.${name}`, 'placeholder-forbidden');
    if (failed.has(`config.${name}`)) return undefined;
    return value;
  } catch {
    fail(`config.${name}`, 'url-invalid');
    return undefined;
  }
}

function validateContract(value) {
  if (
    value?.schemaVersion !== 1 ||
    typeof value.contractVersion !== 'string' ||
    JSON.stringify(value.profiles) !== JSON.stringify(['DEV', 'SMB']) ||
    !Array.isArray(value.fields) ||
    !Number.isInteger(value.timeoutSeconds) ||
    value.timeoutSeconds < 1 ||
    value.timeoutSeconds > 30
  )
    return false;
  if (value.fields.length !== expectedFields.length) return false;
  return expectedFields.every(([name, owner, secret, requiredIn, kind, minLength]) => {
    const field = value.fields.find((candidate) => candidate.name === name);
    return (
      field?.owner === owner &&
      field.secret === secret &&
      field.kind === kind &&
      JSON.stringify(field.requiredIn) === JSON.stringify(requiredIn) &&
      field.minLength === minLength
    );
  });
}

async function tcpCheck(url, checkTimeout) {
  const port = Number(url.port || (url.protocol === 'https:' ? 443 : 80));
  await new Promise((resolve, reject) => {
    const socket =
      url.protocol === 'https:'
        ? tlsConnect({ host: url.hostname, port, servername: url.hostname })
        : tcpConnect({ host: url.hostname, port });
    const timer = setTimeout(() => socket.destroy(new Error('timeout')), checkTimeout);
    socket.once(url.protocol === 'https:' ? 'secureConnect' : 'connect', () => {
      clearTimeout(timer);
      socket.destroy();
      resolve();
    });
    socket.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function dbCheck(connectionString, kind, runtimeUser) {
  const pg = await import('../apps/api/node_modules/pg/lib/index.js');
  const checkTimeout = remainingTimeout();
  const client = new pg.default.Client({
    connectionString,
    connectionTimeoutMillis: checkTimeout,
    query_timeout: checkTimeout,
    statement_timeout: checkTimeout,
  });
  let hardTimer;
  try {
    return await Promise.race([
      (async () => {
        await client.connect();
        const result = await client.query(
          kind === 'runtime'
            ? `SELECT current_user, role.rolsuper, role.rolbypassrls, role.rolcreatedb,
             role.rolcreaterole, role.rolreplication,
             pg_has_role(current_user, 'company_os_app', 'member') AS app_member,
             has_schema_privilege(current_user, 'migration', 'USAGE') AS migration_usage,
             has_database_privilege(current_user, current_database(), 'CREATE') AS database_create,
             EXISTS (
               SELECT FROM pg_namespace namespace
               WHERE pg_get_userbyid(namespace.nspowner) = current_user
                 AND namespace.nspname <> 'pg_temp_1'
             ) AS owns_schema
           FROM pg_roles role WHERE role.rolname = current_user`
            : `SELECT current_user, role.rolsuper, role.rolbypassrls, role.rolcreatedb,
             role.rolcreaterole, role.rolreplication,
             pg_has_role(current_user, 'company_os_app', 'member') AS app_member,
             has_database_privilege(current_user, current_database(), 'CREATE') AS database_create,
             EXISTS (
               SELECT FROM pg_namespace namespace
               WHERE namespace.nspname = 'migration'
                 AND pg_get_userbyid(namespace.nspowner) = current_user
             ) AS migration_schema_owned,
             EXISTS (
               SELECT FROM pg_class ledger
               JOIN pg_namespace namespace ON namespace.oid = ledger.relnamespace
               WHERE namespace.nspname = 'migration'
                 AND ledger.relname = 'schema_migrations'
                 AND pg_get_userbyid(ledger.relowner) = current_user
             ) AS migration_ledger_owned
           FROM pg_roles role WHERE role.rolname = current_user`,
        );
        const row = result.rows[0];
        if (row === undefined) return false;
        if (profile !== 'SMB') return true;
        if (kind === 'runtime')
          return (
            !row.rolsuper &&
            !row.rolbypassrls &&
            !row.rolcreatedb &&
            !row.rolcreaterole &&
            !row.rolreplication &&
            row.app_member &&
            !row.migration_usage &&
            !row.database_create &&
            !row.owns_schema
          );
        return (
          row.current_user !== runtimeUser &&
          !row.rolsuper &&
          !row.rolbypassrls &&
          !row.rolcreatedb &&
          !row.rolcreaterole &&
          !row.rolreplication &&
          !row.app_member &&
          row.database_create &&
          row.migration_schema_owned &&
          row.migration_ledger_owned
        );
      })(),
      new Promise((_, reject) => {
        hardTimer = setTimeout(() => reject(new Error('timeout')), checkTimeout);
      }),
    ]);
  } finally {
    clearTimeout(hardTimer);
    client.connection?.stream?.destroy();
    await Promise.race([
      client.end().catch(() => undefined),
      new Promise((resolve) => setTimeout(resolve, 100)),
    ]);
  }
}

try {
  contract = JSON.parse(
    await readFile(
      env['PREFLIGHT_CONTRACT'] ?? path.join(repoDir, 'infra/config/deployment-contract-v1.json'),
      'utf8',
    ),
  );
  if (validateContract(contract)) {
    contractValid = true;
    pass('contract.schema');
    timeoutMs = contract.timeoutSeconds * 1000;
  } else fail('contract.schema', 'invalid');
} catch {
  fail('contract.schema', 'unreadable');
}

if (!['validate', 'check'].includes(mode)) fail('command.mode', 'invalid');
else pass('command.mode');
if (!contract?.profiles?.includes(profile)) fail('config.DEPLOYMENT_PROFILE', 'profile-invalid');
else pass('config.DEPLOYMENT_PROFILE');

const placeholder =
  /(replace[-_ ]with|change[-_ ]me|local[-_ ]development[-_ ]only|example\.invalid)/i;
const urls = new Map();
if (contractValid && contract.profiles.includes(profile)) {
  for (const field of contract.fields) {
    const id = `config.${field.name}`;
    if (field.name === 'DEPLOYMENT_PROFILE') continue;
    const value = env[field.name];
    const required = field.requiredIn.includes(profile);
    if (value === undefined || value === '') {
      if (required) fail(id, 'required');
      else skip(id);
      continue;
    }
    if (
      field.secret &&
      (value.length < (field.minLength ?? 1) || (profile === 'SMB' && placeholder.test(value)))
    ) {
      fail(id, 'secret-invalid');
      continue;
    }
    if (field.kind.endsWith('url')) {
      const before = failed.size;
      const url = safeUrl(field.name, field.kind);
      if (url !== undefined) urls.set(field.name, url);
      if (failed.size === before) pass(id);
    } else if (field.kind === 'artifact-directory') pass(id);
    else pass(id);
  }
}

let runtimeDbUser;
const runtimeDb = urls.get('DATABASE_URL');
const ownerDb = urls.get('MIGRATION_DATABASE_URL');
if (runtimeDb !== undefined) {
  runtimeDbUser = decodeURIComponent(runtimeDb.username);
  if (profile === 'SMB' && !['verify-full'].includes(runtimeDb.searchParams.get('sslmode') ?? ''))
    fail('database.runtime-tls', 'verify-full-required');
  else pass('database.runtime-tls');
}
if (profile === 'SMB' && ownerDb !== undefined) {
  const ownerUser = decodeURIComponent(ownerDb.username);
  if (ownerDb.searchParams.get('sslmode') !== 'verify-full')
    fail('database.owner-tls', 'verify-full-required');
  else pass('database.owner-tls');
  if (ownerUser === runtimeDbUser) fail('database.role-separation', 'same-role');
  else pass('database.role-separation');
} else if (profile === 'DEV') {
  skip('database.owner-tls');
  skip('database.role-separation');
}

const expectedNode = (await readFile(path.join(repoDir, '.node-version'), 'utf8')).trim();
if (process.versions.node === expectedNode) pass('runtime.node-version');
else fail('runtime.node-version', 'mismatch');

if (mode === 'check' && !hasFailed('contract.schema', 'command.mode')) {
  if (runtimeDb === undefined || hasFailed('database.runtime-tls'))
    skip('database.runtime-privileges', 'configuration-failed');
  else
    try {
      if (await dbCheck(env['DATABASE_URL'], 'runtime')) pass('database.runtime-privileges');
      else fail('database.runtime-privileges', 'excess-or-missing');
    } catch {
      fail('database.runtime-privileges', 'unreachable');
    }
  if (profile === 'SMB') {
    if (ownerDb === undefined || hasFailed('database.owner-tls'))
      skip('database.owner-privileges', 'configuration-failed');
    else
      try {
        if (await dbCheck(env['MIGRATION_DATABASE_URL'], 'owner', runtimeDbUser))
          pass('database.owner-privileges');
        else fail('database.owner-privileges', 'excess-or-missing');
      } catch {
        fail('database.owner-privileges', 'unreachable');
      }
  } else skip('database.owner-privileges');

  const issuer = urls.get('OIDC_ISSUER');
  if (issuer === undefined) skip('identity.discovery', 'configuration-failed');
  else
    try {
      const response = await fetch(new URL('.well-known/openid-configuration', `${issuer.href}/`), {
        redirect: 'error',
        signal: AbortSignal.timeout(remainingTimeout()),
      });
      const discovery = await response.json();
      const desired = JSON.parse(
        await readFile(path.join(repoDir, 'infra/keycloak/reconciliation-v1.json'), 'utf8'),
      );
      const realm = issuer.pathname.split('/').filter(Boolean).at(-1);
      if (
        response.ok &&
        discovery.issuer === issuer.href.replace(/\/$/, '') &&
        realm === desired.realm &&
        (profile !== 'SMB' ||
          ['authorization_endpoint', 'token_endpoint', 'jwks_uri'].every(
            (key) => new URL(discovery[key]).protocol === 'https:',
          ))
      )
        pass('identity.discovery');
      else fail('identity.discovery', 'mismatch');
    } catch {
      fail('identity.discovery', 'unreachable');
    }

  const telemetry = urls.get('OTEL_EXPORTER_OTLP_ENDPOINT');
  if (telemetry === undefined) skip('telemetry.connectivity', 'configuration-failed');
  else
    try {
      await tcpCheck(telemetry, remainingTimeout());
      pass('telemetry.connectivity');
    } catch {
      fail('telemetry.connectivity', 'unreachable');
    }

  if (hasFailed('config.WEB_ARTIFACT_DIR')) skip('artifact.web-integrity', 'configuration-failed');
  else {
    const artifact = spawnSync(path.join(repoDir, 'scripts/verify-web-artifact'), [], {
      env,
      stdio: 'ignore',
      timeout: remainingTimeout(),
    });
    if (artifact.status === 0) pass('artifact.web-integrity');
    else fail('artifact.web-integrity', 'invalid');
  }
} else if (mode === 'validate') {
  skip('database.runtime-privileges', 'offline');
  skip('database.owner-privileges', 'offline');
  skip('identity.discovery', 'offline');
  skip('telemetry.connectivity', 'offline');
  skip('artifact.web-integrity', 'offline');
} else {
  skip('database.runtime-privileges', 'configuration-failed');
  skip('database.owner-privileges', 'configuration-failed');
  skip('identity.discovery', 'configuration-failed');
  skip('telemetry.connectivity', 'configuration-failed');
  skip('artifact.web-integrity', 'configuration-failed');
}

const status = checks.some((check) => check.status === 'fail') ? 'fail' : 'pass';
process.stdout.write(
  `${JSON.stringify(
    {
      schemaVersion: 1,
      contractVersion: contract?.contractVersion ?? 'unknown',
      generatedAt: new Date().toISOString(),
      profile: contract?.profiles?.includes(profile) ? profile : 'invalid',
      mode: ['validate', 'check'].includes(mode) ? mode : 'invalid',
      status,
      checks,
    },
    null,
    2,
  )}\n`,
);
process.exitCode = status === 'pass' ? 0 : 1;
