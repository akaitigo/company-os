DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname='workforce' AND tablename='employment_access'
       AND policyname='tenant_isolation'
  ) THEN RAISE EXCEPTION 'employment access tenant policy missing'; END IF;
  IF has_table_privilege('company_os_app','workforce.employment_access','INSERT') THEN
    RAISE EXCEPTION 'application role must not self-grant employment access';
  END IF;
END;
$$;
