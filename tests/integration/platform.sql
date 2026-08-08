\set ON_ERROR_STOP on

BEGIN;
SET LOCAL ROLE company_os_app;
SELECT set_config('app.tenant_id', '11111111-1111-4111-8111-111111111111', true);

INSERT INTO organization.units (
  tenant_id, id, code, name, effective_from
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  'FIN', 'Finance', '2026-04-01'
);

INSERT INTO audit.intents (
  tenant_id, id, occurred_at, actor_id, action, resource_type, resource_id, decision, request_id
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  '44444444-4444-4444-8444-444444444444', now(),
  '33333333-3333-4333-8333-333333333333',
  'organization.unit.create', 'organization_unit',
  '22222222-2222-4222-8222-222222222222', 'allow',
  '55555555-5555-4555-8555-555555555555'
);

INSERT INTO integration.outbox (
  tenant_id, id, idempotency_key, event_type, aggregate_id, aggregate_version, payload, occurred_at
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  '66666666-6666-4666-8666-666666666666',
  'tenant:unit:1:create', 'organization.unit.created.v1',
  '22222222-2222-4222-8222-222222222222', 1, '{}', now()
);

DO $$
BEGIN
  IF (SELECT count(*) FROM organization.units) <> 1 THEN
    RAISE EXCEPTION 'same-tenant row is not visible';
  END IF;
  PERFORM set_config('app.tenant_id', '77777777-7777-4777-8777-777777777777', true);
  IF (SELECT count(*) FROM organization.units) <> 0 THEN
    RAISE EXCEPTION 'cross-tenant row leaked through RLS';
  END IF;
END;
$$;
ROLLBACK;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM organization.units
    WHERE id = '22222222-2222-4222-8222-222222222222'
  ) THEN
    RAISE EXCEPTION 'transaction rollback left a partial aggregate';
  END IF;
  IF EXISTS (
    SELECT 1 FROM audit.intents
    WHERE id = '44444444-4444-4444-8444-444444444444'
  ) OR EXISTS (
    SELECT 1 FROM integration.outbox
    WHERE id = '66666666-6666-4666-8666-666666666666'
  ) THEN
    RAISE EXCEPTION 'transaction rollback left audit or outbox rows';
  END IF;
END;
$$;

