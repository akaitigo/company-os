import { DomainError, type DomainEvent } from '@company-os/kernel';

export interface OutboxEnvelope {
  readonly id: string;
  readonly idempotencyKey: string;
  readonly event: DomainEvent;
  readonly createdAt: string;
}

export function createOutboxEnvelope(event: DomainEvent, createdAt: string): OutboxEnvelope {
  if (event.aggregateVersion < 1)
    throw new DomainError('INVALID_EVENT_VERSION', 'Version must be positive');
  return Object.freeze({
    id: event.id,
    idempotencyKey: `${event.tenantId}:${event.aggregateId}:${event.aggregateVersion.toString()}:${event.type}`,
    event,
    createdAt,
  });
}

export class IdempotencyLedger {
  private readonly processed = new Set<string>();

  process(key: string, handler: () => void): boolean {
    if (this.processed.has(key)) return false;
    handler();
    this.processed.add(key);
    return true;
  }
}
