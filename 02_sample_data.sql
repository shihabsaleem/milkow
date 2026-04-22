-- ==========================================
-- MILKOW COMPREHENSIVE SAMPLE DATA
-- ==========================================

-- Clean existing data (optional, but recommended for a fresh start)
-- TRUNCATE deliveries, bills, customers, areas, products, inventory RESTART IDENTITY CASCADE;

-- 1. SEED SYSTEM SETTINGS (MUST DO FIRST for profile settings)
INSERT INTO system_settings (key, value)
VALUES (
    'general', 
    '{"system_user": {"name": "Admin Sayas", "pin": "123456"}, "payment": {"upi_id": "9999999999@okbizaxis", "payee_name": "Milkow Fresh", "currency_code": "INR"}}'::jsonb
)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

INSERT INTO system_settings (key, value)
VALUES ('automation', '{"lastRouteReset": "", "lastBillGeneration": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- 2. SEED AREAS
INSERT INTO areas (name) VALUES 
('Downtown'),
('Uptown'),
('Midtown'),
('Suburbs')
ON CONFLICT (name) DO NOTHING;

-- 3. SEED PRODUCTS
INSERT INTO products (name, size, price, stock, unit) VALUES
('Fresh Cow Milk', '1L', 60.00, 100, 'Bottles'),
('Premium Buffalo Milk', '1L', 80.00, 50, 'Bottles'),
('Natural Curd', '500g', 45.00, 30, 'Packets'),
('Organic Ghee', '500ml', 650.00, 20, 'Jars'),
('Fresh Paneer', '200g', 110.00, 25, 'Packets')
ON CONFLICT DO NOTHING;

-- 4. SEED INVENTORY (Sync with Products)
DELETE FROM inventory; -- Reset inventory display
INSERT INTO inventory (name, vol, count, loaded, unit) VALUES
('Fresh Cow Milk', '1L Bottle', 100, 40, 'Bottles'),
('Buffalo Milk', '1L Bottle', 50, 20, 'Bottles'),
('Curd', '500g Pkt', 30, 10, 'Packets'),
('Ghee', '500ml Jar', 20, 5, 'Jars'),
('Paneer', '200g Pkt', 25, 5, 'Packets');

-- 5. SEED CUSTOMERS (Linking to Areas)
DO $$
DECLARE
    downtown_id INT := (SELECT id FROM areas WHERE name = 'Downtown' LIMIT 1);
    uptown_id INT := (SELECT id FROM areas WHERE name = 'Uptown' LIMIT 1);
    midtown_id INT := (SELECT id FROM areas WHERE name = 'Midtown' LIMIT 1);
BEGIN
    INSERT INTO customers (name, phone, area_id, frequency, status, route_sl_no, default_qty, past_outstanding) VALUES
    ('John Doe', '9876543210', downtown_id, 'Morning Only', 'Active', 1, 2, 120.00),
    ('Jane Smith', '9876543211', uptown_id, 'Morning & Evening', 'Active', 2, 1, 0.00),
    ('Alice Brown', '9876543212', midtown_id, 'Evening Only', 'Active', 3, 1, 45.00),
    ('Bob Wilson', '9876543213', downtown_id, 'Morning Only', 'Active', 4, 3, 0.00),
    ('Charlie Davis', '9876543214', uptown_id, 'Morning & Evening', 'Inactive', 5, 1, 0.00),
    ('Diana Evans', '9876543215', midtown_id, 'Morning Only', 'Active', 6, 2, 210.00)
    ON CONFLICT (phone) DO NOTHING;
END $$;

-- 6. SEED DELIVERIES (Last 2 days + Today)
DO $$
DECLARE
    cust1 UUID := (SELECT id FROM customers WHERE phone = '9876543210');
    cust2 UUID := (SELECT id FROM customers WHERE phone = '9876543211');
    cust3 UUID := (SELECT id FROM customers WHERE phone = '9876543212');
BEGIN
    -- Yesterday
    INSERT INTO deliveries (customer_id, delivery_date, shift, milk_qty, delivered, inventory_deducted) VALUES
    (cust1, CURRENT_DATE - 1, 'morning', 2, TRUE, TRUE),
    (cust2, CURRENT_DATE - 1, 'morning', 1, TRUE, TRUE),
    (cust2, CURRENT_DATE - 1, 'evening', 1, TRUE, TRUE),
    (cust3, CURRENT_DATE - 1, 'evening', 1, FALSE, FALSE);

    -- Today (Morning)
    INSERT INTO deliveries (customer_id, delivery_date, shift, milk_qty, delivered, inventory_deducted, misc_items) VALUES
    (cust1, CURRENT_DATE, 'morning', 2, TRUE, TRUE, '[{"name": "Natural Curd", "qty": 1}]'::jsonb),
    (cust2, CURRENT_DATE, 'morning', 1, TRUE, TRUE, '[]'::jsonb);

    -- Today (Evening - Pending)
    INSERT INTO deliveries (customer_id, delivery_date, shift, milk_qty, delivered, inventory_deducted) VALUES
    (cust2, CURRENT_DATE, 'evening', 1, FALSE, FALSE),
    (cust3, CURRENT_DATE, 'evening', 1, FALSE, FALSE);
END $$;

-- 7. SEED BILLS
DO $$
DECLARE
    cust1 UUID := (SELECT id FROM customers WHERE phone = '9876543210');
    cust6 UUID := (SELECT id FROM customers WHERE phone = '9876543215');
BEGIN
    INSERT INTO bills (customer_id, type, amount, status) VALUES
    (cust1, 'Monthly', 1200.00, 'Pending'),
    (cust6, 'Spot', 210.00, 'Paid');
END $$;
