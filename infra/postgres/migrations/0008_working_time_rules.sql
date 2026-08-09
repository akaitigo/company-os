BEGIN;

CREATE TABLE workforce.work_rule_versions (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  rule_code varchar(32) NOT NULL CHECK (rule_code ~ '^[A-Z0-9_-]+$'),
  version integer NOT NULL CHECK (version > 0),
  effective_from date NOT NULL,
  effective_to date,
  time_zone varchar(64) NOT NULL CHECK (time_zone = 'Asia/Tokyo'),
  scheduled_start_minute smallint NOT NULL CHECK (scheduled_start_minute BETWEEN 0 AND 1439),
  scheduled_end_minute smallint NOT NULL CHECK (scheduled_end_minute BETWEEN 0 AND 1439),
  statutory_daily_minutes smallint NOT NULL CHECK (statutory_daily_minutes BETWEEN 1 AND 1440),
  night_start_minute smallint NOT NULL CHECK (night_start_minute BETWEEN 0 AND 1439),
  night_end_minute smallint NOT NULL CHECK (night_end_minute BETWEEN 0 AND 1439),
  statutory_holiday_weekdays smallint[] NOT NULL DEFAULT '{0}'::smallint[],
  requirement_id varchar(80) NOT NULL,
  control_id varchar(80) NOT NULL,
  expert_review_status varchar(16) NOT NULL CHECK (expert_review_status IN ('pending','approved','rejected')),
  definition_hash char(64) NOT NULL CHECK (definition_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_by uuid NOT NULL,
  PRIMARY KEY (tenant_id,id),
  UNIQUE (tenant_id,rule_code,version),
  CHECK (effective_to IS NULL OR effective_from < effective_to),
  CHECK (scheduled_start_minute <> scheduled_end_minute),
  CHECK (night_start_minute <> night_end_minute),
  CHECK (statutory_holiday_weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[])
);

CREATE TABLE workforce.employment_work_rule_assignments (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  employment_id uuid NOT NULL,
  work_rule_version_id uuid NOT NULL,
  effective_from date NOT NULL,
  effective_to date,
  assigned_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  assigned_by uuid NOT NULL,
  PRIMARY KEY (tenant_id,id),
  FOREIGN KEY (tenant_id,employment_id) REFERENCES workforce.employments(tenant_id,id),
  FOREIGN KEY (tenant_id,work_rule_version_id) REFERENCES workforce.work_rule_versions(tenant_id,id),
  CHECK (effective_to IS NULL OR effective_from < effective_to)
);

CREATE TABLE workforce.employment_calendar_days (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  employment_id uuid NOT NULL,
  work_date date NOT NULL,
  sequence integer NOT NULL CHECK (sequence > 0),
  day_type varchar(24) NOT NULL CHECK (day_type IN ('working','non_working','statutory_holiday')),
  reason varchar(200) NOT NULL CHECK (length(trim(reason)) > 0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  created_by uuid NOT NULL,
  PRIMARY KEY (tenant_id,id),
  UNIQUE (tenant_id,employment_id,work_date,sequence),
  FOREIGN KEY (tenant_id,employment_id) REFERENCES workforce.employments(tenant_id,id)
);

CREATE TABLE workforce.attendance_calculation_snapshots (
  tenant_id uuid NOT NULL,
  attendance_entry_id uuid NOT NULL,
  work_rule_version_id uuid NOT NULL,
  input_hash char(64) NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  schema_version smallint NOT NULL CHECK (schema_version = 1),
  worked_minutes smallint NOT NULL CHECK (worked_minutes BETWEEN 1 AND 2880),
  scheduled_minutes smallint NOT NULL CHECK (scheduled_minutes BETWEEN 0 AND 2880),
  outside_schedule_minutes smallint NOT NULL CHECK (outside_schedule_minutes BETWEEN 0 AND 2880),
  statutory_overtime_minutes smallint NOT NULL CHECK (statutory_overtime_minutes BETWEEN 0 AND 2880),
  night_minutes smallint NOT NULL CHECK (night_minutes BETWEEN 0 AND 2880),
  statutory_holiday_minutes smallint NOT NULL CHECK (statutory_holiday_minutes BETWEEN 0 AND 2880),
  explanation jsonb NOT NULL CHECK (octet_length(explanation::text) <= 16384),
  calculated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (tenant_id,attendance_entry_id),
  FOREIGN KEY (tenant_id,attendance_entry_id) REFERENCES workforce.attendance_entries(tenant_id,id),
  FOREIGN KEY (tenant_id,work_rule_version_id) REFERENCES workforce.work_rule_versions(tenant_id,id),
  CHECK (worked_minutes = scheduled_minutes + outside_schedule_minutes),
  CHECK (statutory_overtime_minutes <= worked_minutes),
  CHECK (night_minutes <= worked_minutes),
  CHECK (statutory_holiday_minutes <= worked_minutes)
);

CREATE TABLE workforce.working_time_enforcement (
  tenant_id uuid PRIMARY KEY,
  activated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  activated_by uuid NOT NULL
);

ALTER TABLE workforce.work_rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce.employment_work_rule_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce.employment_calendar_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce.attendance_calculation_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce.working_time_enforcement ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON workforce.work_rule_versions
  USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
CREATE POLICY tenant_isolation ON workforce.employment_work_rule_assignments
  USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
CREATE POLICY tenant_isolation ON workforce.employment_calendar_days
  USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
CREATE POLICY tenant_isolation ON workforce.attendance_calculation_snapshots
  USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);
CREATE POLICY tenant_isolation ON workforce.working_time_enforcement
  USING (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id',true),'')::uuid);

GRANT SELECT,INSERT ON workforce.work_rule_versions,workforce.employment_work_rule_assignments,
  workforce.employment_calendar_days,workforce.attendance_calculation_snapshots TO company_os_app;
GRANT SELECT,INSERT ON workforce.working_time_enforcement TO company_os_app;
CREATE TRIGGER work_rule_versions_append_only BEFORE UPDATE OR DELETE ON workforce.work_rule_versions
  FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TRIGGER work_rule_assignments_append_only BEFORE UPDATE OR DELETE ON workforce.employment_work_rule_assignments
  FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TRIGGER employment_calendar_days_append_only BEFORE UPDATE OR DELETE ON workforce.employment_calendar_days
  FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TRIGGER attendance_calculations_append_only BEFORE UPDATE OR DELETE ON workforce.attendance_calculation_snapshots
  FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TRIGGER working_time_enforcement_append_only BEFORE UPDATE OR DELETE ON workforce.working_time_enforcement
  FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();

CREATE FUNCTION workforce.validate_work_rule_assignment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE rule_from date; rule_to date; rule_status varchar(16);
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(
    NEW.tenant_id::text || ':' || NEW.employment_id::text || ':work-rule-assignment',0));
  SELECT effective_from,effective_to,expert_review_status INTO rule_from,rule_to,rule_status
    FROM workforce.work_rule_versions
   WHERE tenant_id=NEW.tenant_id AND id=NEW.work_rule_version_id;
  IF rule_status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'work rule is not approved';
  END IF;
  IF NEW.effective_from < rule_from
    OR (rule_to IS NOT NULL AND coalesce(NEW.effective_to,'infinity'::date) > rule_to) THEN
    RAISE EXCEPTION 'assignment exceeds work rule effective period';
  END IF;
  IF EXISTS (
    SELECT 1 FROM workforce.employment_work_rule_assignments assignment
     WHERE assignment.tenant_id=NEW.tenant_id AND assignment.employment_id=NEW.employment_id
       AND assignment.id<>NEW.id
       AND daterange(assignment.effective_from,assignment.effective_to,'[)') &&
           daterange(NEW.effective_from,NEW.effective_to,'[)')
  ) THEN RAISE EXCEPTION 'work rule assignment overlaps'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER work_rule_assignment_guard BEFORE INSERT ON workforce.employment_work_rule_assignments
  FOR EACH ROW EXECUTE FUNCTION workforce.validate_work_rule_assignment();

CREATE FUNCTION workforce.assign_calendar_day_sequence() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(
    NEW.tenant_id::text || ':' || NEW.employment_id::text || ':' || NEW.work_date::text,0));
  SELECT coalesce(max(sequence),0)+1 INTO NEW.sequence
    FROM workforce.employment_calendar_days
   WHERE tenant_id=NEW.tenant_id AND employment_id=NEW.employment_id AND work_date=NEW.work_date;
  RETURN NEW;
END;
$$;
CREATE TRIGGER employment_calendar_day_sequence BEFORE INSERT ON workforce.employment_calendar_days
  FOR EACH ROW EXECUTE FUNCTION workforce.assign_calendar_day_sequence();

COMMIT;
