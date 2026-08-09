BEGIN;

CREATE TABLE workforce.employment_access (
  tenant_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  employment_id uuid NOT NULL,
  access_type varchar(16) NOT NULL CHECK (access_type IN ('employee','manager','hr')),
  granted_at timestamptz NOT NULL,
  granted_by uuid NOT NULL,
  revoked_at timestamptz,
  PRIMARY KEY (tenant_id,actor_id,employment_id,access_type),
  FOREIGN KEY (tenant_id,employment_id) REFERENCES workforce.employments(tenant_id,id),
  CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);

ALTER TABLE workforce.employment_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON workforce.employment_access
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT ON workforce.employment_access TO company_os_app;

COMMIT;
