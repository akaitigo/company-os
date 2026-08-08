DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'projection' AND tablename = 'organization_unit_directory'
  ) THEN
    RAISE EXCEPTION 'tenant RLS policy missing for organization projection';
  END IF;
END;
$$;

