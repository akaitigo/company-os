import { Controller, Get, SetMetadata } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/health/live')
  @SetMetadata('public', true)
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
