-- ============================================================================
-- Milkow — Auto Entry migration
-- ----------------------------------------------------------------------------
-- Adds two additive boolean columns, both NOT NULL DEFAULT false. No existing
-- row or behaviour is changed. Both ALTERs are IF NOT EXISTS, so this file is
-- safe to run more than once.
--
-- HOW TO RUN
--   Supabase dashboard -> SQL Editor -> paste this whole file -> Run.
--   This file is pure SQL (no Markdown), so select-all + Run is safe.
--
-- EXPECTED RESULT
--   The verification SELECT at the bottom returns exactly two rows:
--     customers  | auto_entry   | boolean | false | NO
--     deliveries | auto_marked  | boolean | false | NO
--
-- ROLLBACK
--   Not required. To disable the feature everywhere (keeps all rows intact):
--     UPDATE customers SET auto_entry = false WHERE auto_entry = true;
--   Do NOT drop the columns: existing deliveries rows carry auto_marked = true
--   as an audit trail of which rows were auto-marked by the system.
--
-- NOTE
--   ADD COLUMN ... DEFAULT false uses the Postgres fast-default path (no table
--   rewrite), so this is safe to run while the app is live.
-- ============================================================================

BEGIN;

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS auto_entry BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN customers.auto_entry IS
  'If true, deliveries for this customer are auto-marked delivered on creation and appear pre-checked on the driver run sheet. Driver can still uncheck.';

ALTER TABLE deliveries
  ADD COLUMN IF NOT EXISTS auto_marked BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN deliveries.auto_marked IS
  'True if this row was auto-marked delivered at creation. Cleared when the driver explicitly toggles the delivery.';

COMMIT;

-- ----------------------------------------------------------------------------
-- Verification — expect exactly two rows.
-- ----------------------------------------------------------------------------
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name IN ('customers', 'deliveries')
  AND column_name IN ('auto_entry', 'auto_marked')
ORDER BY table_name, column_name;
