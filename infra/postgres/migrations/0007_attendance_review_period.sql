BEGIN;

CREATE UNIQUE INDEX attendance_entry_employment_identity
  ON workforce.attendance_entries(tenant_id,id,employment_id);
CREATE INDEX attendance_employment_work_date
  ON workforce.attendance_entries(tenant_id,employment_id,work_date DESC,id);

CREATE TABLE workforce.attendance_decisions (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  attendance_entry_id uuid NOT NULL,
  employment_id uuid NOT NULL,
  decision varchar(16) NOT NULL CHECK (decision IN ('approved','rejected')),
  reason varchar(500) NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 500),
  decided_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  decided_by uuid NOT NULL,
  PRIMARY KEY (tenant_id,id),
  UNIQUE (tenant_id,attendance_entry_id),
  FOREIGN KEY (tenant_id,attendance_entry_id,employment_id)
    REFERENCES workforce.attendance_entries(tenant_id,id,employment_id)
);

CREATE TABLE workforce.attendance_period_events (
  tenant_id uuid NOT NULL,
  id uuid NOT NULL,
  employment_id uuid NOT NULL,
  period_month date NOT NULL CHECK (period_month=date_trunc('month',period_month)::date),
  sequence integer NOT NULL CHECK (sequence > 0),
  action varchar(16) NOT NULL CHECK (action IN ('close','reopen')),
  reason varchar(500) NOT NULL CHECK (length(trim(reason)) BETWEEN 1 AND 500),
  occurred_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  actor_id uuid NOT NULL,
  PRIMARY KEY (tenant_id,id),
  UNIQUE (tenant_id,employment_id,period_month,sequence),
  FOREIGN KEY (tenant_id,employment_id) REFERENCES workforce.employments(tenant_id,id)
);

ALTER TABLE workforce.attendance_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workforce.attendance_period_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY tenant_isolation ON workforce.attendance_decisions
  USING (tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid)
  WITH CHECK (tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid);
CREATE POLICY tenant_isolation ON workforce.attendance_period_events
  USING (tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid)
  WITH CHECK (tenant_id=nullif(current_setting('app.tenant_id',true),'')::uuid);
GRANT SELECT,INSERT ON workforce.attendance_decisions TO company_os_app;
GRANT SELECT,INSERT ON workforce.attendance_period_events TO company_os_app;
CREATE TRIGGER attendance_decisions_append_only
  BEFORE UPDATE OR DELETE ON workforce.attendance_decisions
  FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();
CREATE TRIGGER attendance_period_events_append_only
  BEFORE UPDATE OR DELETE ON workforce.attendance_period_events
  FOR EACH ROW EXECUTE FUNCTION audit.reject_mutation();

CREATE FUNCTION workforce.attendance_period_is_closed(
  target_tenant uuid,target_employment uuid,target_date date
) RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce((
    SELECT action='close'
      FROM workforce.attendance_period_events
     WHERE tenant_id=target_tenant AND employment_id=target_employment
       AND period_month=date_trunc('month',target_date)::date
     ORDER BY sequence DESC LIMIT 1
  ),false)
$$;

CREATE FUNCTION workforce.reject_closed_attendance_period() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(
    NEW.tenant_id::text || ':' || NEW.employment_id::text || ':' ||
    date_trunc('month',NEW.work_date)::date::text || ':attendance-period',0));
  IF workforce.attendance_period_is_closed(NEW.tenant_id,NEW.employment_id,NEW.work_date) THEN
    RAISE EXCEPTION 'attendance period is closed';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER attendance_period_write_lock
  BEFORE INSERT ON workforce.attendance_entries
  FOR EACH ROW EXECUTE FUNCTION workforce.reject_closed_attendance_period();

CREATE FUNCTION workforce.validate_attendance_decision() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE entry_date date; replacement_exists boolean;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(
    NEW.tenant_id::text || ':' || NEW.attendance_entry_id::text || ':attendance-decision',0));
  SELECT work_date,EXISTS(
    SELECT 1 FROM workforce.attendance_entries replacement
     WHERE replacement.tenant_id=entry.tenant_id
       AND replacement.corrected_entry_id=entry.id
  ) INTO entry_date,replacement_exists
  FROM workforce.attendance_entries entry
  WHERE entry.tenant_id=NEW.tenant_id AND entry.id=NEW.attendance_entry_id
    AND entry.employment_id=NEW.employment_id;
  IF entry_date IS NULL OR replacement_exists THEN
    RAISE EXCEPTION 'attendance decision target is unavailable';
  END IF;
  IF workforce.attendance_period_is_closed(NEW.tenant_id,NEW.employment_id,entry_date) THEN
    RAISE EXCEPTION 'attendance period is closed';
  END IF;
  IF EXISTS (
    SELECT 1 FROM workforce.attendance_decisions
     WHERE tenant_id=NEW.tenant_id AND attendance_entry_id=NEW.attendance_entry_id
  ) THEN RAISE EXCEPTION 'attendance entry is already decided'; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER attendance_decision_guard
  BEFORE INSERT ON workforce.attendance_decisions
  FOR EACH ROW EXECUTE FUNCTION workforce.validate_attendance_decision();

CREATE FUNCTION workforce.validate_attendance_period_event() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE previous_action varchar(16); previous_sequence integer; unresolved integer;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(
    NEW.tenant_id::text || ':' || NEW.employment_id::text || ':' || NEW.period_month::text || ':attendance-period',0));
  SELECT action,sequence INTO previous_action,previous_sequence
    FROM workforce.attendance_period_events
   WHERE tenant_id=NEW.tenant_id AND employment_id=NEW.employment_id
     AND period_month=NEW.period_month
   ORDER BY sequence DESC LIMIT 1;
  IF NEW.action='close' AND previous_action='close' THEN
    RAISE EXCEPTION 'attendance period is already closed';
  END IF;
  IF NEW.action='reopen' AND previous_action IS DISTINCT FROM 'close' THEN
    RAISE EXCEPTION 'attendance period is not closed';
  END IF;
  IF NEW.action='close' THEN
    SELECT count(*) INTO unresolved
      FROM workforce.attendance_entries entry
     WHERE entry.tenant_id=NEW.tenant_id AND entry.employment_id=NEW.employment_id
       AND entry.work_date>=NEW.period_month
       AND entry.work_date<(NEW.period_month+interval '1 month')::date
       AND NOT EXISTS (
         SELECT 1 FROM workforce.attendance_entries replacement
          WHERE replacement.tenant_id=entry.tenant_id AND replacement.corrected_entry_id=entry.id
       )
       AND NOT EXISTS (
         SELECT 1 FROM workforce.attendance_decisions decision
          WHERE decision.tenant_id=entry.tenant_id
            AND decision.attendance_entry_id=entry.id AND decision.decision='approved'
       );
    IF unresolved>0 THEN RAISE EXCEPTION 'attendance period has unresolved entries'; END IF;
  END IF;
  NEW.sequence:=coalesce(previous_sequence,0)+1;
  RETURN NEW;
END;
$$;
CREATE TRIGGER attendance_period_transition_guard
  BEFORE INSERT ON workforce.attendance_period_events
  FOR EACH ROW EXECUTE FUNCTION workforce.validate_attendance_period_event();

COMMIT;
