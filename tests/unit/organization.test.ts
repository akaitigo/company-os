import { describe, expect, it } from 'vitest';
import { entityId, tenantId } from '../../packages/kernel/src/index.js';
import { OrganizationUnit } from '../../modules/organization/src/index.js';

const tenant = tenantId('11111111-1111-4111-8111-111111111111');
const id = entityId('22222222-2222-4222-8222-222222222222');

describe('OrganizationUnit', () => {
  it('creates an effective-dated aggregate at version one', () => {
    const unit = OrganizationUnit.create({
      id,
      tenantId: tenant,
      code: 'FIN',
      name: ' Finance ',
      period: { from: '2026-04-01', to: '2027-04-01' },
    });
    expect(unit.snapshot()).toMatchObject({ code: 'FIN', name: 'Finance', version: 1 });
    expect(unit.createdEvent('event-1', '2026-04-01T00:00:00Z').aggregateVersion).toBe(1);
  });

  it('rejects invalid periods, unsafe codes, and self-parenting', () => {
    expect(() =>
      OrganizationUnit.create({
        id,
        tenantId: tenant,
        code: 'FIN',
        name: 'Finance',
        period: { from: '2027-01-01', to: '2026-01-01' },
      }),
    ).toThrowError(/follow/);
    expect(() =>
      OrganizationUnit.create({
        id,
        tenantId: tenant,
        code: 'fin!',
        name: 'Finance',
        period: { from: '2026-01-01' },
      }),
    ).toThrowError(/uppercase/);
    expect(() =>
      OrganizationUnit.create({
        id,
        tenantId: tenant,
        code: 'FIN',
        name: 'Finance',
        period: { from: '2026-01-01' },
        parentId: id,
      }),
    ).toThrowError(/own parent/);
    expect(() =>
      OrganizationUnit.create({
        id,
        tenantId: tenant,
        code: 'FIN',
        name: ' ',
        period: { from: '2026-01-01' },
      }),
    ).toThrowError(/name is required/);
  });
});
