import {
  Body,
  Controller,
  ForbiddenException,
  Inject,
  Post,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createOrganizationUnitSchema, requestContextSchema } from '@company-os/contracts';
import type { AuthenticatedRequest } from './auth.guard.js';
import { AccessDeniedError, OrganizationService } from './organization.service.js';

@Controller('/v1/organization-units')
export class OrganizationController {
  constructor(@Inject(OrganizationService) private readonly service: OrganizationService) {}

  @Post()
  async create(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ): Promise<{ id: string; version: number }> {
    const input = createOrganizationUnitSchema.safeParse(body);
    const context = requestContextSchema.safeParse(request.companyOsContext);
    if (!input.success || !context.success)
      throw new UnprocessableEntityException('Invalid bounded request');
    try {
      return await this.service.create(input.data, context.data);
    } catch (error) {
      if (error instanceof AccessDeniedError) throw new ForbiddenException();
      throw error;
    }
  }
}
