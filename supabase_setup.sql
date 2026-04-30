-- ==========================================
-- MILKOW FULL SYSTEM SETUP (SUPABASE)
-- V7 (Refined Billing & Multi-Shift)
-- ==========================================

-- ##########################################
-- 1. DB TABLE DESIGN
-- ##########################################

-- SETUP EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CREATE CUSTOM TYPES
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

-- CREATE SEQUENCES
CREATE SEQUENCE IF NOT EXISTS cust_id_seq START 1001;

-- CREATE TABLES

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

-- Customers: Linked to areas, includes delivery preferences
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cust_id TEXT UNIQUE DEFAULT 'MILKOW' || nextval('cust_id_seq'),
    name TEXT NOT NULL,
    phone TEXT UNIQUE,
    area_id INTEGER,
    frequency delivery_frequency DEFAULT 'Morning Only',
    status customer_status DEFAULT 'Active',
    delivery_order DECIMAL(20, 10) DEFAULT 0,
    default_product_id UUID,
    default_qty INTEGER DEFAULT 1,
    past_outstanding DECIMAL(12, 2) DEFAULT 0.00,
    address TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT customers_area_id_fkey FOREIGN KEY (area_id) REFERENCES areas(id) ON DELETE SET NULL,
    CONSTRAINT customers_default_product_id_fkey FOREIGN KEY (default_product_id) REFERENCES products(id) ON DELETE SET NULL
);

-- Inventory: Tracking physical stock/loading
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

-- Deliveries: Core transaction header
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
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    
    CONSTRAINT deliveries_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
    CONSTRAINT deliveries_product_id_fkey FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
    CONSTRAINT unique_customer_delivery UNIQUE (customer_id, delivery_date, shift)
);

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

-- Bills: Aggregated charges
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

-- Bill Deliveries: Junction table
CREATE TABLE IF NOT EXISTS bill_deliveries (
    bill_id UUID NOT NULL,
    delivery_id UUID NOT NULL,
    PRIMARY KEY (bill_id, delivery_id),
    CONSTRAINT bill_deliveries_bill_id_fkey FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
    CONSTRAINT bill_deliveries_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES deliveries(id) ON DELETE CASCADE
);

-- Payments: Individual collection events
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL,
    bill_id UUID,
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

-- System Settings: Global configurations
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_customers_area_id ON customers(area_id);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_customer_id ON deliveries(customer_id);
CREATE INDEX IF NOT EXISTS idx_deliveries_date ON deliveries(delivery_date);
CREATE INDEX IF NOT EXISTS idx_delivery_items_delivery_id ON delivery_items(delivery_id);
CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_status ON bills(status);
CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments(customer_id);

-- VIEWS
DROP VIEW IF EXISTS customer_financials;
CREATE VIEW customer_financials WITH (security_invoker = on) AS
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

-- ROW LEVEL SECURITY (RLS)
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

-- POLICIES
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Full access" ON %I', t);
        EXECUTE format('CREATE POLICY "Full access" ON %I FOR ALL USING (auth.role() = ''authenticated'')', t);
    END LOOP;
END $$;


-- ##########################################
-- 2. TRIGGERS
-- ##########################################

-- UPDATED_AT TRIGGER FUNCTION
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ATTACH UPDATED_AT TRIGGERS
DO $$ 
DECLARE 
    t text;
BEGIN
    FOR t IN (SELECT table_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name = 'updated_at') LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS tr_update_updated_at ON %I', t);
        EXECUTE format('CREATE TRIGGER tr_update_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()', t);
    END LOOP;
END $$;


-- ##########################################
-- 3. DUMMY DATA
-- ##########################################

-- CLEAR DATA
TRUNCATE bill_deliveries, delivery_items, payments, bills, deliveries, inventory, customers, products, areas CASCADE;

-- INSERT AREAS
INSERT INTO areas (name) VALUES 
('North Sector'), 
('Downtown Hub'), 
('Green Valley'), 
('South Ridge'), 
('Palm Estates'),
('Riverside Walk');

-- INSERT PRODUCTS
INSERT INTO products (name, size, price, stock, unit) VALUES 
('Raw Buffalo Milk', '1L', 72.00, 200, 'Bottles'),
('Pure Cow Milk', '1L', 64.00, 250, 'Bottles'),
('Fresh Curd', '500g', 50.00, 100, 'Packets'),
('Artisan Ghee', '500g', 550.00, 40, 'Items'),
('Farm Paneer', '200g', 140.00, 60, 'Packets'),
('Greek Yogurt', '200g', 85.00, 30, 'Packets');

-- SYNC INVENTORY
INSERT INTO inventory (product_id, name, vol, count, loaded, unit)
SELECT id, name, size, stock, stock - 20, unit FROM products;

-- INSERT CUSTOMERS
DO $$ 
DECLARE 
    north_id INTEGER := (SELECT id FROM areas WHERE name = 'North Sector' LIMIT 1);
    green_id INTEGER := (SELECT id FROM areas WHERE name = 'Green Valley' LIMIT 1);
    palm_id INTEGER := (SELECT id FROM areas WHERE name = 'Palm Estates' LIMIT 1);
    river_id INTEGER := (SELECT id FROM areas WHERE name = 'Riverside Walk' LIMIT 1);
    down_id INTEGER := (SELECT id FROM areas WHERE name = 'Downtown Hub' LIMIT 1);
    
    buffalo_id UUID := (SELECT id FROM products WHERE name = 'Raw Buffalo Milk' LIMIT 1);
    cow_id UUID := (SELECT id FROM products WHERE name = 'Pure Cow Milk' LIMIT 1);
