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

-- Function: Auto-deduct inventory on delivery
CREATE OR REPLACE FUNCTION handle_inventory_deduction()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.delivered = TRUE AND (OLD.delivered = FALSE OR OLD.delivered IS NULL)) THEN
        IF (NEW.inventory_deducted = FALSE) THEN
            UPDATE products SET stock = GREATEST(0, stock - NEW.milk_qty) WHERE id = NEW.product_id;
            UPDATE inventory SET count = GREATEST(0, count - NEW.milk_qty), loaded = GREATEST(0, loaded - NEW.milk_qty) WHERE product_id = NEW.product_id;
            NEW.inventory_deducted := TRUE;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Sync product to inventory
CREATE OR REPLACE FUNCTION sync_product_to_inventory()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE inventory SET name = NEW.name, vol = NEW.size, count = NEW.stock, unit = NEW.unit WHERE product_id = NEW.id;
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


-- Business Logic: Settlement & Inventory
DROP TRIGGER IF EXISTS tr_payment_settlement ON payments;
CREATE TRIGGER tr_payment_settlement AFTER INSERT ON payments FOR EACH ROW EXECUTE FUNCTION handle_payment_settlement();

DROP TRIGGER IF EXISTS tr_inventory_deduction ON deliveries;
CREATE TRIGGER tr_inventory_deduction BEFORE UPDATE ON deliveries FOR EACH ROW EXECUTE FUNCTION handle_inventory_deduction();

DROP TRIGGER IF EXISTS tr_product_inventory_sync ON products;
CREATE TRIGGER tr_product_inventory_sync AFTER UPDATE ON products FOR EACH ROW EXECUTE FUNCTION sync_product_to_inventory();
