import { Controller, Get, ServiceUnavailableException, SetMetadata } from '@nestjs/common';
import type { OnApplicationShutdown } from '@nestjs/common';
import { Pool } from 'pg';

@Controller()
export class HealthController implements OnApplicationShutdown {
  private readonly pool = new Pool({
    connectionString: process.env['DATABASE_URL'],
    max: 1,
    connectionTimeoutMillis: 2_000,
    idleTimeoutMillis: 10_000,
  });

  @Get('/health/live')
  @SetMetadata('public', true)
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }

  @Get('/health/ready')
  @SetMetadata('public', true)
  async ready(): Promise<{ status: 'ready' }> {
    try {
      await this.pool.query('SELECT 1');
      return { status: 'ready' };
    } catch {
      throw new ServiceUnavailableException('Database is unavailable');
    }
  }

  async onApplicationShutdown(): Promise<void> {
    await this.pool.end();
  }
}
