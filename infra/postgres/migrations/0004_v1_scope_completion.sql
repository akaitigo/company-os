BEGIN;

CREATE TABLE workforce.attendance_entries (
  tenant_id uuid NOT NULL, id uuid NOT NULL, employment_id uuid NOT NULL,
  work_date date NOT NULL, started_at timestamptz NOT NULL, ended_at timestamptz NOT NULL,
  break_minutes integer NOT NULL DEFAULT 0 CHECK (break_minutes BETWEEN 0 AND 1440),
  source varchar(16) NOT NULL CHECK (source IN ('manual','import','clock')),
  status varchar(16) NOT NULL CHECK (status IN ('submitted','approved','rejected','corrected')),
  recorded_by uuid NOT NULL, corrected_entry_id uuid,
  PRIMARY KEY (tenant_id,id),
  FOREIGN KEY (tenant_id,employment_id) REFERENCES workforce.employments(tenant_id,id),
  FOREIGN KEY (tenant_id,corrected_entry_id) REFERENCES workforce.attendance_entries(tenant_id,id),
  CHECK (ended_at > started_at),
  CHECK (extract(epoch FROM (ended_at-started_at))/60 > break_minutes)
);

CREATE TABLE workforce.leave_requests (
  tenant_id uuid NOT NULL, id uuid NOT NULL, employment_id uuid NOT NULL,
  leave_type varchar(32) NOT NULL, starts_on date NOT NULL, ends_on date NOT NULL,
  requested_minutes integer NOT NULL CHECK (requested_minutes > 0),
  status varchar(16) NOT NULL CHECK (status IN ('pending','approved','rejected','cancelled')),
  requested_by uuid NOT NULL, decided_by uuid, decided_at timestamptz,
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  PRIMARY KEY (tenant_id,id),
  FOREIGN KEY (tenant_id,employment_id) REFERENCES workforce.employments(tenant_id,id),
  CHECK (ends_on >= starts_on),
  CHECK ((decided_by IS NULL) = (decided_at IS NULL))
);

