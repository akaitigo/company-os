DO $$
DECLARE expected integer := 19; actual integer;
BEGIN
  SELECT count(*) INTO actual FROM pg_policies WHERE policyname='tenant_isolation' AND schemaname IN ('party','workforce','procurement','finance','workflow','compliance','documents');
  IF actual <> expected THEN RAISE EXCEPTION 'expected % v1 tenant policies, found %', expected, actual; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='rules_append_only') OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='journals_append_only') THEN
    RAISE EXCEPTION 'v1 append-only triggers missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='posted_journal_balanced_header') THEN RAISE EXCEPTION 'journal balance trigger missing'; END IF;
END;
$$;
