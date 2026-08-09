import { setTimeout as delay } from 'node:timers/promises';
import { createServer, type Server } from 'node:http';
import { pathToFileURL } from 'node:url';
import { Pool } from 'pg';
import { z } from 'zod';

const eventSchema = z.object({
  tenant_id: z.uuid(),
  id: z.uuid(),
  event_type: z.literal('organization.unit.created.v1'),
  aggregate_id: z.uuid(),
  aggregate_version: z.number().int().positive(),
  payload: z.object({ code: z.string().max(32), name: z.string().max(200) }),
  attempts: z.number().int().nonnegative(),
});
export const ORGANIZATION_EVENT_TYPE = 'organization.unit.created.v1';
const MAX_ATTEMPTS = 20;

export interface WorkerHealth {
  ready: boolean;
  consecutiveFailures: number;
}

interface RunOptions {
  readonly signal: AbortSignal;
  readonly health: WorkerHealth;
  readonly sleep?: (milliseconds: number) => Promise<void>;
  readonly random?: () => number;
  readonly pollMilliseconds?: number;
  readonly log?: (entry: Readonly<Record<string, unknown>>) => void;
}

export function reconnectDelay(
  consecutiveFailures: number,
  random: () => number = Math.random,
): number {
  const ceiling = Math.min(30_000, 250 * 2 ** Math.min(7, Math.max(0, consecutiveFailures - 1)));
  return Math.floor(ceiling / 2 + random() * (ceiling / 2));
}

export function startHealthServer(health: WorkerHealth, port: number, host = '0.0.0.0'): Server {
  return createServer((request, response) => {
    response.setHeader('content-type', 'application/json');
    if (request.url === '/health/live') {
      response.statusCode = 200;
      response.end(JSON.stringify({ status: 'ok' }));
      return;
    }
    if (request.url === '/health/ready') {
      response.statusCode = health.ready ? 200 : 503;
      response.end(
        JSON.stringify({
          status: health.ready ? 'ready' : 'degraded',
          consecutiveFailures: health.consecutiveFailures,
        }),
      );
      return;
    }
    response.statusCode = 404;
    response.end(JSON.stringify({ status: 'not_found' }));
  }).listen(port, host);
}

export async function processNext(pool: Pool): Promise<boolean> {
  const client = await pool.connect();
  let selected: { tenantId: string; id: string } | undefined;
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT tenant_id,id,event_type,aggregate_id,aggregate_version,payload,attempts
       FROM integration.outbox
       WHERE processed_at IS NULL AND available_at <= now() AND event_type=$1 AND attempts < $2
       ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1`,
      [ORGANIZATION_EVENT_TYPE, MAX_ATTEMPTS],
    );
    const row = result.rows[0] as unknown;
    if (row === undefined) {
      await client.query('ROLLBACK');
      return false;
    }
    const identity = z.object({ tenant_id: z.uuid(), id: z.uuid() }).parse(row);
    selected = { tenantId: identity.tenant_id, id: identity.id };
    const event = eventSchema.parse(row);
    await client.query('SET LOCAL ROLE company_os_app');
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [event.tenant_id]);
    await client.query(
      `INSERT INTO projection.organization_unit_directory
       (tenant_id,unit_id,code,name,source_version) VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (tenant_id,unit_id) DO UPDATE SET
         code=EXCLUDED.code,name=EXCLUDED.name,source_version=EXCLUDED.source_version,projected_at=clock_timestamp()
       WHERE projection.organization_unit_directory.source_version < EXCLUDED.source_version`,
      [
        event.tenant_id,
        event.aggregate_id,
        event.payload.code,
        event.payload.name,
        event.aggregate_version,
      ],
    );
    await client.query('RESET ROLE');
    await client.query(
      'UPDATE integration.outbox SET processed_at=clock_timestamp(),claimed_until=NULL WHERE tenant_id=$1 AND id=$2',
      [event.tenant_id, event.id],
    );
    await client.query('COMMIT');
    return true;
  } catch (error) {
    await client.query('ROLLBACK');
    if (selected === undefined) throw error;
    const message = error instanceof Error ? error.message : 'Unknown projection failure';
    await client.query(
      `UPDATE integration.outbox
          SET attempts=least(attempts+1,$3),
              available_at=clock_timestamp() + make_interval(secs => least(300,power(2,attempts)::integer)),
              claimed_until=NULL,last_error=$4
        WHERE tenant_id=$1 AND id=$2`,
      [selected.tenantId, selected.id, MAX_ATTEMPTS, message.slice(0, 1000)],
    );
    return true;
  } finally {
    client.release();
  }
}

export async function runWorker(pool: Pool, options: RunOptions): Promise<void> {
  const sleep =
    options.sleep ??
    (async (milliseconds) => {
      try {
        await delay(milliseconds, undefined, { signal: options.signal });
      } catch (error) {
        if (!(error instanceof Error) || error.name !== 'AbortError') throw error;
      }
    });
  const random = options.random ?? Math.random;
  const pollMilliseconds = options.pollMilliseconds ?? 500;
  const log =
    options.log ??
    ((entry) => {
      console.log(JSON.stringify(entry));
    });
  const onPoolError = (error: Error): void => {
    options.health.ready = false;
    log({ level: 'error', event: 'worker.database.disconnected', message: error.message });
  };
  pool.on('error', onPoolError);
  try {
    while (!options.signal.aborted) {
      try {
        const processed = await processNext(pool);
        const recovered = options.health.consecutiveFailures > 0 || !options.health.ready;
        options.health.ready = true;
        options.health.consecutiveFailures = 0;
        if (recovered) log({ level: 'info', event: 'worker.database.recovered' });
        if (!processed) await sleep(pollMilliseconds);
      } catch (error) {
        options.health.ready = false;
        options.health.consecutiveFailures += 1;
        const milliseconds = reconnectDelay(options.health.consecutiveFailures, random);
        log({
          level: 'warn',
          event: 'worker.database.retry',
          attempt: options.health.consecutiveFailures,
          delayMilliseconds: milliseconds,
          message: error instanceof Error ? error.message : 'Unknown database failure',
        });
        await sleep(milliseconds);
      }
    }
  } finally {
    pool.off('error', onPoolError);
  }
}

async function run(): Promise<void> {
  const pool = new Pool({
    connectionString: process.env['DATABASE_URL'],
    max: 4,
    connectionTimeoutMillis: 3_000,
  });
  const shutdown = new AbortController();
  process.once('SIGTERM', () => {
    shutdown.abort();
  });
  process.once('SIGINT', () => {
    shutdown.abort();
  });
  const health: WorkerHealth = { ready: false, consecutiveFailures: 0 };
  const healthPort = z.coerce
    .number()
    .int()
    .min(1)
    .max(65_535)
    .parse(process.env['WORKER_HEALTH_PORT'] ?? 3002);
  const healthHost = z
    .string()
    .min(1)
    .parse(process.env['WORKER_HEALTH_HOST'] ?? '0.0.0.0');
  const healthServer = startHealthServer(health, healthPort, healthHost);
  try {
    await runWorker(pool, { signal: shutdown.signal, health });
  } finally {
    await new Promise<void>((resolve, reject) => {
      healthServer.close((error) => {
        if (error === undefined) resolve();
        else reject(error);
      });
    });
    await pool.end();
  }
}

const entrypoint = process.argv[1];
if (entrypoint !== undefined && import.meta.url === pathToFileURL(entrypoint).href) await run();
