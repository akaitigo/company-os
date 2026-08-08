DO $$
DECLARE expected integer := 19; actual integer;
BEGIN
  SELECT count(*) INTO actual FROM pg_policies
  WHERE policyname='tenant_isolation' AND (schemaname,tablename) IN (
    ('party','parties'),('workforce','employments'),('workforce','leave_ledger'),
    ('procurement','suppliers'),('procurement','purchase_orders'),('procurement','purchase_order_lines'),
    ('procurement','receipts'),('procurement','invoices'),('procurement','payment_instructions'),
    ('finance','accounts'),('finance','posted_journals'),('finance','posted_journal_lines'),('finance','receivables'),
    ('workflow','instances'),('workflow','decisions'),('compliance','published_rule_versions'),
    ('compliance','evaluations'),('documents','records'),('documents','versions')
  );
  IF actual <> expected THEN RAISE EXCEPTION 'expected % v1 tenant policies, found %', expected, actual; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='rules_append_only') OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='journals_append_only') THEN
    RAISE EXCEPTION 'v1 append-only triggers missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='posted_journal_balanced_header') THEN RAISE EXCEPTION 'journal balance trigger missing'; END IF;
END;
$$;
