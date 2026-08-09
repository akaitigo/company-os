DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='workforce'
      AND tablename='attendance_decisions' AND policyname='tenant_isolation'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='workforce'
      AND tablename='attendance_period_events' AND policyname='tenant_isolation'
  ) THEN RAISE EXCEPTION 'attendance review RLS missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='attendance_decision_guard')
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='attendance_period_transition_guard')
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='attendance_period_write_lock') THEN
    RAISE EXCEPTION 'attendance review integrity trigger missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='attendance_employment_work_date') THEN
    RAISE EXCEPTION 'attendance close/read path index missing';
  END IF;
  IF has_table_privilege('company_os_app','workforce.attendance_decisions','UPDATE')
    OR has_table_privilege('company_os_app','workforce.attendance_period_events','DELETE') THEN
    RAISE EXCEPTION 'attendance review history must be append only';
  END IF;
END;
$$;
