import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  Inject,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { createOrganizationUnitSchema, requestContextSchema } from '@company-os/contracts';
import { AccessDeniedError, OrganizationService } from './organization.service.js';

@Controller('/v1/organization-units')
export class OrganizationController {
  constructor(@Inject(OrganizationService) private readonly service: OrganizationService) {}

  @Post()
  async create(
    @Body() body: unknown,
    @Headers('x-request-id') requestId: string | undefined,
    @Headers('x-tenant-id') tenantId: string | undefined,
    @Headers('x-actor-id') actorId: string | undefined,
    @Headers('x-roles') roles: string | undefined,
  ): Promise<{ id: string; version: number }> {
    const input = createOrganizationUnitSchema.safeParse(body);
    const context = requestContextSchema.safeParse({
      requestId,
      tenantId,
      actorId,
      roles: roles?.split(',') ?? [],
    });
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
