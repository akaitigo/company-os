import { Module } from '@nestjs/common';
import { HealthController } from './health.controller.js';
import { OrganizationController } from './organization.controller.js';
import { OrganizationService } from './organization.service.js';

// Nest requires a class token even when module metadata contains all configuration.
/* eslint-disable @typescript-eslint/no-extraneous-class */
@Module({
  controllers: [HealthController, OrganizationController],
  providers: [OrganizationService],
})
export class AppModule {}
/* eslint-enable @typescript-eslint/no-extraneous-class */
