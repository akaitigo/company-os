import { describe, expect, it } from 'vitest';
import { entityId, tenantId } from '../../packages/kernel/src/index.js';
import { ApprovalWorkflow } from '../../modules/workflow/src/index.js';
const requester = entityId('11111111-1111-4111-8111-111111111111');
const approverA = entityId('22222222-2222-4222-8222-222222222222');
const approverB = entityId('33333333-3333-4333-8333-333333333333');
describe('approval workflow', () => {
  it('requires role, SoD and threshold before approval', () => {
    const flow = new ApprovalWorkflow(
      entityId('44444444-4444-4444-8444-444444444444'),
      tenantId('55555555-5555-4555-8555-555555555555'),
      requester,
      1,
      { role: 'payment-approver', minimumApprovals: 2 },
    );
    expect(() => {
      flow.decide(requester, ['payment-approver'], 'approve', '2026-08-09T00:00:00Z');
    }).toThrowError(/own request/);
    flow.decide(approverA, ['payment-approver'], 'approve', '2026-08-09T00:00:00Z');
    expect(flow.snapshot().state).toBe('pending');
    flow.decide(approverB, ['payment-approver'], 'approve', '2026-08-09T00:01:00Z');
    expect(flow.snapshot().state).toBe('approved');
    expect(() => {
      flow.decide(approverA, ['payment-approver'], 'approve', '2026-08-09T00:02:00Z');
    }).toThrowError(/Terminal/);
  });
  it('rejects immediately and permits requester cancellation only while pending', () => {
    const flow = new ApprovalWorkflow(
      entityId('44444444-4444-4444-8444-444444444444'),
      tenantId('55555555-5555-4555-8555-555555555555'),
      requester,
      1,
      { role: 'controller', minimumApprovals: 1 },
    );
    expect(() => {
      flow.decide(approverA, ['reader'], 'reject', '2026-08-09T00:00:00Z');
    }).toThrowError(/role/);
    flow.cancel(requester);
    expect(flow.snapshot().state).toBe('cancelled');
  });
});
