import {
  Body,
  Controller,
  ConflictException,
  ForbiddenException,
  Get,
  Inject,
  Post,
  Query,
  Req,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  allocateCostSchema,
  activateWorkingTimeEnforcementSchema,
  assignWorkRuleSchema,
  applyReceiptSchema,
  createRequisitionSchema,
  createWorkRuleSchema,
  decideAttendanceSchema,
  listAttendancePeriodsQuerySchema,
  listAttendanceQuerySchema,
  listWorkRulesQuerySchema,
  postJournalSchema,
  recordAttendanceSchema,
  requestLeaveSchema,
  requestContextSchema,
  setEmploymentCalendarDaySchema,
  transitionAttendancePeriodSchema,
} from '@company-os/contracts';
import { DomainError } from '@company-os/kernel';
import type { AuthenticatedRequest } from './auth.guard.js';
import { AccessDeniedError } from './organization.service.js';
import {
  AttendanceConflictError,
  OperationConflictError,
  OperationsService,
} from './operations.service.js';

@Controller('/v1')
export class OperationsController {
  constructor(@Inject(OperationsService) private readonly service: OperationsService) {}

  @Post('/workforce/attendance')
  recordAttendance(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.execute(recordAttendanceSchema.safeParse(body), request, (input, context) =>
      this.service.recordAttendance(input, context),
    );
  }

  @Get('/workforce/attendance')
  listAttendance(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    return this.execute(listAttendanceQuerySchema.safeParse(query), request, (input, context) =>
      this.service.listAttendance(input, context),
    );
  }

  @Post('/workforce/attendance-decisions')
  decideAttendance(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.execute(decideAttendanceSchema.safeParse(body), request, (input, context) =>
      this.service.decideAttendance(input, context),
    );
  }

  @Post('/workforce/attendance-period-events')
  transitionAttendancePeriod(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.execute(
      transitionAttendancePeriodSchema.safeParse(body),
      request,
      (input, context) => this.service.transitionAttendancePeriod(input, context),
    );
  }

  @Get('/workforce/attendance-period-events')
  listAttendancePeriods(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    return this.execute(
      listAttendancePeriodsQuerySchema.safeParse(query),
      request,
      (input, context) => this.service.listAttendancePeriods(input, context),
    );
  }

  @Post('/workforce/work-rules')
  createWorkRule(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.execute(createWorkRuleSchema.safeParse(body), request, (input, context) =>
      this.service.createWorkRule(input, context),
    );
  }

  @Get('/workforce/work-rules')
  listWorkRules(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    return this.execute(listWorkRulesQuerySchema.safeParse(query), request, (input, context) =>
      this.service.listWorkRules(input, context),
    );
  }

  @Post('/workforce/work-rule-assignments')
  assignWorkRule(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.execute(assignWorkRuleSchema.safeParse(body), request, (input, context) =>
      this.service.assignWorkRule(input, context),
    );
  }

  @Post('/workforce/employment-calendar-days')
  setEmploymentCalendarDay(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.execute(setEmploymentCalendarDaySchema.safeParse(body), request, (input, context) =>
      this.service.setEmploymentCalendarDay(input, context),
    );
  }

  @Post('/workforce/working-time-enforcement')
  activateWorkingTimeEnforcement(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.execute(
      activateWorkingTimeEnforcementSchema.safeParse(body),
      request,
      (input, context) => this.service.activateWorkingTimeEnforcement(input, context),
    );
  }

  @Post('/workforce/leave-requests')
  requestLeave(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.execute(requestLeaveSchema.safeParse(body), request, (input, context) =>
      this.service.requestLeave(input, context),
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

  @Post('/finance/receipts')
  applyReceipt(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.execute(applyReceiptSchema.safeParse(body), request, (input, context) =>
      this.service.applyReceipt(input, context),
    );
  }

  @Post('/finance/cost-allocations')
  allocateCost(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return this.execute(allocateCostSchema.safeParse(body), request, (input, context) =>
      this.service.allocateCost(input, context),
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
      if (error instanceof AttendanceConflictError) throw new ConflictException(error.message);
      if (error instanceof OperationConflictError)
        throw new UnprocessableEntityException(error.message);
      if (error instanceof DomainError) throw new UnprocessableEntityException(error.message);
      throw error;
    }
  }
}
