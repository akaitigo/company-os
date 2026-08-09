BEGIN;

CREATE TABLE workforce.attendance_breaks (
  tenant_id uuid NOT NULL,
  attendance_entry_id uuid NOT NULL,
  id uuid NOT NULL,
  started_at timestamptz NOT NULL,
  ended_at timestamptz NOT NULL,
  PRIMARY KEY (tenant_id,attendance_entry_id,id),
  FOREIGN KEY (tenant_id,attendance_entry_id)
    REFERENCES workforce.attendance_entries(tenant_id,id),
  CHECK (ended_at > started_at),
  CHECK (extract(epoch FROM (ended_at-started_at))::bigint % 60 = 0)
);

CREATE UNIQUE INDEX attendance_single_correction
  ON workforce.attendance_entries(tenant_id,corrected_entry_id)
  WHERE corrected_entry_id IS NOT NULL;

ALTER TABLE workforce.attendance_entries
  ADD CONSTRAINT attendance_duration_max_48_hours
    CHECK (ended_at-started_at <= interval '48 hours'),
  ADD CONSTRAINT attendance_duration_whole_minutes
    CHECK (extract(epoch FROM (ended_at-started_at))::bigint % 60 = 0),
  ADD CONSTRAINT attendance_work_date_tokyo
    CHECK ((started_at AT TIME ZONE 'Asia/Tokyo')::date = work_date),
  ADD CONSTRAINT attendance_correction_not_self
    CHECK (corrected_entry_id IS NULL OR corrected_entry_id <> id);

ALTER TABLE workforce.attendance_breaks ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON workforce.attendance_breaks
  USING (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid)
  WITH CHECK (tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid);
GRANT SELECT,INSERT ON workforce.attendance_breaks TO company_os_app;
CREATE TRIGGER attendance_breaks_append_only
  BEFORE UPDATE OR DELETE ON workforce.attendance_breaks
  FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();

CREATE FUNCTION workforce.assert_attendance_breaks() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE entry_uuid uuid; tenant_uuid uuid; entry_start timestamptz; entry_end timestamptz;
  entry_employment uuid; corrected_uuid uuid; corrected_employment uuid;
  stored_minutes integer; calculated_minutes integer; break_count integer;
  has_overlap boolean; out_of_bounds boolean;
BEGIN
  IF TG_TABLE_NAME = 'attendance_entries' THEN
    entry_uuid := NEW.id; tenant_uuid := NEW.tenant_id;
  ELSE
    entry_uuid := NEW.attendance_entry_id; tenant_uuid := NEW.tenant_id;
  END IF;
  SELECT started_at,ended_at,break_minutes,employment_id,corrected_entry_id
    INTO entry_start,entry_end,stored_minutes,entry_employment,corrected_uuid
    FROM workforce.attendance_entries WHERE tenant_id=tenant_uuid AND id=entry_uuid;
  SELECT coalesce(sum(extract(epoch FROM (ended_at-started_at))/60),0)::integer,
         count(*)::integer,
         EXISTS (
           SELECT 1 FROM workforce.attendance_breaks left_break
           JOIN workforce.attendance_breaks right_break
             ON right_break.tenant_id=left_break.tenant_id
            AND right_break.attendance_entry_id=left_break.attendance_entry_id
            AND right_break.id > left_break.id
            AND tstzrange(right_break.started_at,right_break.ended_at,'[)') &&
                tstzrange(left_break.started_at,left_break.ended_at,'[)')
           WHERE left_break.tenant_id=tenant_uuid AND left_break.attendance_entry_id=entry_uuid
         )
    INTO calculated_minutes,break_count,has_overlap
    FROM workforce.attendance_breaks
    WHERE tenant_id=tenant_uuid AND attendance_entry_id=entry_uuid;
  SELECT EXISTS (
    SELECT 1 FROM workforce.attendance_breaks
     WHERE tenant_id=tenant_uuid AND attendance_entry_id=entry_uuid
       AND (started_at < entry_start OR ended_at > entry_end)
  ) INTO out_of_bounds;
  IF corrected_uuid IS NOT NULL THEN
    SELECT employment_id INTO corrected_employment
      FROM workforce.attendance_entries
     WHERE tenant_id=tenant_uuid AND id=corrected_uuid;
  END IF;
  IF out_of_bounds OR has_overlap OR break_count > 10
     OR calculated_minutes <> stored_minutes
     OR (corrected_uuid IS NOT NULL AND corrected_employment IS DISTINCT FROM entry_employment) THEN
    RAISE EXCEPTION 'attendance break intervals are inconsistent with entry';
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER attendance_break_header_consistency
  AFTER INSERT ON workforce.attendance_entries DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION workforce.assert_attendance_breaks();
CREATE CONSTRAINT TRIGGER attendance_break_child_consistency
  AFTER INSERT ON workforce.attendance_breaks DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION workforce.assert_attendance_breaks();

COMMIT;