BEGIN
    INSERT INTO customers (name, phone, area_id, frequency, default_product_id, default_qty, past_outstanding, delivery_order)
    VALUES 
    ('Sayas Rahman', '9876543210', north_id, 'Morning Only', buffalo_id, 2, 0.00, 10.0),
    ('Adnan Sami', '9123456789', north_id, 'Morning & Evening', cow_id, 1, 450.00, 20.0),
    ('Fatima Begum', '9223344556', green_id, 'Morning Only', buffalo_id, 1, -300.00, 15.0),
    ('Rahul Khanna', '9988776655', palm_id, 'Evening Only', cow_id, 3, 0.00, 30.0),
    ('Priya Sharma', '9898989898', river_id, 'Morning Only', buffalo_id, 2, 120.00, 5.0),
    ('Vikram Singh', '9797979797', down_id, 'Morning Only', cow_id, 2, 0.00, 40.0),
    ('Zoya Khan', '9696969696', palm_id, 'Morning & Evening', buffalo_id, 1, 0.00, 25.0),
    ('Arjun Kapoor', '9595959595', green_id, 'Evening Only', cow_id, 2, 0.00, 12.0),
    ('Meera Nair', '9494949494', north_id, 'Morning Only', buffalo_id, 3, -150.00, 8.0),
    ('Siddharth Malhotra', '9393939393', river_id, 'Morning Only', cow_id, 1, 0.00, 35.0);
END $$;

-- INSERT SYSTEM SETTINGS
INSERT INTO system_settings (key, value) VALUES 
('general', '{"system_user": {"name": "Milkow Operations"}, "payment": {"upi_id": "milkow.biz@upi", "payee_name": "Milkow Dairy Farm", "currency_code": "INR"}}'::jsonb),
('daily_prices', jsonb_build_object(CURRENT_DATE::text, (SELECT jsonb_object_agg(name, price) FROM products)));

-- INSERT TRANSACTIONS (7 DAYS HISTORY)
DO $$ 
DECLARE 
    cust_record RECORD;
    prod_record RECORD;
    paneer_id UUID := (SELECT id FROM products WHERE name = 'Farm Paneer' LIMIT 1);
    curd_id UUID := (SELECT id FROM products WHERE name = 'Fresh Curd' LIMIT 1);
    del_id UUID;
    bill_id UUID;
    total_bill_amount DECIMAL(12, 2);
    d DATE;
    s shift_type;
BEGIN
    -- Loop through last 7 days
    FOR i IN 1..7 LOOP
        d := CURRENT_DATE - (i * INTERVAL '1 day');
        
        FOR cust_record IN SELECT id, name, frequency, default_product_id, default_qty FROM customers LOOP
            -- Determine shifts for this customer
            FOR s IN SELECT unnest(CASE 
                        WHEN cust_record.frequency = 'Morning Only' THEN ARRAY['Morning Only']::shift_type[]
                        WHEN cust_record.frequency = 'Evening Only' THEN ARRAY['Evening Only']::shift_type[]
                        ELSE ARRAY['Morning Only', 'Evening Only']::shift_type[]
                      END) LOOP
                
                -- Create Delivery
                INSERT INTO deliveries (customer_id, product_id, milk_qty, shift, delivery_date, delivered)
                VALUES (cust_record.id, cust_record.default_product_id, cust_record.default_qty, s, d, TRUE)
                RETURNING id INTO del_id;

                -- Insert Main Item
                INSERT INTO delivery_items (delivery_id, product_id, quantity, unit_price)
                VALUES (del_id, cust_record.default_product_id, cust_record.default_qty, (SELECT price FROM products WHERE id = cust_record.default_product_id));

                -- Add occasional misc items (Paneer or Curd)
                IF (random() > 0.8) THEN
                    INSERT INTO delivery_items (delivery_id, product_id, quantity, unit_price)
                    VALUES (del_id, paneer_id, 1, (SELECT price FROM products WHERE id = paneer_id));
                END IF;
                
                IF (random() > 0.9) THEN
                    INSERT INTO delivery_items (delivery_id, product_id, quantity, unit_price)
                    VALUES (del_id, curd_id, 2, (SELECT price FROM products WHERE id = curd_id));
                END IF;

                -- Calculate total for billing
                SELECT SUM(quantity * unit_price) INTO total_bill_amount FROM delivery_items WHERE delivery_id = del_id;

                -- Create a bill (Weekly/Spot mix)
                INSERT INTO bills (customer_id, type, amount, status, start_date, end_date, notes)
                VALUES (cust_record.id, 'Spot', total_bill_amount, 'Pending', d, d, 'Daily Log')
                RETURNING id INTO bill_id;

                INSERT INTO bill_deliveries (bill_id, delivery_id) VALUES (bill_id, del_id);
                UPDATE deliveries SET billed = TRUE WHERE id = del_id;
                
                -- Randomly mark some bills as Paid (70% probability)
                IF (random() > 0.3) THEN
                    UPDATE bills SET status = 'Paid', paid_at = now() - (random() * INTERVAL '12 hours') WHERE id = bill_id;
                    
                    INSERT INTO payments (customer_id, bill_id, amount, method, payment_date)
                    VALUES (cust_record.id, bill_id, total_bill_amount, 'UPI', now() - (random() * INTERVAL '12 hours'));
                END IF;
            END LOOP;
        END LOOP;
    END LOOP;
    
    -- Add some today's pending deliveries (not delivered yet)
    FOR cust_record IN SELECT id, name, frequency, default_product_id, default_qty FROM customers LOOP
        IF cust_record.frequency IN ('Morning Only', 'Morning & Evening') THEN
            INSERT INTO deliveries (customer_id, product_id, milk_qty, shift, delivery_date, delivered)
            VALUES (cust_record.id, cust_record.default_product_id, cust_record.default_qty, 'Morning Only', CURRENT_DATE, FALSE);
        END IF;
    END LOOP;

END $$;
