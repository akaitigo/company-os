\set ON_ERROR_STOP on

BEGIN;
SET LOCAL ROLE company_os_app;
SELECT set_config('app.tenant_id', '99999999-9999-4999-8999-999999999999', true);

INSERT INTO organization.units (
  tenant_id, id, code, name, effective_from
) VALUES (
  '99999999-9999-4999-8999-999999999999',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'FIN', 'Finance', '2026-04-01'
);

INSERT INTO audit.intents (
  tenant_id, id, occurred_at, actor_id, action, resource_type, resource_id, decision, request_id
) VALUES (
  '99999999-9999-4999-8999-999999999999',
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', now(),
  '33333333-3333-4333-8333-333333333333',
  'organization.unit.create', 'organization_unit',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'allow',
  '55555555-5555-4555-8555-555555555555'
);

INSERT INTO integration.outbox (
  tenant_id, id, idempotency_key, event_type, aggregate_id, aggregate_version, payload, occurred_at
) VALUES (
  '99999999-9999-4999-8999-999999999999',
  'ffffffff-ffff-4fff-8fff-ffffffffffff',
  'tenant:unit:1:create', 'organization.unit.created.v1',
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd', 1, '{}', now()
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

BEGIN;
INSERT INTO organization.units (tenant_id,id,code,name,effective_from)
VALUES ('99999999-9999-4999-8999-999999999999','30303030-3030-4030-8030-303030303030','TIME','Time','2026-04-01');
INSERT INTO party.parties (tenant_id,id,party_type,display_name)
VALUES ('99999999-9999-4999-8999-999999999999','31313131-3131-4131-8131-313131313131','person','Break Worker');
INSERT INTO workforce.employments
  (tenant_id,id,worker_party_id,organization_unit_id,effective_from,weekly_minutes,status)
VALUES ('99999999-9999-4999-8999-999999999999','32323232-3232-4232-8232-323232323232',
  '31313131-3131-4131-8131-313131313131','30303030-3030-4030-8030-303030303030','2026-04-01',2400,'active');
SET LOCAL ROLE company_os_app;
SELECT set_config('app.tenant_id', '99999999-9999-4999-8999-999999999999', true);
INSERT INTO workforce.attendance_entries
  (tenant_id,id,employment_id,work_date,started_at,ended_at,break_minutes,source,status,recorded_by)
VALUES ('99999999-9999-4999-8999-999999999999','33333333-3333-4333-8333-333333333333',
  '32323232-3232-4232-8232-323232323232','2026-08-09','2026-08-08T23:30:00Z','2026-08-09T09:15:00Z',45,
  'manual','submitted','34343434-3434-4434-8434-343434343434');
INSERT INTO workforce.attendance_breaks
  (tenant_id,attendance_entry_id,id,started_at,ended_at)
VALUES ('99999999-9999-4999-8999-999999999999','33333333-3333-4333-8333-333333333333',
  '35353535-3535-4535-8535-353535353535','2026-08-09T03:00:00Z','2026-08-09T03:45:00Z');
SET CONSTRAINTS ALL IMMEDIATE;
DO $$
BEGIN
  SET CONSTRAINTS ALL DEFERRED;
  BEGIN
    INSERT INTO workforce.attendance_entries
      (tenant_id,id,employment_id,work_date,started_at,ended_at,break_minutes,source,status,recorded_by)
    VALUES ('99999999-9999-4999-8999-999999999999','36363636-3636-4636-8636-363636363636',
      '32323232-3232-4232-8232-323232323232','2026-08-09','2026-08-08T23:30:00Z','2026-08-09T09:15:00Z',30,
      'manual','submitted','34343434-3434-4434-8434-343434343434');
    INSERT INTO workforce.attendance_breaks
      (tenant_id,attendance_entry_id,id,started_at,ended_at)
    VALUES ('99999999-9999-4999-8999-999999999999','36363636-3636-4636-8636-363636363636',
      '37373737-3737-4737-8737-373737373737','2026-08-09T03:00:00Z','2026-08-09T04:00:00Z');
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'inconsistent attendance break unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'inconsistent attendance break unexpectedly succeeded' THEN RAISE; END IF;
  END;
END;
$$;
ROLLBACK;

BEGIN;
INSERT INTO organization.units (tenant_id,id,code,name,effective_from)
VALUES ('99999999-9999-4999-8999-999999999999','20202020-2020-4020-8020-202020202020','OPS','Operations','2026-04-01');
INSERT INTO party.parties (tenant_id,id,party_type,display_name)
VALUES ('99999999-9999-4999-8999-999999999999','21212121-2121-4121-8121-212121212121','person','Attendance Worker');
INSERT INTO workforce.employments
  (tenant_id,id,worker_party_id,organization_unit_id,effective_from,weekly_minutes,status)
VALUES
  ('99999999-9999-4999-8999-999999999999','22222222-2222-4222-8222-222222222222',
   '21212121-2121-4121-8121-212121212121','20202020-2020-4020-8020-202020202020','2026-04-01',2400,'active');
SET LOCAL ROLE company_os_app;
SELECT set_config('app.tenant_id', '99999999-9999-4999-8999-999999999999', true);
INSERT INTO workforce.attendance_entries
  (tenant_id,id,employment_id,work_date,started_at,ended_at,break_minutes,source,status,recorded_by)
VALUES
  ('99999999-9999-4999-8999-999999999999','23232323-2323-4232-8232-232323232323',
   '22222222-2222-4222-8222-222222222222','2026-08-09','2026-08-09T00:00:00Z','2026-08-09T09:00:00Z',60,
   'clock','submitted','24242424-2424-4242-8242-242424242424');
DO $$
BEGIN
  PERFORM set_config('app.tenant_id', '77777777-7777-4777-8777-777777777777', true);
  IF (SELECT count(*) FROM workforce.attendance_entries) <> 0 THEN
    RAISE EXCEPTION 'cross-tenant attendance leaked through RLS';
  END IF;
  PERFORM set_config('app.tenant_id', '99999999-9999-4999-8999-999999999999', true);
  BEGIN
    UPDATE workforce.attendance_entries SET status='approved'
    WHERE id='23232323-2323-4232-8232-232323232323';
    RAISE EXCEPTION 'append-only attendance update unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'append-only attendance update unexpectedly succeeded' THEN RAISE; END IF;
  END;
END;
$$;
ROLLBACK;

DO $$
BEGIN
  BEGIN
    INSERT INTO finance.accounts (tenant_id,id,code,name,account_type,active_from) VALUES
      ('99999999-9999-4999-8999-999999999999','14141414-1414-4141-8141-141414141414','1000','Cash','asset','2026-04-01'),
      ('99999999-9999-4999-8999-999999999999','15151515-1515-4151-8151-151515151515','4000','Revenue','revenue','2026-04-01');
    INSERT INTO finance.posted_journals (tenant_id,id,accounting_date,currency,source_type,source_id,posted_at,posted_by)
    VALUES ('99999999-9999-4999-8999-999999999999','16161616-1616-4161-8161-161616161616','2026-08-09','JPY','test','17171717-1717-4171-8171-171717171717',now(),'18181818-1818-4181-8181-181818181818');
    INSERT INTO finance.posted_journal_lines (tenant_id,journal_id,line_number,account_id,debit,credit) VALUES
      ('99999999-9999-4999-8999-999999999999','16161616-1616-4161-8161-161616161616',1,'14141414-1414-4141-8141-141414141414',100,0),
      ('99999999-9999-4999-8999-999999999999','16161616-1616-4161-8161-161616161616',2,'15151515-1515-4151-8151-151515151515',0,99);
    SET CONSTRAINTS ALL IMMEDIATE;
    RAISE EXCEPTION 'unbalanced journal unexpectedly committed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'unbalanced journal unexpectedly committed' THEN RAISE; END IF;
  END;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM organization.units
    WHERE id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
  ) THEN
    RAISE EXCEPTION 'transaction rollback left a partial aggregate';
  END IF;
  IF EXISTS (
    SELECT 1 FROM audit.intents
    WHERE id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
  ) OR EXISTS (
    SELECT 1 FROM integration.outbox
    WHERE id = 'ffffffff-ffff-4fff-8fff-ffffffffffff'
  ) THEN
    RAISE EXCEPTION 'transaction rollback left audit or outbox rows';
  END IF;
