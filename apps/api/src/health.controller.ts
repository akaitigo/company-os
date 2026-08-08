import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('/health/live')
  live(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
