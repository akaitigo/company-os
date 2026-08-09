import { describe, expect, it } from 'vitest';
import { entityId, tenantId } from '../../packages/kernel/src/index.js';
import { authorize } from '../../modules/authorization/src/index.js';

const tenantA = tenantId('11111111-1111-4111-8111-111111111111');
const tenantB = tenantId('22222222-2222-4222-8222-222222222222');
const actor = entityId('33333333-3333-4333-8333-333333333333');

describe('authorization', () => {
  it('allows only known role actions in the same tenant', () => {
    const principal = { actorId: actor, tenantId: tenantA, roles: ['organization-admin'] };
    expect(
      authorize({ principal, action: 'organization.unit.create', resourceTenantId: tenantA }),
    ).toBe('allow');
    expect(
      authorize({ principal, action: 'organization.unit.create', resourceTenantId: tenantB }),
    ).toBe('deny');
    expect(authorize({ principal, action: 'unknown.action', resourceTenantId: tenantA })).toBe(
      'undetermined',
    );
  });

  it('denies self-escalation', () => {
    const principal = { actorId: actor, tenantId: tenantA, roles: ['organization-reader'] };
    expect(
      authorize({
        principal,
        action: 'authorization.role.assign',
        resourceTenantId: tenantA,
        resourceOwnerId: actor,
        requestedRoles: ['organization-admin'],
      }),
    ).toBe('deny');
  });

  it('separates workforce, procurement, and finance duties', () => {
    const workforce = { actorId: actor, tenantId: tenantA, roles: ['workforce-manager'] };
    expect(
      authorize({
        principal: workforce,
        action: 'workforce.attendance.record',
        resourceTenantId: tenantA,
      }),
    ).toBe('allow');
    expect(
      authorize({
        principal: workforce,
        action: 'workforce.leave.request',
        resourceTenantId: tenantA,
      }),
    ).toBe('allow');
    expect(
      authorize({
        principal: workforce,
        action: 'finance.journal.post',
        resourceTenantId: tenantA,
      }),
    ).toBe('deny');
  });

  it('lets employees record and read attendance without management powers', () => {
    const employee = { actorId: actor, tenantId: tenantA, roles: ['workforce-employee'] };
    expect(
      authorize({
        principal: employee,
        action: 'workforce.attendance.record',
        resourceTenantId: tenantA,
      }),
    ).toBe('allow');
    expect(
      authorize({
        principal: employee,
        action: 'workforce.attendance.read',
        resourceTenantId: tenantA,
      }),
    ).toBe('allow');
    expect(
      authorize({
        principal: employee,
        action: 'workforce.leave.request',
        resourceTenantId: tenantA,
      }),
    ).toBe('deny');
    expect(
      authorize({
        principal: employee,
        action: 'workforce.attendance.review',
        resourceTenantId: tenantA,
      }),
    ).toBe('deny');
  });

  it('limits period management to workforce HR', () => {
    const manager = { actorId: actor, tenantId: tenantA, roles: ['workforce-manager'] };
    const hr = { actorId: actor, tenantId: tenantA, roles: ['workforce-hr'] };
    expect(
      authorize({
        principal: manager,
        action: 'workforce.attendance.review',
        resourceTenantId: tenantA,
      }),
    ).toBe('allow');
    expect(
      authorize({
        principal: manager,
        action: 'workforce.attendance.period.manage',
        resourceTenantId: tenantA,
      }),
    ).toBe('deny');
    expect(
      authorize({
        principal: hr,
        action: 'workforce.attendance.period.manage',
        resourceTenantId: tenantA,
      }),
    ).toBe('allow');
    expect(
      authorize({
        principal: manager,
        action: 'workforce.work-rule.manage',
        resourceTenantId: tenantA,
      }),
    ).toBe('deny');
    expect(
      authorize({
        principal: hr,
        action: 'workforce.work-rule.manage',
        resourceTenantId: tenantA,
      }),
    ).toBe('allow');
  });
});
