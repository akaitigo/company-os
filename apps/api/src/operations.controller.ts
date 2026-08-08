import {
  Body,
  Controller,
  ForbiddenException,
  Inject,
  Post,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  createRequisitionSchema,
  postJournalSchema,
  recordAttendanceSchema,
  requestContextSchema,
} from '@company-os/contracts';
import type { AuthenticatedRequest } from './auth.guard.js';
import { AccessDeniedError } from './organization.service.js';
import { OperationsService } from './operations.service.js';

@Controller('/v1')
export class OperationsController {
  constructor(@Inject(OperationsService) private readonly service: OperationsService) {}

  @Post('/workforce/attendance')
  recordAttendance(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.execute(recordAttendanceSchema.safeParse(body), request, (input, context) =>
      this.service.recordAttendance(input, context),
    );
  }

  @Post('/procurement/requisitions')
  createRequisition(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.execute(createRequisitionSchema.safeParse(body), request, (input, context) =>
      this.service.createRequisition(input, context),
    );
  }

  @Post('/finance/journals')
  postJournal(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.execute(postJournalSchema.safeParse(body), request, (input, context) =>
      this.service.postJournal(input, context),
    );
  }

  private async execute<T>(
    input: { success: boolean; data?: T },
    request: AuthenticatedRequest,
    command: (
      value: T,
      context: NonNullable<AuthenticatedRequest['companyOsContext']>,
    ) => Promise<unknown>,
  ): Promise<unknown> {
    const context = requestContextSchema.safeParse(request.companyOsContext);
    if (!input.success || input.data === undefined || !context.success)
      throw new UnprocessableEntityException('Invalid bounded request');
    try {
      return await command(input.data, context.data);
    } catch (error) {
      if (error instanceof AccessDeniedError) throw new ForbiddenException();
      throw error;
    }
  }
}
