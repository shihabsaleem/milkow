-- SUPABASE SCHEMA FOR MILKOW SYSTEM
-- Run this in your Supabase SQL Editor

-- 1. AUTH & PROFILES
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  name TEXT,
  pin TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. CUSTOMERS
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  area TEXT,
  frequency TEXT,
  status TEXT DEFAULT 'Active',
  outstanding NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. PRODUCTS
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  size TEXT,
  stock INTEGER DEFAULT 0,
  price TEXT -- Stored as string to match existing "₹90" format, though NUMERIC is better
);

-- 4. INVENTORY (Van Stock)
CREATE TABLE inventory (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name TEXT NOT NULL,
  vol TEXT,
  count INTEGER DEFAULT 0,
  unit TEXT,
  loaded INTEGER DEFAULT 0
);

-- 5. ACTIVE ROUTE (Daily Stops)
CREATE TABLE active_route (
  id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  sequence INTEGER,
  name TEXT,
  phone TEXT REFERENCES customers(phone) ON DELETE CASCADE,
  qty TEXT,
  delivered BOOLEAN DEFAULT false,
  extras JSONB DEFAULT '{}'::jsonb,
  inventory_deducted BOOLEAN DEFAULT false,
  shift TEXT DEFAULT 'morning',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 6. BILLS
CREATE TABLE bills (
  id TEXT PRIMARY KEY,
  customer_name TEXT,
  phone TEXT,
  type TEXT DEFAULT 'Daily',
  amount NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'Pending',
  date TEXT,
  date_label TEXT,
  qty INTEGER,
  details TEXT,
  auto_generated BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 7. AUTOMATION SETTINGS
CREATE TABLE system_settings (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- INITIAL SEED DATA FOR SYSTEM SETTINGS
INSERT INTO system_settings (key, value) VALUES 
('automation', '{"lastRouteReset": "", "lastBillGeneration": ""}'::jsonb),
('payment', '{"upi_id": "example@upi", "payee_name": "Milkow Admin", "currency_code": "INR"}'::jsonb);

-- ── ROW LEVEL SECURITY (RLS) ──
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_route ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- SIMPLE POLICIES (Allow authenticated users full access for now)
-- In production, refine these based on roles
CREATE POLICY "Full access for authenticated users" ON profiles FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON customers FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON products FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON inventory FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON active_route FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON bills FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Full access for authenticated users" ON system_settings FOR ALL USING (auth.role() = 'authenticated');
