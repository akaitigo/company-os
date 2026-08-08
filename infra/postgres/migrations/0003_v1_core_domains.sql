BEGIN;
CREATE SCHEMA IF NOT EXISTS party;
CREATE SCHEMA IF NOT EXISTS workforce;
CREATE SCHEMA IF NOT EXISTS procurement;
CREATE SCHEMA IF NOT EXISTS finance;
CREATE SCHEMA IF NOT EXISTS workflow;
CREATE SCHEMA IF NOT EXISTS compliance;
CREATE SCHEMA IF NOT EXISTS documents;

CREATE TABLE party.parties (
  tenant_id uuid NOT NULL, id uuid NOT NULL, party_type varchar(16) NOT NULL CHECK (party_type IN ('person','organization')),
  display_name varchar(200) NOT NULL CHECK (length(trim(display_name)) > 0), version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), PRIMARY KEY (tenant_id,id)
);
CREATE TABLE workforce.employments (
  tenant_id uuid NOT NULL, id uuid NOT NULL, worker_party_id uuid NOT NULL, organization_unit_id uuid NOT NULL,
  effective_from date NOT NULL, effective_to date, weekly_minutes integer NOT NULL CHECK (weekly_minutes BETWEEN 0 AND 10080),
  status varchar(16) NOT NULL CHECK (status IN ('draft','active','ended')), version integer NOT NULL DEFAULT 1 CHECK (version > 0),
  PRIMARY KEY (tenant_id,id), FOREIGN KEY (tenant_id,worker_party_id) REFERENCES party.parties(tenant_id,id),
  FOREIGN KEY (tenant_id,organization_unit_id) REFERENCES organization.units(tenant_id,id), CHECK (effective_to IS NULL OR effective_from < effective_to)
);
CREATE TABLE workforce.leave_ledger (
  tenant_id uuid NOT NULL, id uuid NOT NULL, employment_id uuid NOT NULL, occurred_at timestamptz NOT NULL,
  entry_type varchar(16) NOT NULL CHECK (entry_type IN ('grant','reserve','consume','release','adjust')),
  minutes integer NOT NULL CHECK (minutes <> 0), reference_id uuid NOT NULL, PRIMARY KEY (tenant_id,id),
  UNIQUE (tenant_id,reference_id,entry_type), FOREIGN KEY (tenant_id,employment_id) REFERENCES workforce.employments(tenant_id,id)
);
CREATE TABLE procurement.suppliers (
  tenant_id uuid NOT NULL, id uuid NOT NULL, party_id uuid NOT NULL, status varchar(16) NOT NULL CHECK (status IN ('draft','approved','suspended')),
  version integer NOT NULL DEFAULT 1, PRIMARY KEY (tenant_id,id), FOREIGN KEY (tenant_id,party_id) REFERENCES party.parties(tenant_id,id)
);
CREATE TABLE procurement.purchase_orders (
  tenant_id uuid NOT NULL, id uuid NOT NULL, supplier_id uuid NOT NULL, status varchar(16) NOT NULL CHECK (status IN ('draft','approved','issued','closed','cancelled')),
  currency char(3) NOT NULL CHECK (currency ~ '^[A-Z]{3}$'), total numeric(20,4) NOT NULL CHECK (total >= 0), version integer NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id,id), FOREIGN KEY (tenant_id,supplier_id) REFERENCES procurement.suppliers(tenant_id,id)
);
CREATE TABLE procurement.purchase_order_lines (
  tenant_id uuid NOT NULL, purchase_order_id uuid NOT NULL, id uuid NOT NULL, description varchar(500) NOT NULL,
  quantity numeric(20,6) NOT NULL CHECK (quantity > 0), unit_price numeric(20,4) NOT NULL CHECK (unit_price >= 0),
  PRIMARY KEY (tenant_id,purchase_order_id,id), FOREIGN KEY (tenant_id,purchase_order_id) REFERENCES procurement.purchase_orders(tenant_id,id)
);
CREATE TABLE procurement.receipts (
  tenant_id uuid NOT NULL, id uuid NOT NULL, purchase_order_id uuid NOT NULL, received_at timestamptz NOT NULL, received_by uuid NOT NULL,
  status varchar(16) NOT NULL CHECK (status IN ('received','reversed')), PRIMARY KEY (tenant_id,id),
  FOREIGN KEY (tenant_id,purchase_order_id) REFERENCES procurement.purchase_orders(tenant_id,id)
);
CREATE TABLE procurement.invoices (
  tenant_id uuid NOT NULL, id uuid NOT NULL, supplier_id uuid NOT NULL, invoice_number varchar(100) NOT NULL,
  currency char(3) NOT NULL, total numeric(20,4) NOT NULL CHECK (total > 0), match_status varchar(16) NOT NULL CHECK (match_status IN ('pending','matched','exception')),
  PRIMARY KEY (tenant_id,id), UNIQUE (tenant_id,supplier_id,invoice_number), FOREIGN KEY (tenant_id,supplier_id) REFERENCES procurement.suppliers(tenant_id,id)
);
CREATE TABLE procurement.payment_instructions (
  tenant_id uuid NOT NULL, id uuid NOT NULL, invoice_id uuid NOT NULL, amount numeric(20,4) NOT NULL CHECK (amount > 0), currency char(3) NOT NULL,
  prepared_by uuid NOT NULL, approved_by uuid, status varchar(16) NOT NULL CHECK (status IN ('prepared','approved','submitted','settled','rejected')),
  idempotency_key varchar(200) NOT NULL, PRIMARY KEY (tenant_id,id), UNIQUE (tenant_id,idempotency_key),
  FOREIGN KEY (tenant_id,invoice_id) REFERENCES procurement.invoices(tenant_id,id), CHECK (approved_by IS NULL OR prepared_by <> approved_by)
);
CREATE TABLE finance.accounts (
  tenant_id uuid NOT NULL, id uuid NOT NULL, code varchar(32) NOT NULL, name varchar(200) NOT NULL,
  account_type varchar(16) NOT NULL CHECK (account_type IN ('asset','liability','equity','revenue','expense')),
  active_from date NOT NULL, active_to date, PRIMARY KEY (tenant_id,id), UNIQUE (tenant_id,code), CHECK (active_to IS NULL OR active_from < active_to)
);
CREATE TABLE finance.posted_journals (
  tenant_id uuid NOT NULL, id uuid NOT NULL, accounting_date date NOT NULL, currency char(3) NOT NULL,
  source_type varchar(100) NOT NULL, source_id uuid NOT NULL, reversal_of uuid, posted_at timestamptz NOT NULL, posted_by uuid NOT NULL,
  PRIMARY KEY (tenant_id,id), UNIQUE (tenant_id,source_type,source_id), FOREIGN KEY (tenant_id,reversal_of) REFERENCES finance.posted_journals(tenant_id,id)
);
CREATE TABLE finance.posted_journal_lines (
  tenant_id uuid NOT NULL, journal_id uuid NOT NULL, line_number smallint NOT NULL CHECK (line_number > 0), account_id uuid NOT NULL,
  debit numeric(20,4) NOT NULL DEFAULT 0 CHECK (debit >= 0), credit numeric(20,4) NOT NULL DEFAULT 0 CHECK (credit >= 0),
  cost_center_id uuid, PRIMARY KEY (tenant_id,journal_id,line_number), FOREIGN KEY (tenant_id,journal_id) REFERENCES finance.posted_journals(tenant_id,id),
  FOREIGN KEY (tenant_id,account_id) REFERENCES finance.accounts(tenant_id,id), CHECK ((debit > 0 AND credit = 0) OR (credit > 0 AND debit = 0))
);
CREATE TABLE finance.receivables (
  tenant_id uuid NOT NULL, id uuid NOT NULL, customer_party_id uuid NOT NULL, document_number varchar(100) NOT NULL,
  issued_on date NOT NULL, due_on date NOT NULL, currency char(3) NOT NULL, original_amount numeric(20,4) NOT NULL CHECK (original_amount > 0),
  open_amount numeric(20,4) NOT NULL CHECK (open_amount >= 0), status varchar(16) NOT NULL CHECK (status IN ('open','partial','paid','written_off')),
  PRIMARY KEY (tenant_id,id), UNIQUE (tenant_id,document_number), FOREIGN KEY (tenant_id,customer_party_id) REFERENCES party.parties(tenant_id,id), CHECK (due_on >= issued_on)
);
CREATE TABLE workflow.instances (
  tenant_id uuid NOT NULL, id uuid NOT NULL, workflow_type varchar(100) NOT NULL, definition_version integer NOT NULL CHECK (definition_version > 0),
  requester_id uuid NOT NULL, resource_type varchar(100) NOT NULL, resource_id uuid NOT NULL,
  state varchar(16) NOT NULL CHECK (state IN ('pending','approved','rejected','cancelled')), version integer NOT NULL DEFAULT 1,
  PRIMARY KEY (tenant_id,id)
);
CREATE TABLE workflow.decisions (
  tenant_id uuid NOT NULL, id uuid NOT NULL, instance_id uuid NOT NULL, actor_id uuid NOT NULL,
  decision varchar(16) NOT NULL CHECK (decision IN ('approve','reject')), decided_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id,id), UNIQUE (tenant_id,instance_id,actor_id), FOREIGN KEY (tenant_id,instance_id) REFERENCES workflow.instances(tenant_id,id)
);
CREATE TABLE compliance.published_rule_versions (
  tenant_id uuid NOT NULL, rule_id varchar(80) NOT NULL, version integer NOT NULL CHECK (version > 0),
  effective_from date NOT NULL, effective_to date, definition jsonb NOT NULL CHECK (octet_length(definition::text) <= 65536),
  published_at timestamptz NOT NULL, published_by uuid NOT NULL, PRIMARY KEY (tenant_id,rule_id,version),
  CHECK (effective_to IS NULL OR effective_from < effective_to)
);
CREATE TABLE compliance.evaluations (
  tenant_id uuid NOT NULL, id uuid NOT NULL, rule_id varchar(80) NOT NULL, rule_version integer NOT NULL,
  resource_type varchar(100) NOT NULL, resource_id uuid NOT NULL, outcome varchar(16) NOT NULL CHECK (outcome IN ('applicable','not_applicable','unknown')),
  facts_hash char(64) NOT NULL, evaluated_at timestamptz NOT NULL, PRIMARY KEY (tenant_id,id),
  FOREIGN KEY (tenant_id,rule_id,rule_version) REFERENCES compliance.published_rule_versions(tenant_id,rule_id,version)
);
CREATE TABLE documents.records (
  tenant_id uuid NOT NULL, id uuid NOT NULL, classification char(2) NOT NULL CHECK (classification IN ('C1','C2','C3','C4')),
  retention_rule_id varchar(80) NOT NULL, legal_hold boolean NOT NULL DEFAULT false, retain_until date NOT NULL,
  disposition_state varchar(16) NOT NULL DEFAULT 'retained' CHECK (disposition_state IN ('retained','eligible','approved','destroyed')),
  PRIMARY KEY (tenant_id,id)
);
CREATE TABLE documents.versions (
  tenant_id uuid NOT NULL, document_id uuid NOT NULL, version integer NOT NULL CHECK (version > 0), object_key varchar(512) NOT NULL,
  sha256 char(64) NOT NULL CHECK (sha256 ~ '^[a-f0-9]{64}$'), size_bytes bigint NOT NULL CHECK (size_bytes BETWEEN 0 AND 104857600),
  created_at timestamptz NOT NULL, created_by uuid NOT NULL, PRIMARY KEY (tenant_id,document_id,version),
  UNIQUE (tenant_id,object_key), FOREIGN KEY (tenant_id,document_id) REFERENCES documents.records(tenant_id,id)
);