CREATE TABLE procurement.requisitions (
  tenant_id uuid NOT NULL, id uuid NOT NULL, requester_id uuid NOT NULL,
  organization_unit_id uuid NOT NULL, currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  purpose varchar(1000) NOT NULL CHECK (length(trim(purpose)) > 0),
  status varchar(16) NOT NULL CHECK (status IN ('draft','submitted','approved','rejected','converted','cancelled')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  PRIMARY KEY (tenant_id,id),
  FOREIGN KEY (tenant_id,organization_unit_id) REFERENCES organization.units(tenant_id,id)
);

CREATE TABLE procurement.requisition_lines (
  tenant_id uuid NOT NULL, requisition_id uuid NOT NULL, id uuid NOT NULL,
  description varchar(500) NOT NULL CHECK (length(trim(description)) > 0),
  quantity numeric(20,6) NOT NULL CHECK (quantity > 0),
  estimated_unit_price numeric(20,4) NOT NULL CHECK (estimated_unit_price >= 0),
  PRIMARY KEY (tenant_id,requisition_id,id),
  FOREIGN KEY (tenant_id,requisition_id) REFERENCES procurement.requisitions(tenant_id,id)
);

CREATE TABLE procurement.receipt_lines (
  tenant_id uuid NOT NULL, receipt_id uuid NOT NULL, id uuid NOT NULL,
  purchase_order_id uuid NOT NULL, purchase_order_line_id uuid NOT NULL,
  quantity numeric(20,6) NOT NULL CHECK (quantity > 0),
  PRIMARY KEY (tenant_id,receipt_id,id),
  FOREIGN KEY (tenant_id,receipt_id) REFERENCES procurement.receipts(tenant_id,id),
  FOREIGN KEY (tenant_id,purchase_order_id,purchase_order_line_id)
    REFERENCES procurement.purchase_order_lines(tenant_id,purchase_order_id,id)
);

CREATE TABLE procurement.expense_claims (
  tenant_id uuid NOT NULL, id uuid NOT NULL, claimant_id uuid NOT NULL,
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  total numeric(20,4) NOT NULL CHECK (total >= 0),
  status varchar(16) NOT NULL CHECK (status IN ('draft','submitted','approved','rejected','paid','cancelled')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  PRIMARY KEY (tenant_id,id)
);

CREATE TABLE procurement.expense_claim_lines (
  tenant_id uuid NOT NULL, expense_claim_id uuid NOT NULL, id uuid NOT NULL,
  incurred_on date NOT NULL, category varchar(80) NOT NULL,
  description varchar(500) NOT NULL CHECK (length(trim(description)) > 0),
  amount numeric(20,4) NOT NULL CHECK (amount > 0), document_id uuid,
  PRIMARY KEY (tenant_id,expense_claim_id,id),
  FOREIGN KEY (tenant_id,expense_claim_id) REFERENCES procurement.expense_claims(tenant_id,id),
  FOREIGN KEY (tenant_id,document_id) REFERENCES documents.records(tenant_id,id)
);

CREATE TABLE procurement.invoice_lines (
  tenant_id uuid NOT NULL, invoice_id uuid NOT NULL, id uuid NOT NULL,
  purchase_order_id uuid, purchase_order_line_id uuid,
  description varchar(500) NOT NULL CHECK (length(trim(description)) > 0),
  quantity numeric(20,6) NOT NULL CHECK (quantity > 0),
  unit_price numeric(20,4) NOT NULL CHECK (unit_price >= 0),
  match_status varchar(16) NOT NULL CHECK (match_status IN ('pending','matched','exception')),
  PRIMARY KEY (tenant_id,invoice_id,id),
  FOREIGN KEY (tenant_id,invoice_id) REFERENCES procurement.invoices(tenant_id,id),
  FOREIGN KEY (tenant_id,purchase_order_id,purchase_order_line_id)
    REFERENCES procurement.purchase_order_lines(tenant_id,purchase_order_id,id),
  CHECK ((purchase_order_id IS NULL) = (purchase_order_line_id IS NULL))
);

CREATE TABLE procurement.payment_events (
  tenant_id uuid NOT NULL, id uuid NOT NULL, payment_instruction_id uuid NOT NULL,
  event_type varchar(16) NOT NULL CHECK (event_type IN ('submitted','accepted','rejected','settled','returned')),
  provider_reference varchar(200), idempotency_key varchar(200) NOT NULL,
  occurred_at timestamptz NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb
    CHECK (octet_length(payload::text) <= 65536),
  PRIMARY KEY (tenant_id,id), UNIQUE (tenant_id,idempotency_key),
  FOREIGN KEY (tenant_id,payment_instruction_id) REFERENCES procurement.payment_instructions(tenant_id,id)
);

CREATE TABLE finance.receipts (
  tenant_id uuid NOT NULL, id uuid NOT NULL, customer_party_id uuid NOT NULL,
  received_on date NOT NULL, currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  amount numeric(20,4) NOT NULL CHECK (amount > 0), external_reference varchar(200) NOT NULL,
  PRIMARY KEY (tenant_id,id), UNIQUE (tenant_id,external_reference),
  FOREIGN KEY (tenant_id,customer_party_id) REFERENCES party.parties(tenant_id,id)
);

CREATE TABLE finance.receipt_applications (
  tenant_id uuid NOT NULL, receipt_id uuid NOT NULL, receivable_id uuid NOT NULL,
  amount numeric(20,4) NOT NULL CHECK (amount > 0), applied_at timestamptz NOT NULL, applied_by uuid NOT NULL,
  PRIMARY KEY (tenant_id,receipt_id,receivable_id),
  FOREIGN KEY (tenant_id,receipt_id) REFERENCES finance.receipts(tenant_id,id),
  FOREIGN KEY (tenant_id,receivable_id) REFERENCES finance.receivables(tenant_id,id)
);

CREATE TABLE finance.cost_allocations (
  tenant_id uuid NOT NULL, id uuid NOT NULL, journal_id uuid NOT NULL,
  source_cost_center_id uuid NOT NULL, target_cost_center_id uuid NOT NULL,
  amount numeric(20,4) NOT NULL CHECK (amount > 0), currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'),
  rule_id varchar(80) NOT NULL, rule_version integer NOT NULL CHECK (rule_version > 0),
  allocated_at timestamptz NOT NULL, allocated_by uuid NOT NULL,
  PRIMARY KEY (tenant_id,id),
  FOREIGN KEY (tenant_id,journal_id) REFERENCES finance.posted_journals(tenant_id,id),
  FOREIGN KEY (tenant_id,rule_id,rule_version)
    REFERENCES compliance.published_rule_versions(tenant_id,rule_id,version),
  CHECK (source_cost_center_id <> target_cost_center_id)
);

DO $$
DECLARE item text;
BEGIN
  FOREACH item IN ARRAY ARRAY[
    'workforce.attendance_entries','workforce.leave_requests','procurement.requisitions',
    'procurement.requisition_lines','procurement.receipt_lines','procurement.expense_claims',
    'procurement.expense_claim_lines','procurement.invoice_lines','procurement.payment_events',
    'finance.receipts','finance.receipt_applications','finance.cost_allocations'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', item);
    EXECUTE format('CREATE POLICY tenant_isolation ON %s USING (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)', item);
  END LOOP;
END;
$$;

GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA workforce,procurement,finance TO company_os_app;
CREATE TRIGGER attendance_append_only BEFORE UPDATE OR DELETE ON workforce.attendance_entries FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TRIGGER payment_events_append_only BEFORE UPDATE OR DELETE ON procurement.payment_events FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TRIGGER receipts_append_only BEFORE UPDATE OR DELETE ON finance.receipts FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TRIGGER receipt_applications_append_only BEFORE UPDATE OR DELETE ON finance.receipt_applications FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TRIGGER cost_allocations_append_only BEFORE UPDATE OR DELETE ON finance.cost_allocations FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();

COMMIT;
