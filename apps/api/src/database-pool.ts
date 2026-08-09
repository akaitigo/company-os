import { Pool, type PoolConfig } from 'pg';

export function createDatabasePool(config: PoolConfig): Pool {
  const pool = new Pool(config);
  pool.on('error', () => {
    console.error(JSON.stringify({ level: 'error', event: 'api.database.disconnected' }));
  });
  return pool;
}
