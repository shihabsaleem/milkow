-- ==========================================
-- MILKOW — 02_TRIGGERS.SQL
-- Consolidated Triggers: Audit & Business Logic
-- ==========================================

-- ─── 1. TRIGGER FUNCTIONS ─────────────────

-- Function: Auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-settle bills on payment
CREATE OR REPLACE FUNCTION handle_payment_settlement()
RETURNS TRIGGER AS $$
DECLARE
    rem_payment DECIMAL(12, 2);
    bill_rec RECORD;
BEGIN
    IF NEW.bill_id IS NOT NULL THEN
        UPDATE bills SET status = 'Paid' WHERE id = NEW.bill_id;
    ELSE
        rem_payment := NEW.amount;
        FOR bill_rec IN 
            SELECT id, amount FROM bills 
            WHERE customer_id = NEW.customer_id AND status = 'Pending' 
            ORDER BY created_at ASC
        LOOP
            IF rem_payment >= bill_rec.amount THEN
                UPDATE bills SET status = 'Paid' WHERE id = bill_rec.id;
                rem_payment := rem_payment - bill_rec.amount;
            ELSE
                EXIT;
            END IF;
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- NOTE: handle_inventory_deduction() trigger was REMOVED.
-- Inventory deductions are now handled client-side by
-- syncBatchDeliveries() in lib/automation.ts to support
-- offline-first batch sync and avoid double-deduction.

-- Function: Sync product to inventory
CREATE OR REPLACE FUNCTION sync_product_to_inventory()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE inventory SET name = NEW.name, vol = NEW.size, count = NEW.stock, unit = NEW.unit WHERE product_id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-calculate delivery cost on insert/update
CREATE OR REPLACE FUNCTION calculate_delivery_cost()
RETURNS TRIGGER AS $$
DECLARE
    milk_price DECIMAL(10,2) := 0;
    total DECIMAL(10,2) := 0;
    misc_item JSONB;
    item_price DECIMAL(10,2);
BEGIN
    IF (NEW.delivered = TRUE) THEN
        IF (NEW.total_cost IS NULL OR NEW.total_cost = 0) THEN
            IF NEW.product_id IS NOT NULL THEN
                SELECT price INTO milk_price FROM products WHERE id = NEW.product_id;
            END IF;

            total := COALESCE(NEW.milk_qty, 0) * COALESCE(milk_price, 0);

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


-- ─── 2. ATTACH TRIGGERS ───────────────────

-- Audit: updated_at (Only for core tables to reduce clutter)
-- Tables: customers, deliveries, bills, payments, products
DROP TRIGGER IF EXISTS tr_update_cust_at ON customers;
CREATE TRIGGER tr_update_cust_at BEFORE UPDATE ON customers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_del_at ON deliveries;
CREATE TRIGGER tr_update_del_at BEFORE UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_bill_at ON bills;
CREATE TRIGGER tr_update_bill_at BEFORE UPDATE ON bills FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_pay_at ON payments;
CREATE TRIGGER tr_update_pay_at BEFORE UPDATE ON payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS tr_update_prod_at ON products;
CREATE TRIGGER tr_update_prod_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Business Logic: Settlement, Product Sync & Cost Calculation
DROP TRIGGER IF EXISTS tr_payment_settlement ON payments;
CREATE TRIGGER tr_payment_settlement AFTER INSERT ON payments FOR EACH ROW EXECUTE FUNCTION handle_payment_settlement();

-- NOTE: tr_inventory_deduction intentionally NOT created.
-- Inventory deductions are handled client-side by syncBatchDeliveries().
DROP TRIGGER IF EXISTS tr_inventory_deduction ON deliveries;

DROP TRIGGER IF EXISTS tr_product_inventory_sync ON products;
CREATE TRIGGER tr_product_inventory_sync AFTER UPDATE ON products FOR EACH ROW EXECUTE FUNCTION sync_product_to_inventory();

DROP TRIGGER IF EXISTS tr_calculate_delivery_cost ON deliveries;
CREATE TRIGGER tr_calculate_delivery_cost BEFORE INSERT OR UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION calculate_delivery_cost();

