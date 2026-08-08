import { DomainError, type EntityId, type TenantId } from '@company-os/kernel';
export type WorkflowState = 'pending' | 'approved' | 'rejected' | 'cancelled';
export interface ApprovalStep {
  readonly role: string;
  readonly minimumApprovals: number;
}
export interface WorkflowDecision {
  readonly actorId: EntityId;
  readonly decision: 'approve' | 'reject';
  readonly decidedAt: string;
}
export class ApprovalWorkflow {
  private state: WorkflowState = 'pending';
  private readonly decisions = new Map<EntityId, WorkflowDecision>();
  constructor(
    readonly id: EntityId,
    readonly tenantId: TenantId,
    readonly requesterId: EntityId,
    readonly definitionVersion: number,
    private readonly step: ApprovalStep,
  ) {
    if (!Number.isInteger(definitionVersion) || definitionVersion < 1)
      throw new DomainError(
        'INVALID_WORKFLOW_VERSION',
        'Workflow definition version must be positive',
      );
    if (
      !Number.isInteger(step.minimumApprovals) ||
      step.minimumApprovals < 1 ||
      step.minimumApprovals > 10
    )
      throw new DomainError(
        'INVALID_APPROVAL_THRESHOLD',
        'Approval threshold must be between one and ten',
      );
  }
  decide(
    actorId: EntityId,
    actorRoles: readonly string[],
    decision: 'approve' | 'reject',
    decidedAt: string,
  ): void {
    if (this.state !== 'pending')
      throw new DomainError('WORKFLOW_TERMINAL', 'Terminal workflow cannot accept decisions');
    if (actorId === this.requesterId)
      throw new DomainError('WORKFLOW_SOD_VIOLATION', 'Requester cannot approve own request');
    if (!actorRoles.includes(this.step.role))
      throw new DomainError('WORKFLOW_ROLE_REQUIRED', 'Actor lacks approval role');
    if (this.decisions.has(actorId))
      throw new DomainError('DUPLICATE_DECISION', 'Actor already decided');
    if (!Number.isFinite(Date.parse(decidedAt)))
      throw new DomainError('INVALID_DECISION_TIME', 'Decision time is invalid');
    this.decisions.set(actorId, { actorId, decision, decidedAt });
    if (decision === 'reject') this.state = 'rejected';
    else if (
      [...this.decisions.values()].filter((item) => item.decision === 'approve').length >=
      this.step.minimumApprovals
    )
      this.state = 'approved';
  }
  cancel(actorId: EntityId): void {
    if (actorId !== this.requesterId || this.state !== 'pending')
      throw new DomainError('CANCEL_DENIED', 'Only requester can cancel a pending workflow');
    this.state = 'cancelled';
  }
  snapshot(): { state: WorkflowState; decisions: readonly WorkflowDecision[] } {
    return { state: this.state, decisions: [...this.decisions.values()] };
  }
}
