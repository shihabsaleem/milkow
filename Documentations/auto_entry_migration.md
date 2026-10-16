# Auto Entry — Database Migration

**Feature:** per-customer "Auto Entry" toggle. When enabled, that customer's delivery rows are
created pre-marked `delivered = true`, so the driver doesn't tap every daily customer each shift.
Rows still appear on the run sheet and can be unchecked if the milk wasn't actually delivered.

**Status:** not applied — re-verified against the live project (`deliveries.auto_marked` still returns
`42703 column does not exist`). This file is for you to run.

> ⚠️ **Do not paste this whole document into the SQL Editor.** It is Markdown, and its `#` headings
> are not valid SQL — doing so gives `42601: syntax error at or near "#"`. Copy only the text inside
> the fenced `sql` blocks.

**▶ Runnable file: [`auto_entry_migration.sql`](./auto_entry_migration.sql)** — the same statements as
§1 below, in a pure-SQL file. Open it, paste the whole thing into the SQL Editor, and Run. There is
no Markdown in it, so select-all is safe. Use whichever you prefer; the two are identical.

---

## Before you run this

- [ ] Verified Supabase backup exists **and** you have restored from it once
- [ ] Run outside your delivery windows (avoid 05:00–09:00 and 17:00–21:00 IST)
- [ ] Both statements are `IF NOT EXISTS` — safe to re-run

This migration is **purely additive**: two new columns with defaults. It changes no existing
behaviour and no existing row's data.

The app is safe to deploy *before* this runs — every auto-entry code path is gated on the columns
existing. That guarantee only became true in commit `29f2da1`. The original Auto Entry commit
(`5ef8d8c`) put `auto_marked` in the route-insert payload unconditionally, so while the column was
missing PostgREST rejected the whole statement (`PGRST204: Could not find the 'auto_marked' column`)
and **no delivery rows were created at all**. If you are ever running code older than `29f2da1`,
apply this migration *before* deploying it.

---

## 1. Apply and verify — one paste

Copy everything inside the single block below into the Supabase dashboard → **SQL Editor** → **Run**.
It adds both columns and prints the verification table at the bottom.

```sql
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

-- Verification — expect exactly two rows.
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name IN ('customers', 'deliveries')
  AND column_name IN ('auto_entry', 'auto_marked')
ORDER BY table_name, column_name;
```

Expected result — two rows:

| table_name | column_name | data_type | column_default | is_nullable |
|---|---|---|---|---|
| customers | auto_entry | boolean | false | NO |
| deliveries | auto_marked | boolean | false | NO |

Then **hard-reload** the app (`Ctrl+Shift+R`). The **Auto Entry** toggle appears in the customer
forms, directly below Delivery Frequency.

---

## 2. Verify later (optional)

This `SELECT` is already included at the end of §1. Run it on its own any time you want to re-check
that the columns are present.

```sql
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name IN ('customers', 'deliveries')
  AND column_name IN ('auto_entry', 'auto_marked')
ORDER BY table_name, column_name;
```

Expected:

| table_name | column_name | data_type | column_default | is_nullable |
|---|---|---|---|---|
| customers | auto_entry | boolean | false | NO |
| deliveries | auto_marked | boolean | false | NO |

---

## 3. Enable it for a customer

Normally done from the customer page (the new **Auto Entry** toggle). To set it directly:

```sql
-- Enable for one customer
UPDATE customers
SET auto_entry = true
WHERE id = '<CUSTOMER_UUID>'
RETURNING id, name, frequency, auto_entry;

-- Disable
UPDATE customers
SET auto_entry = false
WHERE id = '<CUSTOMER_UUID>';
```

**Prefer the UI toggle over raw SQL** — it goes through the same auth and audit path as every
other customer edit.

---

## 4. Optional — seed existing daily buyers

> **Read this before running.** This is a bulk `UPDATE` against live customer data.
> It changes billing behaviour: every enabled customer gets billed automatically at shift close
> unless the driver unchecks them. **Run the preview query first, read the list, and only then
> apply.** Do not run it during a delivery window.

**Step 4a — preview. Nothing is written by this query.**

Finds active customers who received *every* delivery in the last 14 days. No missed days in that
window is the signal we want: it's a daily buyer, not someone who just happens to be frequent.

```sql
SELECT
  c.id,
  c.name,
  c.frequency,
  COUNT(*)                                                   AS deliveries_14d,
  COUNT(*) FILTER (WHERE d.delivered)                        AS delivered_14d,
  COUNT(*) FILTER (WHERE NOT d.delivered)                    AS missed_14d
FROM customers c
JOIN deliveries d
  ON d.customer_id = c.id
WHERE c.franchise_id = '<FRANCHISE_UUID>'
  AND c.status = 'Active'
  AND d.delivery_date > CURRENT_DATE - INTERVAL '14 days'
GROUP BY c.id, c.name, c.frequency
HAVING COUNT(*) FILTER (WHERE NOT d.delivered) = 0
   AND COUNT(*) >= 10
ORDER BY c.name;
```

If that list looks wrong, stop here — the `WHERE d.delivered` in the `JOIN` is deliberately
loose, so confirm you understand the result before enabling anything.

**Step 4b — apply, for one franchise only.**

```sql
BEGIN;

UPDATE customers c
SET auto_entry = true
WHERE c.franchise_id = '<FRANCHISE_UUID>'
  AND c.status = 'Active'
  AND NOT EXISTS (
    SELECT 1
    FROM deliveries d
    WHERE d.customer_id = c.id
      AND d.delivery_date > CURRENT_DATE - INTERVAL '14 days'
      AND NOT d.delivered
  )
  AND (
    SELECT COUNT(*)
    FROM deliveries d2
    WHERE d2.customer_id = c.id
      AND d2.delivery_date > CURRENT_DATE - INTERVAL '14 days'
  ) >= 10;

-- Sanity check before you COMMIT
SELECT COUNT(*) AS customers_now_enabled FROM customers WHERE auto_entry = true;

-- COMMIT;   ← only after the count above looks right
-- ROLLBACK; ← otherwise
```

**I recommend skipping this entirely** and enabling Auto Entry per customer through the UI.
The default is deliberately off, because a wrongly-enabled customer gets billed for milk they
never received.

---

## Rollback

Turning the feature off is instant and loses nothing — it just stops creating new auto rows:

```sql
UPDATE customers SET auto_entry = false WHERE auto_entry = true;
```

Dropping the columns is **not** required and **not** advised — existing `deliveries` rows carry
`auto_marked = true`, and dropping the column would discard that audit trail. Only drop if you
are certain no auto-marked rows remain:

```sql
-- Check first — expect 0
SELECT COUNT(*) FROM deliveries WHERE auto_marked = true;

ALTER TABLE deliveries DROP COLUMN IF EXISTS auto_marked;
ALTER TABLE customers DROP COLUMN IF EXISTS auto_entry;
```

---

## What this does *not* fix

Already-delivered rows are untouched. Turning Auto Entry on starts affecting **the next route
reset**, i.e. the next `checkAndRunAutomations()` run after you flip the toggle. It does not
retroactively mark today's already-created rows.

It also does not address the underlying issue with `calculate_delivery_cost()`, which prices
extras by name without scoping to `franchise_id` (finding P10 in the project analysis). Auto
rows are created with `misc_items = []`, so they're unaffected — but manual deliveries with
extras still are. That's a separate fix.
