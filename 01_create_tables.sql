-- ==========================================
-- MILKOW FULL SYSTEM SCHEMA (SUPABASE)
-- V6 (Production Ready - Payments Tracking & Customer Details)
-- ==========================================

-- 1. SETUP EXTENSIONS & TYPES
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

-- 2. CREATE SEQUENCES
CREATE SEQUENCE IF NOT EXISTS cust_id_seq START 1001;

-- 3. CREATE TABLES

-- Areas: Master list of delivery regions
CREATE TABLE IF NOT EXISTS areas (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Products: Master list of all items (Milk, Ghee, etc.)
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

-- Customers: Linked to areas, includes delivery preferences and fractional ordering
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cust_id TEXT UNIQUE DEFAULT 'MILKOW' || nextval('cust_id_seq'),
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    area_id INTEGER,
    frequency delivery_frequency DEFAULT 'Morning Only',
    status customer_status DEFAULT 'Active',
    delivery_order DECIMAL(20, 10) DEFAULT 0, -- Decimal Midpoint Indexing
    default_product_id UUID,
    default_qty INTEGER DEFAULT 1,
    past_outstanding DECIMAL(12, 2) DEFAULT 0.00, -- Positive = Debt, Negative = Advance/Credit
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT customers_area_id_fkey FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL,
    CONSTRAINT customers_default_product_id_fkey FOREIGN KEY (default_product_id) REFERENCES products(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_customers_area_id ON customers(area_id);
CREATE INDEX IF NOT EXISTS idx_customers_default_product_id ON customers(default_product_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_delivery_order ON customers(delivery_order);

-- Inventory: Tracking physical stock/loading, linked to products
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    product_id UUID,
    name TEXT NOT NULL,
    vol TEXT,
    count INTEGER DEFAULT 0,
    loaded INTEGER DEFAULT 0,
    unit TEXT DEFAULT 'Bottles',
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT inventory_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);

-- Deliveries: Core transaction table (Header)
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift shift_type NOT NULL,
    product_id UUID, -- Legacy/Quick access to primary product
    milk_qty INTEGER DEFAULT 0,
    misc_items JSONB DEFAULT '[]'::jsonb, -- Kept for migration/flexibility
    delivered BOOLEAN DEFAULT FALSE,
    inventory_deducted BOOLEAN DEFAULT FALSE,
    billed BOOLEAN DEFAULT FALSE,
    sequence_no INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT deliveries_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT deliveries_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT unique_customer_delivery UNIQUE (customer_id, delivery_date, shift)
);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer_id ON deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_product_id ON deliveries(product_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_composite_lookup ON deliveries(delivery_date, shift);

-- Delivery Items: Normalized items per delivery
CREATE TABLE IF NOT EXISTS delivery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL,
    product_id UUID NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2),
    created_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT delivery_items_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE,
    CONSTRAINT delivery_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery_id ON delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_product_id ON delivery_items(product_id);

-- Bills: Aggregated charges for customers
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    type bill_type DEFAULT 'Monthly',
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status bill_status DEFAULT 'Pending',
    start_date DATE,
    end_date DATE,
    transaction_id TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    paid_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT bills_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);

-- Bill Deliveries: Junction table linking deliveries to specific bills
CREATE TABLE IF NOT EXISTS bill_deliveries (
    bill_id UUID NOT NULL,
    delivery_id UUID NOT NULL,
    PRIMARY KEY (bill_id, delivery_id),
    CONSTRAINT bill_deliveries_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    CONSTRAINT bill_deliveries_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE
);

-- Payments: Tracking individual collection events
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    bill_id UUID, -- Nullable to support advance payments not yet tied to a bill
    amount DECIMAL(12, 2) NOT NULL,
    method payment_method DEFAULT 'Cash',
    transaction_ref TEXT,
    payment_date TIMESTAMPTZ DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT payments_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_bill_id ON payments(bill_id);

-- System Settings: Global configurations
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. VIEWS
CREATE OR REPLACE VIEW customer_financials AS
WITH bill_summary AS (
    SELECT customer_id, COALESCE(SUM(amount), 0) as total_billed
    FROM bills
    GROUP BY customer_id
),
payment_summary AS (
    SELECT customer_id, COALESCE(SUM(amount), 0) as total_paid
    FROM payments
    GROUP BY customer_id
)
SELECT 
    c.id,
    c.name,
    c.past_outstanding,
    COALESCE(bs.total_billed, 0) AS total_billed,
    COALESCE(ps.total_paid, 0) AS total_paid,
    (c.past_outstanding + COALESCE(bs.total_billed, 0) - COALESCE(ps.total_paid, 0)) AS current_balance,
    CASE 
        WHEN (c.past_outstanding + COALESCE(bs.total_billed, 0) - COALESCE(ps.total_paid, 0)) < 0 THEN 'Advance'
        ELSE 'Credit'
    END AS account_status
FROM customers c
LEFT JOIN bill_summary bs ON bs.customer_id = c.id
LEFT JOIN payment_summary ps ON ps.customer_id = c.id;

-- 5. UPDATED_AT TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'updated_at') LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_update_updated_at ON %I', t);
        EXECUTE format('CREATE TRIGGER tr_update_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
    END LOOP;
END $$;

-- 6. ROW LEVEL SECURITY (RLS)
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- ALLOW ALL FOR AUTHENTICATED USERS (Simple internal app policy)
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Full access" ON %I', t);
        EXECUTE format('CREATE POLICY "Full access" ON %I FOR ALL USING (auth.role() = ''authenticated'')', t);
    END LOOP;
END $$;