DO $$
DECLARE item text;
BEGIN
  FOREACH item IN ARRAY ARRAY[
    'party.parties','workforce.employments','workforce.leave_ledger','procurement.suppliers','procurement.purchase_orders',
    'procurement.purchase_order_lines','procurement.receipts','procurement.invoices','procurement.payment_instructions',
    'finance.accounts','finance.posted_journals','finance.posted_journal_lines','finance.receivables',
    'workflow.instances','workflow.decisions','compliance.published_rule_versions','compliance.evaluations','documents.records','documents.versions'
  ] LOOP
    EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', item);
    EXECUTE format('CREATE POLICY tenant_isolation ON %s USING (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid) WITH CHECK (tenant_id = nullif(current_setting(''app.tenant_id'', true), '''')::uuid)', item);
  END LOOP;
END;
$$;
GRANT USAGE ON SCHEMA party,workforce,procurement,finance,workflow,compliance,documents TO company_os_app;
GRANT SELECT,INSERT,UPDATE ON ALL TABLES IN SCHEMA party,workforce,procurement,finance,workflow,compliance,documents TO company_os_app;
CREATE TRIGGER rules_append_only BEFORE UPDATE OR DELETE ON compliance.published_rule_versions FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TRIGGER journals_append_only BEFORE UPDATE OR DELETE ON finance.posted_journals FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TRIGGER journal_lines_append_only BEFORE UPDATE OR DELETE ON finance.posted_journal_lines FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TRIGGER document_versions_append_only BEFORE UPDATE OR DELETE ON documents.versions FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE FUNCTION finance.assert_journal_balanced() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE journal_uuid uuid; tenant_uuid uuid; line_count integer; debit_total numeric(20,4); credit_total numeric(20,4);
BEGIN
  IF TG_TABLE_NAME = 'posted_journals' THEN journal_uuid := NEW.id; tenant_uuid := NEW.tenant_id;
  ELSE journal_uuid := NEW.journal_id; tenant_uuid := NEW.tenant_id; END IF;
  SELECT count(*),coalesce(sum(debit),0),coalesce(sum(credit),0) INTO line_count,debit_total,credit_total
  FROM finance.posted_journal_lines WHERE tenant_id=tenant_uuid AND journal_id=journal_uuid;
  IF line_count < 2 OR debit_total <> credit_total THEN RAISE EXCEPTION 'posted journal must have at least two balanced lines'; END IF;
  RETURN NEW;
END;
$$;
CREATE CONSTRAINT TRIGGER posted_journal_balanced_header AFTER INSERT ON finance.posted_journals
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.assert_journal_balanced();
CREATE CONSTRAINT TRIGGER posted_journal_balanced_lines AFTER INSERT ON finance.posted_journal_lines
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION finance.assert_journal_balanced();
COMMIT;
