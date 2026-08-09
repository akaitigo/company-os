\set ON_ERROR_STOP on

BEGIN;
INSERT INTO organization.units (tenant_id,id,code,name,effective_from)
VALUES ('11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000001','HQ','Fictional Company HQ','2026-04-01')
ON CONFLICT DO NOTHING;
INSERT INTO party.parties (tenant_id,id,party_type,display_name)
VALUES ('11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000002','person','Demo Operations User')
ON CONFLICT DO NOTHING;
INSERT INTO workforce.employments
  (tenant_id,id,worker_party_id,organization_unit_id,effective_from,weekly_minutes,status)
VALUES
  ('11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000003',
   '10000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000001','2026-04-01',2400,'active')
ON CONFLICT DO NOTHING;
INSERT INTO party.parties (tenant_id,id,party_type,display_name)
VALUES ('11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000012',
        'person','Access Boundary Test User')
ON CONFLICT DO NOTHING;
INSERT INTO workforce.employments
  (tenant_id,id,worker_party_id,organization_unit_id,effective_from,weekly_minutes,status)
VALUES
  ('11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000013',
   '10000000-0000-4000-8000-000000000012','10000000-0000-4000-8000-000000000001',
   '2026-04-01',2400,'active')
ON CONFLICT DO NOTHING;
INSERT INTO workforce.leave_ledger
  (tenant_id,id,employment_id,occurred_at,entry_type,minutes,reference_id)
VALUES
  ('11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000006',
   '10000000-0000-4000-8000-000000000003',clock_timestamp(),'grant',525600,
   '10000000-0000-4000-8000-000000000006')
ON CONFLICT DO NOTHING;
INSERT INTO party.parties (tenant_id,id,party_type,display_name)
VALUES ('11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000007',
        'organization','Fictional Customer')
ON CONFLICT DO NOTHING;
INSERT INTO finance.accounts (tenant_id,id,code,name,account_type,active_from)
VALUES
  ('11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000004','1000','Cash','asset','2026-04-01'),
  ('11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000005','6000','Operating Expense','expense','2026-04-01')
ON CONFLICT DO NOTHING;
INSERT INTO finance.receivables
  (tenant_id,id,customer_party_id,document_number,issued_on,due_on,currency,original_amount,open_amount,status)
VALUES
  ('11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000008',
   '10000000-0000-4000-8000-000000000007','DEMO-AR-001','2026-08-01','2026-08-31','JPY',1000000,1000000,'open')
ON CONFLICT (tenant_id,id) DO UPDATE SET open_amount=excluded.open_amount,status=excluded.status;
INSERT INTO finance.posted_journals
  (tenant_id,id,accounting_date,currency,source_type,source_id,posted_at,posted_by)
VALUES
  ('11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000009',
   '2026-08-09','JPY','demo','10000000-0000-4000-8000-000000000009',clock_timestamp(),
   '10000000-0000-4000-8000-000000000002')
ON CONFLICT DO NOTHING;
INSERT INTO finance.posted_journal_lines
  (tenant_id,journal_id,line_number,account_id,debit,credit)
VALUES
  ('11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000009',1,
   '10000000-0000-4000-8000-000000000004',1000,0),
  ('11111111-1111-4111-8111-111111111111','10000000-0000-4000-8000-000000000009',2,
   '10000000-0000-4000-8000-000000000005',0,1000)
ON CONFLICT DO NOTHING;
INSERT INTO compliance.published_rule_versions
  (tenant_id,rule_id,version,effective_from,definition,published_at,published_by)
VALUES
  ('11111111-1111-4111-8111-111111111111','RULE-COST-DEMO',1,'2026-04-01','{}',clock_timestamp(),
   '10000000-0000-4000-8000-000000000002')
ON CONFLICT DO NOTHING;
COMMIT;
