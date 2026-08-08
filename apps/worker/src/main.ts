import { setTimeout as delay } from 'node:timers/promises';
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

export async function processNext(pool: Pool): Promise<boolean> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await client.query(
      `SELECT tenant_id,id,event_type,aggregate_id,aggregate_version,payload,attempts
       FROM integration.outbox
       WHERE processed_at IS NULL AND available_at <= now()
       ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1`,
    );
    const row = result.rows[0] as unknown;
    if (row === undefined) {
      await client.query('ROLLBACK');
      return false;
    }
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
    throw error;
  } finally {
    client.release();
  }
}

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
while (!shutdown.signal.aborted) {
  const processed = await processNext(pool);
  if (!processed) await delay(500);
}
await pool.end();
