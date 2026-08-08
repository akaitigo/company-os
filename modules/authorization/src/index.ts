import type { EntityId, TenantId } from '@company-os/kernel';

export type AuthorizationDecision = 'allow' | 'deny' | 'undetermined';

export interface Principal {
  readonly actorId: EntityId;
  readonly tenantId: TenantId;
  readonly roles: readonly string[];
}

export interface AuthorizationRequest {
  readonly principal: Principal;
  readonly action: string;
  readonly resourceTenantId: TenantId;
  readonly resourceOwnerId?: EntityId;
  readonly requestedRoles?: readonly string[];
}

const roleActions: Readonly<Record<string, readonly string[]>> = {
  'organization-admin': ['organization.unit.create', 'organization.unit.read'],
  'organization-reader': ['organization.unit.read'],
};

export function authorize(request: AuthorizationRequest): AuthorizationDecision {
  if (request.principal.tenantId !== request.resourceTenantId) return 'deny';
  if (
    request.action === 'authorization.role.assign' &&
    request.resourceOwnerId === request.principal.actorId &&
    request.requestedRoles?.some((role) => !request.principal.roles.includes(role)) === true
  ) {
    return 'deny';
  }

  const knownAction = Object.values(roleActions).some((actions) =>
    actions.includes(request.action),
  );
  if (!knownAction) return 'undetermined';
  return request.principal.roles.some(
    (role) => roleActions[role]?.includes(request.action) === true,
  )
    ? 'allow'
    : 'deny';
}
