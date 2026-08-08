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
