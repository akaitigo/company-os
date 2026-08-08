import { DomainError, type EntityId, type TenantId } from '@company-os/kernel';

export interface AuditIntent {
  readonly id: string;
  readonly occurredAt: string;
  readonly tenantId: TenantId;
  readonly actorId: EntityId;
  readonly action: string;
  readonly resourceType: string;
  readonly resourceId: EntityId;
  readonly decision: 'allow' | 'deny';
  readonly requestId: string;
  readonly metadata: Readonly<Record<string, string | number | boolean | null>>;
}

const forbiddenKey =
  /(?:password|secret|token|credential|private.?key|bank.?account|national.?id)/i;
const c4Marker = /(?:data:classification:c4|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----)/i;

export function createAuditIntent(intent: AuditIntent): AuditIntent {
  for (const [key, value] of Object.entries(intent.metadata)) {
    if (forbiddenKey.test(key) || (typeof value === 'string' && c4Marker.test(value))) {
      throw new DomainError(
        'AUDIT_SENSITIVE_DATA',
        'Sensitive C4 data cannot be copied to audit metadata',
      );
    }
  }
  return Object.freeze({ ...intent, metadata: Object.freeze({ ...intent.metadata }) });
}
