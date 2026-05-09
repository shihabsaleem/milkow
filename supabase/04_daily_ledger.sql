-- ==========================================
-- MILKOW — 04_DAILY_LEDGER.SQL
-- Migration for Daily Accumulating Ledger
-- ==========================================

-- 1. Add total_cost column to deliveries
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS total_cost DECIMAL(10,2);

-- 2. Create the Trigger Function to calculate cost automatically
CREATE OR REPLACE FUNCTION calculate_delivery_cost()
RETURNS TRIGGER AS $$
DECLARE
    milk_price DECIMAL(10,2) := 0;
    total DECIMAL(10,2) := 0;
    misc_item JSONB;
    item_price DECIMAL(10,2);
BEGIN
    -- We calculate cost when delivered is TRUE and cost is not yet calculated
    IF (NEW.delivered = TRUE) THEN
        IF (NEW.total_cost IS NULL OR NEW.total_cost = 0) THEN
            -- Get milk price
            IF NEW.product_id IS NOT NULL THEN
                SELECT price INTO milk_price FROM products WHERE id = NEW.product_id;
            END IF;
            
            total := COALESCE(NEW.milk_qty, 0) * COALESCE(milk_price, 0);

            -- Get misc items price (if any)
            IF NEW.misc_items IS NOT NULL AND jsonb_typeof(NEW.misc_items) = 'array' THEN
                FOR misc_item IN SELECT * FROM jsonb_array_elements(NEW.misc_items)
                LOOP
                    SELECT price INTO item_price FROM products WHERE name = misc_item->>'name';
                    total := total + (CAST(misc_item->>'qty' AS INTEGER) * COALESCE(item_price, 0));
                END LOOP;
            END IF;
            
            NEW.total_cost := total;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Attach the Trigger
DROP TRIGGER IF EXISTS tr_calculate_delivery_cost ON deliveries;
CREATE TRIGGER tr_calculate_delivery_cost
BEFORE INSERT OR UPDATE ON deliveries
FOR EACH ROW EXECUTE FUNCTION calculate_delivery_cost();

-- 4. Update the View to dynamically calculate current_balance using unbilled total_cost
DROP VIEW IF EXISTS customer_financials;
CREATE VIEW customer_financials WITH (security_invoker = on) AS
WITH bill_summary AS (
    SELECT customer_id, COALESCE(SUM(amount), 0) AS total_billed_manual
    FROM bills
    GROUP BY customer_id
),
unbilled_deliveries AS (
    SELECT customer_id, COALESCE(SUM(total_cost), 0) AS total_unbilled
    FROM deliveries
    WHERE delivered = TRUE AND billed = FALSE
    GROUP BY customer_id
),
payment_summary AS (
    SELECT customer_id, COALESCE(SUM(amount), 0) AS total_paid
    FROM payments
    GROUP BY customer_id
)
SELECT
    c.id,
    c.name,
    c.area_id,
    c.past_outstanding,
    (COALESCE(bs.total_billed_manual, 0) + COALESCE(ud.total_unbilled, 0)) AS total_billed,
    COALESCE(ps.total_paid, 0)                                            AS total_paid,
    (c.past_outstanding + COALESCE(bs.total_billed_manual, 0) + COALESCE(ud.total_unbilled, 0) - COALESCE(ps.total_paid, 0)) AS current_balance,
    CASE
        WHEN (c.past_outstanding + COALESCE(bs.total_billed_manual, 0) + COALESCE(ud.total_unbilled, 0) - COALESCE(ps.total_paid, 0)) < 0
            THEN 'Advance'
        ELSE 'Credit'
    END AS account_status
FROM customers c
LEFT JOIN bill_summary    bs ON bs.customer_id = c.id
LEFT JOIN unbilled_deliveries ud ON ud.customer_id = c.id
LEFT JOIN payment_summary ps ON ps.customer_id = c.id;

-- 5. Backfill existing deliveries
-- A simple dummy update forces the new trigger to calculate total_cost for all past unbilled deliveries
UPDATE deliveries SET updated_at = NOW() WHERE delivered = TRUE AND total_cost IS NULL;
