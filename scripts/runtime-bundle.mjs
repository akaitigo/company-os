#!/usr/bin/env node
/* global URL, console, process */
import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const repoDir = resolve(fileURLToPath(new URL('..', import.meta.url)));
const composeFile = resolve(repoDir, 'infra/runtime/compose.production.yaml');
const command = process.argv[2] ?? '';
const configFile = resolve(process.argv[3] ?? '.env.production');
const allowed = new Set([
  'API_IMAGE',
  'WORKER_IMAGE',
  'WEB_IMAGE',
  'DATABASE_URL_SECRET_FILE',
  'DATABASE_CA_CERT_FILE',
  'MIGRATION_DATABASE_URL_SECRET_FILE',
  'SESSION_SECRET_SECRET_FILE',
  'MIGRATION_BACKUP_SIGNING_KEY_FILE',
  'DEPLOYMENT_PROFILE',
  'OIDC_ISSUER',
  'OIDC_AUDIENCE',
  'OIDC_CLIENT_ID',
  'OIDC_REDIRECT_URI',
  'API_INTERNAL_URL',
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'WEB_ARTIFACT_DIR',
  'WEB_BIND_ADDRESS',
  'WEB_PORT',
]);

function refuse(message) {
  console.error(`Runtime bundle refused: ${message}`);
  process.exit(78);
}

function parseEnvironment(contents) {
  const values = {};
  for (const [index, raw] of contents.split(/\r?\n/u).entries()) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    const match = /^([A-Z][A-Z0-9_]*)=(.*)$/u.exec(line);
    if (match === null) refuse(`invalid environment syntax at line ${index + 1}`);
    const [, name, value] = match;
    if (!allowed.has(name)) refuse(`unknown setting ${name}`);
    if (Object.hasOwn(values, name)) refuse(`duplicate setting ${name}`);
    if (value.includes('\0') || value.includes('\n') || value.includes('\r'))
      refuse(`invalid control character in ${name}`);
    values[name] = value;
  }
  return values;
}

function required(values, name) {
  const value = values[name];
  if (value === undefined || value === '') refuse(`${name} is required`);
  return value;
}

function readSecret(values, fileSetting) {
  const fileName = required(values, fileSetting);
  if (!isAbsolute(fileName)) refuse(`${fileSetting} must be an absolute path`);
  let metadata;
  let content;
  try {
    metadata = statSync(fileName);
    content = readFileSync(fileName);
  } catch {
    refuse(`${fileSetting} is not readable`);
  }
  if (
    !metadata.isFile() ||
    metadata.uid !== 10_001 ||
    (metadata.mode & 0o400) === 0 ||
    (metadata.mode & 0o027) !== 0
  )
    refuse(
      `${fileSetting} must be owned by UID 10001, owner-readable, and not group-writable or accessible by others`,
    );
  if (content.length === 0 || content.length > 8192)
    refuse(`${fileSetting} must contain 1 to 8192 bytes`);
  let value = content.toString('utf8');
  if (value.endsWith('\n')) value = value.slice(0, -1);
  if (value === '' || value.includes('\n') || value.includes('\r') || value.includes('\0'))
    refuse(`${fileSetting} must contain exactly one non-empty line`);
  return value;
}

function databaseUrlForHost(value, caFile) {
  const url = new URL(value);
  url.searchParams.set('sslrootcert', caFile);
  return url.toString();
}

function loadEnvironment() {
  let contents;
  try {
    contents = readFileSync(configFile, 'utf8');
  } catch {
    refuse('configuration file is not readable');
  }
  return parseEnvironment(contents);
}

function loadConfig() {
  const values = loadEnvironment();
  for (const name of ['API_IMAGE', 'WORKER_IMAGE', 'WEB_IMAGE']) {
    const image = required(values, name);
    if (!/^[a-z0-9][a-z0-9._/-]*(?::[0-9]+)?\/[a-z0-9._/-]+@sha256:[0-9a-f]{64}$/u.test(image))
      refuse(`${name} must use a registry image digest`);
  }
  for (const name of [
    'DEPLOYMENT_PROFILE',
    'OIDC_ISSUER',
    'OIDC_AUDIENCE',
    'OIDC_CLIENT_ID',
    'OIDC_REDIRECT_URI',
    'OTEL_EXPORTER_OTLP_ENDPOINT',
    'WEB_ARTIFACT_DIR',
  ])
    required(values, name);
  if (values.DEPLOYMENT_PROFILE !== 'SMB') refuse('DEPLOYMENT_PROFILE must be SMB');
  const caFile = required(values, 'DATABASE_CA_CERT_FILE');
  if (!isAbsolute(caFile)) refuse('DATABASE_CA_CERT_FILE must be an absolute path');
  try {
    const metadata = statSync(caFile);
    if (
      !metadata.isFile() ||
      metadata.size === 0 ||
      metadata.size > 1_048_576 ||
      metadata.uid !== 10_001 ||
      (metadata.mode & 0o400) === 0 ||
      (metadata.mode & 0o027) !== 0
    )
      refuse(
        'DATABASE_CA_CERT_FILE must be a non-empty file of at most 1 MiB owned and readable by UID 10001 without group write or other access',
      );
    readFileSync(caFile);
  } catch {
    refuse('DATABASE_CA_CERT_FILE is not readable');
  }
  return values;
}

