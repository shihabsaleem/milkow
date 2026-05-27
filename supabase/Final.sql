-- Consolidated Supabase Schema and Triggers

-- ====================
-- 01_schema.sql content
-- ====================
-- ==========================================
-- MILKOW — 01_SCHEMA.SQL
-- Extensions, Types, Tables, Indexes,
-- Views, RLS & Policies
-- ==========================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'customer_status') THEN
        CREATE TYPE customer_status AS ENUM ('Active', 'Inactive');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'delivery_frequency') THEN
        CREATE TYPE delivery_frequency AS ENUM ('Morning Only', 'Evening Only', 'Morning & Evening');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'shift_type') THEN
        CREATE TYPE shift_type AS ENUM ('Morning Only', 'Evening Only');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_status') THEN
        CREATE TYPE bill_status AS ENUM ('Pending', 'Paid');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_type') THEN
        CREATE TYPE bill_type AS ENUM ('Weekly', 'Monthly', 'Spot', 'Opening Balance');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
        CREATE TYPE payment_method AS ENUM ('Cash', 'UPI', 'Bank Transfer', 'Other');
    END IF;
END $$;

-- ─── TABLES ───────────────────────────────

-- Areas: Master list of delivery regions
CREATE TABLE IF NOT EXISTS areas (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Products: All items sold (Milk, Ghee, etc.)
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    size TEXT,
    price DECIMAL(10, 2) NOT NULL,
    stock INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'Bottles',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Customers: Linked to areas, includes delivery preferences
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    area_id INTEGER,
    frequency delivery_frequency DEFAULT 'Morning Only',
    status customer_status DEFAULT 'Active',
    delivery_order DECIMAL(20, 10) DEFAULT 0,
    default_product_id UUID,
    default_qty INTEGER DEFAULT 1,
    past_outstanding DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT customers_area_id_fkey
        FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL,
    CONSTRAINT customers_default_product_id_fkey
        FOREIGN KEY (default_product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Inventory: Physical stock pipeline per product
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    product_id UUID,
    name TEXT NOT NULL,
    vol TEXT,
    count INTEGER DEFAULT 0,
    loaded INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'Bottles',
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT inventory_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Deliveries: Core daily delivery record
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift shift_type NOT NULL,
    product_id UUID,
    milk_qty INTEGER DEFAULT 0,
    misc_items JSONB DEFAULT '[]'::jsonb,
    delivered BOOLEAN DEFAULT FALSE,
    inventory_deducted BOOLEAN DEFAULT FALSE,
    billed BOOLEAN DEFAULT FALSE,
    sequence_no INTEGER,
    total_cost DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT deliveries_customer_id_fkey
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT deliveries_product_id_fkey
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT unique_customer_delivery
        UNIQUE (customer_id, delivery_date, shift)
);

-- Bills: Aggregated customer charges
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    type bill_type DEFAULT 'Monthly',
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status bill_status DEFAULT 'Pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT bills_customer_id_fkey
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

-- Payments: Individual cash / UPI collection events
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    bill_id UUID,
    amount DECIMAL(12, 2) NOT NULL,
    method payment_method DEFAULT 'Cash',
    payment_date TIMESTAMPTZ DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),

    CONSTRAINT payments_customer_id_fkey
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT payments_bill_id_fkey
        FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);

-- System Settings: Key-value config store
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- ─── INDEXES ──────────────────────────────
CREATE INDEX IF NOT EXISTS idx_customers_area_id       ON customers(area_id);
CREATE INDEX IF NOT EXISTS idx_customers_status        ON customers(status);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id    ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer_id  ON deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date         ON deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_bills_customer_id       ON bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_status            ON bills(status);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id    ON payments(customer_id);

-- ─── VIEWS ────────────────────────────────
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
LEFT JOIN bill_summary         bs ON bs.customer_id = c.id
LEFT JOIN unbilled_deliveries  ud ON ud.customer_id = c.id
LEFT JOIN payment_summary      ps ON ps.customer_id = c.id;

-- ─── ROW LEVEL SECURITY ───────────────────
ALTER TABLE areas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory       ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- ─── POLICIES ─────────────────────────────
-- Full access for authenticated users on all tables
DO $$
DECLARE
    t text;
BEGIN
    FOR t IN (
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Full access" ON %I', t);
        EXECUTE format(
            'CREATE POLICY "Full access" ON %I FOR ALL USING (auth.role() = ''authenticated'')', t
        );
    END LOOP;
END $$;

-- Additional fine‑grained RLS policies
-- Customers: owners can read/write their own rows
CREATE POLICY "Customer owner" ON customers
FOR ALL USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Deliveries: owners can read/write their own rows
CREATE POLICY "Delivery owner" ON deliveries
FOR ALL USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

-- Bills: owners can read/write their own rows
CREATE POLICY "Bill owner" ON bills
FOR ALL USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);

-- Payments: owners can read/write their own rows
CREATE POLICY "Payment owner" ON payments
FOR ALL USING (auth.uid() = customer_id)
WITH CHECK (auth.uid() = customer_id);


-- ─── DATA INTEGRITY — ONE-TIME FIXES ──────
-- (Optional integrity fix block – keep commented if not needed)

-- ─── RPC FUNCTIONS ────────────────────────
-- Public-facing bill retrieval by phone number
CREATE OR REPLACE FUNCTION get_customer_bill_by_phone(phone_input text)
RETURNS TABLE (
  customer_name text,
  phone text,
  area_name text,
  current_balance numeric,
  upi_id text,
  payee_name text,
  currency_code text
)
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  general_settings jsonb;
  pay_upi text := 'milkow@ybl';
  pay_name text := 'Milkow Distributor';
  pay_curr text := 'INR';
BEGIN
  SELECT value INTO general_settings FROM system_settings WHERE key = 'general';
  IF general_settings IS NOT NULL AND general_settings ? 'payment' THEN
    pay_upi := COALESCE((general_settings->'payment'->>'upi_id'), pay_upi);
    pay_name := COALESCE((general_settings->'payment'->>'payee_name'), pay_name);
    pay_curr := COALESCE((general_settings->'payment'->>'currency_code'), pay_curr);
  END IF;

  RETURN QUERY
  SELECT 
    cf.name::text AS customer_name,
    c.phone::text AS phone,
    COALESCE(a.name::text, 'No Area') AS area_name,
    cf.current_balance::numeric AS current_balance,
    pay_upi AS upi_id,
    pay_name AS payee_name,
    pay_curr AS currency_code
  FROM customer_financials cf
  JOIN customers c ON c.id = cf.id
  LEFT JOIN areas a ON a.id = cf.area_id
  WHERE c.phone = phone_input
     OR (length(phone_input) >= 10 AND c.phone LIKE '%' || right(phone_input, 10));
END;
$$ LANGUAGE plpgsql;

-- ====================
-- 02_triggers.sql content
-- ====================
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
    ELSE
        NEW.total_cost := 0;
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
INSERT INTO system_settings (key, value)
VALUES ('general', '{"payment":{"upi_id":"milkow@ybl","payee_name":"Milkow Distributor","currency_code":"INR"}}'::jsonb)
ON CONFLICT DO NOTHING;

