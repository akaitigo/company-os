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
VALUES ('99999999-9999-4999-8999-999999999999','60606060-6060-4060-8060-606060606060','RULES','Rules','2026-04-01');
INSERT INTO party.parties (tenant_id,id,party_type,display_name)
VALUES ('99999999-9999-4999-8999-999999999999','61616161-6161-4161-8161-616161616161','person','Rule Worker');
INSERT INTO workforce.employments
  (tenant_id,id,worker_party_id,organization_unit_id,effective_from,weekly_minutes,status)
VALUES ('99999999-9999-4999-8999-999999999999','62626262-6262-4262-8262-626262626262',
  '61616161-6161-4161-8161-616161616161','60606060-6060-4060-8060-606060606060','2026-04-01',2400,'active');
SET LOCAL ROLE company_os_app;
SELECT set_config('app.tenant_id','99999999-9999-4999-8999-999999999999',true);
INSERT INTO workforce.work_rule_versions
  (tenant_id,id,rule_code,version,effective_from,time_zone,scheduled_start_minute,
   scheduled_end_minute,statutory_daily_minutes,night_start_minute,night_end_minute,
   requirement_id,control_id,expert_review_status,definition_hash,created_by)
VALUES ('99999999-9999-4999-8999-999999999999','63636363-6363-4363-8363-636363636363',
  'TEST_RULE',1,'2026-04-01','Asia/Tokyo',540,1080,480,1320,300,
  'JP-LABOR-003','CTL-LABOR-OVERTIME-001','approved',repeat('a',64),
  '64646464-6464-4464-8464-646464646464');
INSERT INTO workforce.employment_work_rule_assignments
  (tenant_id,id,employment_id,work_rule_version_id,effective_from,assigned_by)
VALUES ('99999999-9999-4999-8999-999999999999','65656565-6565-4565-8565-656565656565',
  '62626262-6262-4262-8262-626262626262','63636363-6363-4363-8363-636363636363',
  '2026-04-01','64646464-6464-4464-8464-646464646464');
DO $$
BEGIN
  BEGIN
    INSERT INTO workforce.employment_work_rule_assignments
      (tenant_id,id,employment_id,work_rule_version_id,effective_from,assigned_by)
    VALUES ('99999999-9999-4999-8999-999999999999','66666666-6666-4666-8666-666666666666',
      '62626262-6262-4262-8262-626262626262','63636363-6363-4363-8363-636363636363',
      '2027-01-01','64646464-6464-4464-8464-646464646464');
    RAISE EXCEPTION 'overlapping work rule assignment unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='overlapping work rule assignment unexpectedly succeeded' THEN RAISE; END IF;
  END;
END;
$$;
INSERT INTO workforce.employment_calendar_days
  (tenant_id,id,employment_id,work_date,day_type,reason,created_by)
VALUES
  ('99999999-9999-4999-8999-999999999999','67676767-6767-4767-8767-676767676767',
   '62626262-6262-4262-8262-626262626262','2026-08-10','working','initial',
   '64646464-6464-4464-8464-646464646464'),
  ('99999999-9999-4999-8999-999999999999','68686868-6868-4868-8868-686868686868',
   '62626262-6262-4262-8262-626262626262','2026-08-10','statutory_holiday','correction',
   '64646464-6464-4464-8464-646464646464');
DO $$
BEGIN
  IF (SELECT max(sequence) FROM workforce.employment_calendar_days
       WHERE employment_id='62626262-6262-4262-8262-626262626262') <> 2 THEN
    RAISE EXCEPTION 'calendar correction sequence was not assigned';
  END IF;
  PERFORM set_config('app.tenant_id','77777777-7777-4777-8777-777777777777',true);
  IF EXISTS (SELECT 1 FROM workforce.work_rule_versions WHERE rule_code='TEST_RULE') THEN
    RAISE EXCEPTION 'work rule leaked through tenant RLS';
  END IF;
END;
$$;
ROLLBACK;

BEGIN;
INSERT INTO organization.units (tenant_id,id,code,name,effective_from)
VALUES ('99999999-9999-4999-8999-999999999999','41414141-4141-4141-8141-414141414141','REVIEW','Review','2026-04-01');
INSERT INTO party.parties (tenant_id,id,party_type,display_name)
VALUES ('99999999-9999-4999-8999-999999999999','42424242-4242-4242-8242-424242424242','person','Review Worker');
INSERT INTO workforce.employments
  (tenant_id,id,worker_party_id,organization_unit_id,effective_from,weekly_minutes,status)
VALUES ('99999999-9999-4999-8999-999999999999','43434343-4343-4343-8343-434343434343',
  '42424242-4242-4242-8242-424242424242','41414141-4141-4141-8141-414141414141','2026-04-01',2400,'active');
