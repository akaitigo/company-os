DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='workforce' AND tablename='attendance_breaks'
       AND policyname='tenant_isolation'
  ) THEN RAISE EXCEPTION 'attendance break tenant policy missing'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='attendance_breaks_append_only')
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='attendance_break_header_consistency')
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='attendance_break_child_consistency') THEN
    RAISE EXCEPTION 'attendance break integrity triggers missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname='attendance_single_correction') THEN
    RAISE EXCEPTION 'attendance single correction index missing';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid='workforce.attendance_entries'::regclass
       AND conname IN ('attendance_duration_max_48_hours','attendance_duration_whole_minutes',
                       'attendance_work_date_tokyo','attendance_correction_not_self')
     GROUP BY conrelid HAVING count(*)=4
  ) THEN RAISE EXCEPTION 'attendance header integrity constraints missing'; END IF;
END;
$$;
