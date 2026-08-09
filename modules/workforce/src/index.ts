import {
  DomainError,
  assertEffectivePeriod,
  type EffectivePeriod,
  type EntityId,
  type TenantId,
} from '@company-os/kernel';
export type EmploymentStatus = 'draft' | 'active' | 'ended';
export class Employment {
  private status: EmploymentStatus = 'draft';
  constructor(
    readonly id: EntityId,
    readonly tenantId: TenantId,
    readonly workerId: EntityId,
    readonly period: EffectivePeriod,
    readonly weeklyMinutes: number,
  ) {
    assertEffectivePeriod(period);
    if (!Number.isInteger(weeklyMinutes) || weeklyMinutes < 0 || weeklyMinutes > 10_080)
      throw new DomainError(
        'INVALID_WEEKLY_MINUTES',
        'Weekly minutes must be an integer within one week',
      );
  }
  activate(): void {
    if (this.status !== 'draft')
      throw new DomainError('INVALID_EMPLOYMENT_TRANSITION', 'Only draft employment can activate');
    this.status = 'active';
  }
  end(on: string): void {
    if (this.status !== 'active')
      throw new DomainError('INVALID_EMPLOYMENT_TRANSITION', 'Only active employment can end');
    const end = Date.parse(on);
    if (!Number.isFinite(end) || end < Date.parse(this.period.from))
      throw new DomainError('INVALID_END_DATE', 'End date precedes employment');
    this.status = 'ended';
  }
  snapshot(): { status: EmploymentStatus } {
    return { status: this.status };
  }
}
export class LeaveBalance {
  private reservedMinutes = 0;
  private consumedMinutes = 0;
  constructor(readonly grantedMinutes: number) {
    if (!Number.isInteger(grantedMinutes) || grantedMinutes < 0)
      throw new DomainError('INVALID_LEAVE_GRANT', 'Leave grant must be non-negative minutes');
  }
  reserve(minutes: number): void {
    if (!Number.isInteger(minutes) || minutes <= 0)
      throw new DomainError('INVALID_LEAVE_MINUTES', 'Leave must be positive minutes');
    if (minutes > this.available())
      throw new DomainError('INSUFFICIENT_LEAVE', 'Leave balance cannot become negative');
    this.reservedMinutes += minutes;
  }
  approve(minutes: number): void {
    if (minutes > this.reservedMinutes)
      throw new DomainError('UNRESERVED_LEAVE', 'Cannot approve unreserved leave');
    this.reservedMinutes -= minutes;
    this.consumedMinutes += minutes;
  }
  cancel(minutes: number): void {
    if (minutes > this.reservedMinutes)
      throw new DomainError('UNRESERVED_LEAVE', 'Cannot cancel unreserved leave');
    this.reservedMinutes -= minutes;
  }
  available(): number {
    return this.grantedMinutes - this.reservedMinutes - this.consumedMinutes;
  }
}

