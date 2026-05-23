-- ==========================================
-- MILKOW — 01_SCHEMA.SQL
-- Extensions, Types, Tables, Indexes,
-- Views, RLS & Policies
-- ==========================================


-- ─── EXTENSIONS ───────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ─── CUSTOM TYPES ─────────────────────────
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


-- ─── DATA INTEGRITY — ONE-TIME FIXES ──────
-- Run this block if any customer shows a negative (Advance) balance
-- caused by the old "Mark as Paid" bug (payment recorded without matching bills).
-- Safe to re-run: only removes settlement payments where total_paid > total_billed + past_outstanding.
--
-- DELETE FROM payments
-- WHERE id IN (
--   SELECT p.id
--   FROM payments p
--   JOIN customers c ON c.id = p.customer_id
--   LEFT JOIN (
--     SELECT customer_id, COALESCE(SUM(amount), 0) AS total_billed
--     FROM bills GROUP BY customer_id
--   ) b ON b.customer_id = c.id
--   LEFT JOIN (
--     SELECT customer_id, COALESCE(SUM(amount), 0) AS total_paid
--     FROM payments GROUP BY customer_id
--   ) py ON py.customer_id = c.id
--   WHERE (c.past_outstanding + COALESCE(b.total_billed, 0) - COALESCE(py.total_paid, 0)) < 0
--     AND p.notes IN ('Full Settlement from Billing', 'Full Settlement from Profile')
-- );
