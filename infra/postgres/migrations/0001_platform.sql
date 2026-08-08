BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS organization;
CREATE SCHEMA IF NOT EXISTS audit;
CREATE SCHEMA IF NOT EXISTS integration;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'company_os_app') THEN
    CREATE ROLE company_os_app NOLOGIN;
  END IF;
END;
$$;

CREATE TABLE organization.units (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  code varchar(32) NOT NULL CHECK (code ~ '^[A-Z0-9_-]+$'),
  name varchar(200) NOT NULL CHECK (length(trim(name)) > 0),
  parent_id uuid,
  effective_from date NOT NULL,
  effective_to date,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, id),
  FOREIGN KEY (tenant_id, parent_id) REFERENCES organization.units (tenant_id, id),
  CHECK (parent_id IS NULL OR parent_id <> id),
  CHECK (effective_to IS NULL OR effective_from < effective_to)
);

CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE organization.units ADD CONSTRAINT units_code_effective_no_overlap
  EXCLUDE USING gist (
    tenant_id WITH =,
    code WITH =,
    daterange(effective_from, effective_to, '[)') WITH &&
  );

CREATE TABLE audit.intents (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  actor_id uuid NOT NULL,
  action varchar(120) NOT NULL,
  resource_type varchar(120) NOT NULL,
  resource_id uuid NOT NULL,
  decision varchar(16) NOT NULL CHECK (decision IN ('allow', 'deny')),
  request_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}',
  PRIMARY KEY (tenant_id, id),
  CHECK (octet_length(metadata::text) <= 16384)
);

CREATE TABLE integration.outbox (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  idempotency_key varchar(512) NOT NULL,
  event_type varchar(160) NOT NULL,
  aggregate_id uuid NOT NULL,
  aggregate_version integer NOT NULL CHECK (aggregate_version > 0),
  payload jsonb NOT NULL,
  occurred_at timestamptz NOT NULL,
  available_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  claimed_until timestamptz,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 20),
  processed_at timestamptz,
  last_error varchar(1000),
  PRIMARY KEY (tenant_id, id),
  UNIQUE (tenant_id, idempotency_key),
  CHECK (octet_length(payload::text) <= 65536)
);

CREATE INDEX outbox_pending_idx ON integration.outbox (available_at)
  WHERE processed_at IS NULL;

ALTER TABLE organization.units ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit.intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration.outbox ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_units ON organization.units
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY tenant_audit ON audit.intents
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
CREATE POLICY tenant_outbox ON integration.outbox
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);

GRANT USAGE ON SCHEMA organization, audit, integration TO company_os_app;
GRANT SELECT, INSERT, UPDATE ON organization.units TO company_os_app;
GRANT SELECT, INSERT ON audit.intents TO company_os_app;
GRANT SELECT, INSERT, UPDATE ON integration.outbox TO company_os_app;

CREATE FUNCTION audit.reject_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit records are append-only';
END;
$$;

CREATE TRIGGER audit_intents_append_only
  BEFORE UPDATE OR DELETE ON audit.intents
  FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();

COMMIT;
