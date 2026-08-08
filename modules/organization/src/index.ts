import {
  DomainError,
  assertEffectivePeriod,
  type DomainEvent,
  type EffectivePeriod,
  type EntityId,
  type TenantId,
} from '@company-os/kernel';

export interface OrganizationUnitProps {
  readonly id: EntityId;
  readonly tenantId: TenantId;
  readonly code: string;
  readonly name: string;
  readonly period: EffectivePeriod;
  readonly parentId?: EntityId;
  readonly version: number;
}

export class OrganizationUnit {
  private constructor(private readonly props: OrganizationUnitProps) {}

  static create(props: Omit<OrganizationUnitProps, 'version'>): OrganizationUnit {
    assertEffectivePeriod(props.period);
    if (!/^[A-Z0-9_-]{1,32}$/.test(props.code)) {
      throw new DomainError('INVALID_UNIT_CODE', 'Unit code must use uppercase safe characters');
    }
    if (props.name.trim().length === 0 || props.name.length > 200) {
      throw new DomainError(
        'INVALID_UNIT_NAME',
        'Unit name is required and limited to 200 characters',
      );
    }
    if (props.parentId === props.id)
      throw new DomainError('SELF_PARENT', 'Unit cannot be its own parent');
    return new OrganizationUnit({ ...props, name: props.name.trim(), version: 1 });
  }

  snapshot(): OrganizationUnitProps {
    return { ...this.props };
  }

  createdEvent(eventId: string, occurredAt: string): DomainEvent<{ code: string; name: string }> {
    return {
      id: eventId,
      type: 'organization.unit.created.v1',
      occurredAt,
      tenantId: this.props.tenantId,
      aggregateId: this.props.id,
      aggregateVersion: this.props.version,
      payload: { code: this.props.code, name: this.props.name },
    };
  }
}

export interface OrganizationUnitRepository {
  codeOverlaps(tenantId: TenantId, code: string, period: EffectivePeriod): Promise<boolean>;
  save(unit: OrganizationUnit, expectedVersion: number): Promise<void>;
  findEffective(tenantId: TenantId, at: string): Promise<readonly OrganizationUnitProps[]>;
}
