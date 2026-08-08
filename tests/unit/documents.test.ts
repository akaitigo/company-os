import { describe, expect, it } from 'vitest';
import { entityId, tenantId } from '../../packages/kernel/src/index.js';
import { DocumentRecord, RetentionDisposition } from '../../modules/documents/src/index.js';
const resource = entityId('11111111-1111-4111-8111-111111111111');
describe('documents and retention', () => {
  it('creates immutable document versions with content hash', () => {
    const document = new DocumentRecord(
      resource,
      tenantId('22222222-2222-4222-8222-222222222222'),
      'C4',
      'RET-LABOR-001',
    );
    const first = document.addVersion({
      objectKey: 'tenant/document/v1',
      sha256: 'a'.repeat(64),
      createdAt: '2026-08-09T00:00:00Z',
      createdBy: resource,
    });
    expect(first.version).toBe(1);
    expect(Object.isFrozen(first)).toBe(true);
    expect(() =>
      document.addVersion({
        objectKey: '/absolute',
        sha256: 'bad',
        createdAt: '2026-08-09T00:00:00Z',
        createdBy: resource,
      }),
    ).toThrowError(/SHA-256/);
  });
  it('blocks disposition during legal hold and requires approval', () => {
    const disposition = new RetentionDisposition(resource, '2026-08-01');
    disposition.evaluate('2026-08-09');
    disposition.placeLegalHold();
    expect(() => {
      disposition.approve();
    }).toThrowError(/held/);
    disposition.releaseLegalHold();
    disposition.approve();
    disposition.destroy();
    expect(disposition.snapshot().state).toBe('destroyed');
  });
});