SET LOCAL ROLE company_os_app;
SELECT set_config('app.tenant_id','99999999-9999-4999-8999-999999999999',true);
INSERT INTO workforce.attendance_entries
  (tenant_id,id,employment_id,work_date,started_at,ended_at,break_minutes,source,status,recorded_by)
VALUES ('99999999-9999-4999-8999-999999999999','44444444-4444-4444-8444-444444444444',
  '43434343-4343-4343-8343-434343434343','2026-09-01','2026-08-31T23:00:00Z','2026-09-01T08:00:00Z',0,
  'manual','submitted','45454545-4545-4545-8545-454545454545');
DO $$
BEGIN
  BEGIN
    INSERT INTO workforce.attendance_period_events
      (tenant_id,id,employment_id,period_month,sequence,action,reason,actor_id)
    VALUES ('99999999-9999-4999-8999-999999999999','46464646-4646-4646-8646-464646464646',
      '43434343-4343-4343-8343-434343434343','2026-09-01',1,'close','cutoff',
      '47474747-4747-4747-8747-474747474747');
    RAISE EXCEPTION 'unresolved attendance period unexpectedly closed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='unresolved attendance period unexpectedly closed' THEN RAISE; END IF;
  END;
END;
$$;
INSERT INTO workforce.attendance_decisions
  (tenant_id,id,attendance_entry_id,employment_id,decision,reason,decided_by)
VALUES ('99999999-9999-4999-8999-999999999999','48484848-4848-4848-8848-484848484848',
  '44444444-4444-4444-8444-444444444444','43434343-4343-4343-8343-434343434343',
  'approved','verified','47474747-4747-4747-8747-474747474747');
INSERT INTO workforce.attendance_period_events
  (tenant_id,id,employment_id,period_month,sequence,action,reason,actor_id)
VALUES ('99999999-9999-4999-8999-999999999999','49494949-4949-4949-8949-494949494949',
  '43434343-4343-4343-8343-434343434343','2026-09-01',1,'close','cutoff',
  '47474747-4747-4747-8747-474747474747');
DO $$
BEGIN
  BEGIN
    INSERT INTO workforce.attendance_entries
      (tenant_id,id,employment_id,work_date,started_at,ended_at,break_minutes,source,status,recorded_by)
    VALUES ('99999999-9999-4999-8999-999999999999','50505050-5050-4050-8050-505050505050',
      '43434343-4343-4343-8343-434343434343','2026-09-02','2026-09-01T23:00:00Z','2026-09-02T08:00:00Z',0,
      'manual','submitted','45454545-4545-4545-8545-454545454545');
    RAISE EXCEPTION 'closed attendance period accepted a record';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='closed attendance period accepted a record' THEN RAISE; END IF;
  END;
  BEGIN
    INSERT INTO workforce.attendance_decisions
      (tenant_id,id,attendance_entry_id,employment_id,decision,reason,decided_by)
    VALUES ('99999999-9999-4999-8999-999999999999','51515151-5151-4151-8151-515151515151',
      '44444444-4444-4444-8444-444444444444','43434343-4343-4343-8343-434343434343',
      'rejected','second decision','47474747-4747-4747-8747-474747474747');
    RAISE EXCEPTION 'duplicate attendance decision unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM='duplicate attendance decision unexpectedly succeeded' THEN RAISE; END IF;
  END;
  BEGIN
    UPDATE workforce.attendance_decisions SET reason='mutated'
     WHERE id='48484848-4848-4848-8848-484848484848';
    RAISE EXCEPTION 'attendance decision mutation unexpectedly succeeded';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM='attendance decision mutation unexpectedly succeeded' THEN RAISE; END IF;
  END;
END;
$$;
INSERT INTO workforce.attendance_period_events
  (tenant_id,id,employment_id,period_month,sequence,action,reason,actor_id)
VALUES ('99999999-9999-4999-8999-999999999999','52525252-5252-4252-8252-525252525252',
  '43434343-4343-4343-8343-434343434343','2026-09-01',1,'reopen','correction required',
  '47474747-4747-4747-8747-474747474747');
INSERT INTO workforce.attendance_entries
  (tenant_id,id,employment_id,work_date,started_at,ended_at,break_minutes,source,status,recorded_by)
VALUES ('99999999-9999-4999-8999-999999999999','50505050-5050-4050-8050-505050505050',
  '43434343-4343-4343-8343-434343434343','2026-09-02','2026-09-01T23:00:00Z','2026-09-02T08:00:00Z',0,
  'manual','submitted','45454545-4545-4545-8545-454545454545');
DO $$
BEGIN
  PERFORM set_config('app.tenant_id','77777777-7777-4777-8777-777777777777',true);
  IF (SELECT count(*) FROM workforce.attendance_decisions)>0
    OR (SELECT count(*) FROM workforce.attendance_period_events)>0 THEN
    RAISE EXCEPTION 'cross-tenant attendance review history leaked';
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
