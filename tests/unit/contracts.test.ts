import { describe, expect, it } from 'vitest';
import {
  createOrganizationUnitSchema,
  requestContextSchema,
} from '../../packages/contracts/src/index.js';

describe('boundary contracts', () => {
  it('accepts a bounded organization command and strips nothing implicitly', () => {
    const input = {
      id: '22222222-2222-4222-8222-222222222222',
      tenantId: '11111111-1111-4111-8111-111111111111',
      code: 'FIN',
      name: 'Finance',
      effectiveFrom: '2026-04-01',
    };
    expect(createOrganizationUnitSchema.parse(input)).toEqual(input);
    expect(() => createOrganizationUnitSchema.parse({ ...input, unexpected: true })).toThrow();
  });

  it('bounds principal roles', () => {
    expect(() =>
      requestContextSchema.parse({
        requestId: '44444444-4444-4444-8444-444444444444',
        tenantId: '11111111-1111-4111-8111-111111111111',
        actorId: '33333333-3333-4333-8333-333333333333',
        roles: Array.from({ length: 33 }, () => 'reader'),
      }),
    ).toThrow();
  });
});
