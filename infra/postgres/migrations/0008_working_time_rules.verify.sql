DO $$
BEGIN
  IF (SELECT count(*) FROM pg_policies WHERE schemaname='workforce' AND policyname='tenant_isolation'
      AND tablename IN ('work_rule_versions','employment_work_rule_assignments',
                        'employment_calendar_days','attendance_calculation_snapshots',
                        'working_time_enforcement')) <> 5 THEN
    RAISE EXCEPTION 'working time tenant policies missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='work_rule_assignment_guard')
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='employment_calendar_day_sequence')
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='attendance_calculations_append_only') THEN
    RAISE EXCEPTION 'working time integrity triggers missing';
  END IF;
  IF has_table_privilege('company_os_app','workforce.attendance_calculation_snapshots','UPDATE')
    OR has_table_privilege('company_os_app','workforce.work_rule_versions','DELETE') THEN
    RAISE EXCEPTION 'working time history must be append only';
  END IF;
END $$;
