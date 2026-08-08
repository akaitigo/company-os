export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export type TenantId = string & { readonly __tenantId: unique symbol };
export type EntityId = string & { readonly __entityId: unique symbol };

const opaqueIdPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function tenantId(value: string): TenantId {
  if (!opaqueIdPattern.test(value))
    throw new DomainError('INVALID_TENANT_ID', 'Tenant ID must be UUID');
  return value as TenantId;
}

export function entityId(value: string): EntityId {
  if (!opaqueIdPattern.test(value))
    throw new DomainError('INVALID_ENTITY_ID', 'Entity ID must be UUID');
  return value as EntityId;
}

export class Money {
  private constructor(
    readonly minor: bigint,
    readonly currency: string,
  ) {}

  static ofMinor(minor: bigint, currency: string): Money {
    if (!/^[A-Z]{3}$/.test(currency))
      throw new DomainError('INVALID_CURRENCY', 'Currency must be ISO 4217');
    return new Money(minor, currency);
  }

  add(other: Money): Money {
    if (this.currency !== other.currency)
      throw new DomainError('CURRENCY_MISMATCH', 'Currencies must match');
    return Money.ofMinor(this.minor + other.minor, this.currency);
  }

  toDecimal(scale = 2): string {
    const negative = this.minor < 0n;
    const absolute = negative ? -this.minor : this.minor;
    const divisor = 10n ** BigInt(scale);
    const whole = absolute / divisor;
    if (scale === 0) return `${negative ? '-' : ''}${whole.toString()}`;
    const fraction = (absolute % divisor).toString().padStart(scale, '0');
    return `${negative ? '-' : ''}${whole.toString()}.${fraction}`;
  }
}

export interface EffectivePeriod {
  readonly from: string;
  readonly to?: string;
}

export function assertEffectivePeriod(period: EffectivePeriod): void {
  const from = Date.parse(period.from);
  const to = period.to === undefined ? undefined : Date.parse(period.to);
  if (!Number.isFinite(from) || (to !== undefined && !Number.isFinite(to))) {
    throw new DomainError('INVALID_EFFECTIVE_PERIOD', 'Effective dates must be ISO dates');
  }
  if (to !== undefined && from >= to) {
    throw new DomainError('INVALID_EFFECTIVE_PERIOD', 'Effective to must follow effective from');
  }
}

export interface DomainEvent<T extends Record<string, unknown> = Record<string, unknown>> {
  readonly id: string;
  readonly type: string;
  readonly occurredAt: string;
  readonly tenantId: TenantId;
  readonly aggregateId: EntityId;
  readonly aggregateVersion: number;
  readonly payload: T;
}