END;
$$;

BEGIN;
SET LOCAL ROLE company_os_app;
SELECT set_config('app.tenant_id', '99999999-9999-4999-8999-999999999999', true);
INSERT INTO party.parties (tenant_id,id,party_type,display_name)
VALUES ('99999999-9999-4999-8999-999999999999','12121212-1212-4121-8121-121212121212','person','Fictional Worker');
DO $$
BEGIN
  PERFORM set_config('app.tenant_id', '77777777-7777-4777-8777-777777777777', true);
  IF (SELECT count(*) FROM party.parties WHERE id='12121212-1212-4121-8121-121212121212') <> 0 THEN
    RAISE EXCEPTION 'cross-tenant party leaked through RLS';
  END IF;
END;
$$;
ROLLBACK;

BEGIN;
INSERT INTO compliance.published_rule_versions
(tenant_id,rule_id,version,effective_from,definition,published_at,published_by)
VALUES ('99999999-9999-4999-8999-999999999999','RULE-TEST-001',1,'2026-04-01','{}',now(),'13131313-1313-4131-8131-131313131313');
DO $$
BEGIN
  BEGIN
    UPDATE compliance.published_rule_versions SET definition='{"changed":true}'
    WHERE tenant_id='99999999-9999-4999-8999-999999999999' AND rule_id='RULE-TEST-001' AND version=1;
    RAISE EXCEPTION 'append-only rule update unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM = 'append-only rule update unexpectedly succeeded' THEN RAISE; END IF;
  END;
END;
$$;
ROLLBACK;
