-- ==========================================
-- MILKOW — RBAC MIGRATION SQL
-- Run this on an existing database to add
-- multi-tenant (franchise) and superadmin capabilities
-- ==========================================

-- 1. Create Franchises and User Roles
CREATE TABLE IF NOT EXISTS franchises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_type') THEN
        CREATE TYPE user_role_type AS ENUM ('superadmin', 'franchise');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS user_roles (
    user_id UUID PRIMARY KEY,
    role user_role_type NOT NULL DEFAULT 'franchise',
    franchise_id UUID REFERENCES franchises(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Ensure a default franchise exists for existing data
INSERT INTO franchises (id, name)
VALUES ('00000000-0000-1111-0000-00000000000', 'Default Franchise')
ON CONFLICT (id) DO NOTHING;

-- 2. Add franchise_id column to existing tables
ALTER TABLE areas ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE products ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE inventory ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE bills ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE payments ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';
ALTER TABLE system_settings ADD COLUMN IF NOT EXISTS franchise_id UUID REFERENCES franchises(id) ON DELETE CASCADE DEFAULT '00000000-0000-0000-0000-000000000000';

-- 3. Add multi-tenant unique constraints
ALTER TABLE areas DROP CONSTRAINT IF EXISTS areas_name_key;
ALTER TABLE areas ADD CONSTRAINT areas_name_franchise_id_key UNIQUE (name, franchise_id);

ALTER TABLE products DROP CONSTRAINT IF EXISTS products_name_key;
ALTER TABLE products ADD CONSTRAINT products_name_franchise_id_key UNIQUE (name, franchise_id);

ALTER TABLE system_settings DROP CONSTRAINT IF EXISTS system_settings_pkey;
ALTER TABLE system_settings ADD PRIMARY KEY (key, franchise_id);

-- 4. Recreate View to include franchise_id
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
    c.franchise_id,
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

-- 5. Enable Row Level Security (RLS)
ALTER TABLE franchises      ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE areas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE products        ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers       ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory       ENABLE ROW LEVEL SECURITY;
ALTER TABLE deliveries      ENABLE ROW LEVEL SECURITY;
ALTER TABLE bills           ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 6. Helper Functions for Policies
CREATE OR REPLACE FUNCTION get_user_role(usr_id UUID)
RETURNS user_role_type SECURITY DEFINER AS $$
  SELECT role FROM user_roles WHERE user_id = usr_id;
$$ LANGUAGE sql;

CREATE OR REPLACE FUNCTION get_user_franchise(usr_id UUID)
RETURNS UUID SECURITY DEFINER AS $$
  SELECT franchise_id FROM user_roles WHERE user_id = usr_id;
$$ LANGUAGE sql;

-- 7. Auto-heal: Ensure all products have an inventory pipeline record
INSERT INTO inventory (product_id, name, vol, count, loaded, unit, franchise_id)
SELECT id, name, size, stock, stock, COALESCE(unit, 'Bottles'), franchise_id
FROM products
WHERE id NOT IN (SELECT product_id FROM inventory WHERE product_id IS NOT NULL);

-- 8. Apply Policies
DROP POLICY IF EXISTS "Policy read franchises" ON franchises;
DROP POLICY IF EXISTS "Policy write franchises" ON franchises;
DROP POLICY IF EXISTS "Policy read user_roles" ON user_roles;
DROP POLICY IF EXISTS "Policy write user_roles" ON user_roles;
-- 9. Update Public Billing RPC for Multi-Tenancy
CREATE OR REPLACE FUNCTION get_full_customer_ledger_by_phone(phone_input text)
RETURNS jsonb
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_customer record;
  target_financials record;
  general_settings jsonb;
  bills_data jsonb;
  deliveries_data jsonb;
  unbilled_data jsonb;
  payments_data jsonb;
  products_data jsonb;
  result jsonb;
BEGIN
  -- 1. Find Customer
  SELECT c.*, a.name as area_name INTO target_customer
  FROM customers c
  LEFT JOIN areas a ON a.id = c.area_id
  WHERE c.phone = phone_input OR (length(phone_input) >= 10 AND c.phone LIKE '%' || right(phone_input, 10))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- 2. Find Financials
  SELECT * INTO target_financials FROM customer_financials WHERE id = target_customer.id;

  -- 3. Find Settings (Restricted to franchise)
  SELECT value INTO general_settings FROM system_settings WHERE key = 'general' AND franchise_id = target_customer.franchise_id;

  -- 4. Get Data
  SELECT jsonb_agg(row_to_json(b)) INTO bills_data FROM bills b WHERE customer_id = target_customer.id;
  SELECT jsonb_agg(row_to_json(d)) INTO deliveries_data FROM deliveries d WHERE customer_id = target_customer.id AND delivery_date >= date_trunc('month', CURRENT_DATE);
  SELECT jsonb_agg(row_to_json(u)) INTO unbilled_data FROM deliveries u WHERE customer_id = target_customer.id AND delivered = true AND billed = false;
  SELECT jsonb_agg(row_to_json(p)) INTO payments_data FROM payments p WHERE customer_id = target_customer.id;
  SELECT jsonb_agg(row_to_json(pr)) INTO products_data FROM products pr WHERE franchise_id = target_customer.franchise_id;

  -- Assemble Response
  result := jsonb_build_object(
    'customer', row_to_json(target_customer),
    'financials', row_to_json(target_financials),
    'settings', general_settings,
    'bills', COALESCE(bills_data, '[]'::jsonb),
    'deliveries', COALESCE(deliveries_data, '[]'::jsonb),
    'unbilled', COALESCE(unbilled_data, '[]'::jsonb),
    'payments', COALESCE(payments_data, '[]'::jsonb),
    'products', COALESCE(products_data, '[]'::jsonb)
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

DROP POLICY IF EXISTS "Admin access areas" ON areas;
DROP POLICY IF EXISTS "Admin access products" ON products;
DROP POLICY IF EXISTS "Admin access customers" ON customers;
DROP POLICY IF EXISTS "Admin access inventory" ON inventory;
DROP POLICY IF EXISTS "Admin access deliveries" ON deliveries;
DROP POLICY IF EXISTS "Admin access bills" ON bills;
DROP POLICY IF EXISTS "Admin access payments" ON payments;
DROP POLICY IF EXISTS "Admin access system_settings" ON system_settings;

CREATE POLICY "Policy read franchises" ON franchises FOR SELECT
  USING (get_user_role(auth.uid()) = 'superadmin' OR id = get_user_franchise(auth.uid()));
CREATE POLICY "Policy write franchises" ON franchises FOR ALL
  USING (get_user_role(auth.uid()) = 'superadmin')
  WITH CHECK (get_user_role(auth.uid()) = 'superadmin');

CREATE POLICY "Policy read user_roles" ON user_roles FOR SELECT
  USING (get_user_role(auth.uid()) = 'superadmin' OR user_id = auth.uid());
CREATE POLICY "Policy write user_roles" ON user_roles FOR ALL
  USING (get_user_role(auth.uid()) = 'superadmin')
  WITH CHECK (get_user_role(auth.uid()) = 'superadmin');

CREATE POLICY "Policy access areas" ON areas FOR ALL USING (
  get_user_role(auth.uid()) = 'superadmin' OR franchise_id = get_user_franchise(auth.uid())
) WITH CHECK (
  get_user_role(auth.uid()) = 'superadmin' OR franchise_id = get_user_franchise(auth.uid())
);

CREATE POLICY "Policy access products" ON products FOR ALL USING (
  get_user_role(auth.uid()) = 'superadmin' OR franchise_id = get_user_franchise(auth.uid())
) WITH CHECK (
  get_user_role(auth.uid()) = 'superadmin' OR franchise_id = get_user_franchise(auth.uid())
);

CREATE POLICY "Policy access customers" ON customers FOR ALL USING (
  get_user_role(auth.uid()) = 'superadmin' OR franchise_id = get_user_franchise(auth.uid())
) WITH CHECK (
  get_user_role(auth.uid()) = 'superadmin' OR franchise_id = get_user_franchise(auth.uid())
);

CREATE POLICY "Policy access inventory" ON inventory FOR ALL USING (
  get_user_role(auth.uid()) = 'superadmin' OR franchise_id = get_user_franchise(auth.uid())
) WITH CHECK (
  get_user_role(auth.uid()) = 'superadmin' OR franchise_id = get_user_franchise(auth.uid())
);

CREATE POLICY "Policy access deliveries" ON deliveries FOR ALL USING (
  get_user_role(auth.uid()) = 'superadmin' OR franchise_id = get_user_franchise(auth.uid())
) WITH CHECK (
  get_user_role(auth.uid()) = 'superadmin' OR franchise_id = get_user_franchise(auth.uid())
);

CREATE POLICY "Policy access bills" ON bills FOR ALL USING (
  get_user_role(auth.uid()) = 'superadmin' OR franchise_id = get_user_franchise(auth.uid())
) WITH CHECK (
  get_user_role(auth.uid()) = 'superadmin' OR franchise_id = get_user_franchise(auth.uid())
);

CREATE POLICY "Policy access payments" ON payments FOR ALL USING (
  get_user_role(auth.uid()) = 'superadmin' OR franchise_id = get_user_franchise(auth.uid())
) WITH CHECK (
  get_user_role(auth.uid()) = 'superadmin' OR franchise_id = get_user_franchise(auth.uid())
);

CREATE POLICY "Policy access system_settings" ON system_settings FOR ALL USING (
  get_user_role(auth.uid()) = 'superadmin' OR franchise_id = get_user_franchise(auth.uid())
) WITH CHECK (
  get_user_role(auth.uid()) = 'superadmin' OR franchise_id = get_user_franchise(auth.uid())
);

-- Note: The RPC for creating users has been removed since user creation is now handled natively via the secure Next.js API route using Supabase Admin Auth.
