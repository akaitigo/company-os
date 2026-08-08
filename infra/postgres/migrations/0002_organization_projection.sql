BEGIN;
CREATE SCHEMA IF NOT EXISTS projection;
CREATE TABLE projection.organization_unit_directory (
  tenant_id uuid NOT NULL,
  unit_id uuid NOT NULL,
  code varchar(32) NOT NULL,
  name varchar(200) NOT NULL,
  source_version integer NOT NULL CHECK (source_version > 0),
  projected_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id, unit_id)
);
ALTER TABLE projection.organization_unit_directory ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_unit_directory ON projection.organization_unit_directory
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT USAGE ON SCHEMA projection TO company_os_app;
GRANT SELECT, INSERT, UPDATE ON projection.organization_unit_directory TO company_os_app;
COMMIT;