function preflight(values, mode) {
  const caFile = required(values, 'DATABASE_CA_CERT_FILE');
  const environment = {
    ...process.env,
    ...values,
    DATABASE_URL: databaseUrlForHost(readSecret(values, 'DATABASE_URL_SECRET_FILE'), caFile),
    MIGRATION_DATABASE_URL: databaseUrlForHost(
      readSecret(values, 'MIGRATION_DATABASE_URL_SECRET_FILE'),
      caFile,
    ),
    SESSION_SECRET: readSecret(values, 'SESSION_SECRET_SECRET_FILE'),
    MIGRATION_BACKUP_SIGNING_KEY: readSecret(values, 'MIGRATION_BACKUP_SIGNING_KEY_FILE'),
    API_INTERNAL_URL: values.API_INTERNAL_URL ?? 'http://api:3001',
  };
  const result = spawnSync(resolve(repoDir, 'scripts/preflight'), [mode], {
    cwd: repoDir,
    env: environment,
    stdio: 'inherit',
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function compose(values, args, stdio = 'inherit') {
  const result = spawnSync(
    'docker',
    ['compose', '--env-file', configFile, '-f', composeFile, ...args],
    { cwd: repoDir, env: { ...process.env, ...values }, stdio, encoding: 'utf8' },
  );
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout;
}

const values = command === 'down' ? loadEnvironment() : loadConfig();
switch (command) {
  case 'validate':
    preflight(values, 'validate');
    compose(values, ['config', '--quiet']);
    break;
  case 'up':
    preflight(values, 'check');
    compose(values, ['up', '-d', '--wait', '--remove-orphans']);
    break;
  case 'down':
    compose(values, ['down']);
    break;
  case 'evidence': {
    const services = {};
    for (const service of ['api', 'worker', 'web']) {
      const container = compose(values, ['ps', '-q', service], 'pipe').trim();
      if (container === '') refuse(`${service} is not running`);
      const inspected = spawnSync('docker', ['inspect', container], { encoding: 'utf8' });
      if (inspected.status !== 0) refuse(`${service} cannot be inspected`);
      const [state] = JSON.parse(inspected.stdout);
      const expectedImage = values[`${service.toUpperCase()}_IMAGE`];
      const imageInspected = spawnSync('docker', ['image', 'inspect', state.Image], {
        encoding: 'utf8',
      });
      if (imageInspected.status !== 0) refuse(`${service} image cannot be inspected`);
      const [imageState] = JSON.parse(imageInspected.stdout);
      if (state.Config.Image !== expectedImage || !imageState.RepoDigests?.includes(expectedImage))
        refuse(`${service} running image does not match the configured digest`);
      if (
        state.State.Status !== 'running' ||
        state.State.Health?.Status !== 'healthy' ||
        state.HostConfig.ReadonlyRootfs !== true ||
        state.Config.User !== '10001:10001'
      )
        refuse(`${service} runtime policy or health does not match the contract`);
      services[service] = {
        image: state.Config.Image,
        imageId: state.Image,
        status: state.State.Status,
        health: state.State.Health?.Status ?? 'missing',
        readOnly: state.HostConfig.ReadonlyRootfs,
        user: state.Config.User,
      };
    }
    const contract = JSON.parse(
      readFileSync(resolve(repoDir, 'infra/config/deployment-contract-v1.json'), 'utf8'),
    );
    process.stdout.write(
      `${JSON.stringify({ schemaVersion: 1, contractVersion: contract.contractVersion, services }, null, 2)}\n`,
    );
    break;
  }
  default:
    refuse('usage: scripts/runtime-bundle {validate|up|down|evidence} [environment-file]');
}