export interface AttendanceBreak {
  readonly startedAt: string;
  readonly endedAt: string;
}
export interface AttendanceInput {
  readonly workDate: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly timeZone: 'Asia/Tokyo';
  readonly breaks: readonly AttendanceBreak[];
}
export class AttendanceEntry {
  readonly elapsedMinutes: number;
  readonly breakMinutes: number;
  readonly workedMinutes: number;
  constructor(readonly input: AttendanceInput) {
    const started = Date.parse(input.startedAt);
    const ended = Date.parse(input.endedAt);
    if (!Number.isFinite(started) || !Number.isFinite(ended) || ended <= started)
      throw new DomainError('INVALID_ATTENDANCE_BOUNDS', 'Attendance end must follow start');
    const elapsedMs = ended - started;
    if (elapsedMs % 60_000 !== 0 || elapsedMs > 48 * 60 * 60_000)
      throw new DomainError(
        'INVALID_ATTENDANCE_DURATION',
        'Attendance must use whole minutes and not exceed 48 hours',
      );
    if (input.breaks.length > 10)
      throw new DomainError('TOO_MANY_BREAKS', 'Attendance supports at most ten breaks');
    const sorted = input.breaks
      .map((item) => ({
        ...item,
        start: Date.parse(item.startedAt),
        end: Date.parse(item.endedAt),
      }))
      .sort((left, right) => left.start - right.start);
    let breakMs = 0;
    for (const [index, item] of sorted.entries()) {
      if (
        !Number.isFinite(item.start) ||
        !Number.isFinite(item.end) ||
        item.end <= item.start ||
        item.start < started ||
        item.end > ended ||
        (item.end - item.start) % 60_000 !== 0
      )
        throw new DomainError(
          'INVALID_ATTENDANCE_BREAK',
          'Break must use whole minutes within attendance bounds',
        );
      if (index > 0 && (sorted[index - 1]?.end ?? 0) > item.start)
        throw new DomainError('OVERLAPPING_ATTENDANCE_BREAK', 'Attendance breaks cannot overlap');
      breakMs += item.end - item.start;
    }
    if (breakMs >= elapsedMs)
      throw new DomainError('INVALID_ATTENDANCE_BREAK', 'Breaks must be shorter than attendance');
    const localDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: input.timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(started));
    if (localDate !== input.workDate)
      throw new DomainError('WORK_DATE_MISMATCH', 'Work date must match start in tenant timezone');
    this.elapsedMinutes = elapsedMs / 60_000;
    this.breakMinutes = breakMs / 60_000;
    this.workedMinutes = this.elapsedMinutes - this.breakMinutes;
  }
}
export type AttendanceDecision = 'approved' | 'rejected';
export class AttendanceReview {
  readonly reason: string;
  constructor(
    readonly decision: AttendanceDecision,
    reason: string,
  ) {
    this.reason = reason.trim();
    if (this.reason.length === 0 || this.reason.length > 500)
      throw new DomainError(
        'INVALID_ATTENDANCE_DECISION_REASON',
        'Attendance decision reason must contain 1 to 500 characters',
      );
  }
}
export type AttendancePeriodAction = 'close' | 'reopen';
export class AttendancePeriodTransition {
  readonly reason: string;
  constructor(
    readonly periodMonth: string,
    readonly action: AttendancePeriodAction,
    reason: string,
  ) {
    this.reason = reason.trim();
    if (!/^\d{4}-(0[1-9]|1[0-2])-01$/.test(periodMonth))
      throw new DomainError(
        'INVALID_ATTENDANCE_PERIOD_MONTH',
        'Attendance period month must be the first day of a calendar month',
      );
    if (this.reason.length === 0 || this.reason.length > 500)
      throw new DomainError(
        'INVALID_ATTENDANCE_PERIOD_REASON',
        'Attendance period reason must contain 1 to 500 characters',
      );
  }
}
export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export class LeaveRequest {
  private status: LeaveRequestStatus = 'pending';
  constructor(
    readonly id: EntityId,
    readonly requesterId: EntityId,
    readonly minutes: number,
    private readonly balance: LeaveBalance,
  ) {
    this.balance.reserve(minutes);
  }
  approve(decidedBy: EntityId): void {
    if (this.status !== 'pending')
      throw new DomainError('LEAVE_ALREADY_DECIDED', 'Only pending leave can be approved');
    if (decidedBy === this.requesterId)
      throw new DomainError('LEAVE_SOD_VIOLATION', 'Requester cannot approve their own leave');
    this.balance.approve(this.minutes);
    this.status = 'approved';
  }
  reject(): void {
    this.release('rejected');
  }
  cancel(): void {
    this.release('cancelled');
  }
  snapshot(): { status: LeaveRequestStatus } {
    return { status: this.status };
  }
  private release(status: 'rejected' | 'cancelled'): void {
    if (this.status !== 'pending')
      throw new DomainError('LEAVE_ALREADY_DECIDED', 'Only pending leave can be released');
    this.balance.cancel(this.minutes);
    this.status = status;
  }
}
