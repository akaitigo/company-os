DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'organization' AND tablename = 'units') THEN
    RAISE EXCEPTION 'tenant RLS policy missing for organization.units';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_intents_append_only') THEN
    RAISE EXCEPTION 'append-only trigger missing for audit.intents';
  END IF;
END;
$$;

