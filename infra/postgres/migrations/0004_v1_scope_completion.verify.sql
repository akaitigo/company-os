DO $$
DECLARE expected integer := 12; actual integer;
BEGIN
  SELECT count(*) INTO actual
  FROM pg_policies
  WHERE policyname='tenant_isolation'
    AND (schemaname,tablename) IN (
      ('workforce','attendance_entries'),('workforce','leave_requests'),
      ('procurement','requisitions'),('procurement','requisition_lines'),('procurement','receipt_lines'),
      ('procurement','expense_claims'),('procurement','expense_claim_lines'),('procurement','invoice_lines'),
      ('procurement','payment_events'),('finance','receipts'),('finance','receipt_applications'),
      ('finance','cost_allocations')
    );
  IF actual <> expected THEN
    RAISE EXCEPTION 'expected % v1 completion tenant policies, found %', expected, actual;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='payment_events_append_only')
    OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='receipt_applications_append_only') THEN
    RAISE EXCEPTION 'v1 completion append-only triggers missing';
  END IF;
END;
$$;
