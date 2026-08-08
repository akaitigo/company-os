import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './auth.guard.js';
import { HealthController } from './health.controller.js';
import { OrganizationController } from './organization.controller.js';
import { OrganizationService } from './organization.service.js';

// Nest requires a class token even when module metadata contains all configuration.
/* eslint-disable @typescript-eslint/no-extraneous-class */
@Module({
  controllers: [HealthController, OrganizationController],
  providers: [OrganizationService, { provide: APP_GUARD, useClass: AuthGuard }],
})
export class AppModule {}
/* eslint-enable @typescript-eslint/no-extraneous-class */
