-- ==========================================
-- MILKOW FULL SYSTEM SCHEMA (SUPABASE)
-- V4 (Enhanced Atomicity & Consistency)
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
        CREATE TYPE shift_type AS ENUM ('morning', 'evening');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_status') THEN
        CREATE TYPE bill_status AS ENUM ('Pending', 'Paid');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'bill_type') THEN
        CREATE TYPE bill_type AS ENUM ('Weekly', 'Monthly', 'Spot');
    END IF;
END $$;

-- 2. CREATE TABLES

-- Areas: Master list of delivery regions
CREATE TABLE IF NOT EXISTS areas (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Customers: Linked to areas, ensures phone uniqueness
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    area_id INTEGER REFERENCES areas(id) ON DELETE SET NULL,
    frequency delivery_frequency DEFAULT 'Morning Only',
    status customer_status DEFAULT 'Active',
    route_sl_no INTEGER,
    default_qty INTEGER DEFAULT 1,
    past_outstanding DECIMAL(12, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_customers_area_id ON customers(area_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);

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

-- Inventory: Tracking physical stock/loading, linked to products
CREATE TABLE IF NOT EXISTS inventory (
    id SERIAL PRIMARY KEY,
    product_id UUID REFERENCES products(id) ON DELETE SET NULL,
    name TEXT NOT NULL, -- Redundant but kept for app compatibility
    vol TEXT,
    count INTEGER DEFAULT 0, -- Current physical stock
    loaded INTEGER DEFAULT 0, -- Stock loaded into delivery vehicle
    unit TEXT DEFAULT 'Bottles',
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);

-- Deliveries: Core transaction table
CREATE TABLE IF NOT EXISTS deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
    shift shift_type NOT NULL,
    milk_qty INTEGER DEFAULT 0,
    misc_items JSONB DEFAULT '[]'::jsonb, -- Legacy JSON support
    delivered BOOLEAN DEFAULT FALSE,
    inventory_deducted BOOLEAN DEFAULT FALSE,
    sequence_no INTEGER,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    -- Consistency: Prevent duplicate deliveries for same customer/shift/day
    UNIQUE(customer_id, delivery_date, shift)
);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer_id ON deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_deliveries_composite_lookup ON deliveries(delivery_date, shift);

-- Delivery Items: Normalized items for each delivery (Atomicity & Integrity)
CREATE TABLE IF NOT EXISTS delivery_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10, 2) NOT NULL, -- Snapshot price at time of delivery
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery_id ON delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_delivery_items_product_id ON delivery_items(product_id);

-- Bills: Aggregated charges for customers
CREATE TABLE IF NOT EXISTS bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    type bill_type DEFAULT 'Monthly',
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    status bill_status DEFAULT 'Pending',
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMPTZ DEFAULT now(),
    paid_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);

-- Bill Deliveries: Linking table to track which deliveries are covered by which bill
CREATE TABLE IF NOT EXISTS bill_deliveries (
    bill_id UUID NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
    delivery_id UUID NOT NULL REFERENCES deliveries(id) ON DELETE CASCADE,
    PRIMARY KEY (bill_id, delivery_id)
);

-- System Settings: Global configurations
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. UPDATED_AT TRIGGERS
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

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE bill_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- ALLOW ALL FOR AUTHENTICATED USERS
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public') LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Full access" ON %I', t);
        EXECUTE format('CREATE POLICY "Full access" ON %I FOR ALL USING (auth.role() = ''authenticated'')', t);
    END LOOP;
END $$;
