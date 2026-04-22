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
('Indiranagar'),
('Koramangala'),
('Whitefield'),
('Jayanagar'),
('HSR Layout')
ON CONFLICT (name) DO NOTHING;

-- 3. SEED PRODUCTS
INSERT INTO products (name, size, price, stock, unit) VALUES
('A2 Cow Milk', '1L', 65.00, 150, 'Bottles'),
('Buffalo Milk', '1L', 80.00, 80, 'Bottles'),
('Malai Dahi', '500g', 50.00, 40, 'Packets'),
('Desi Cow Ghee', '500ml', 750.00, 25, 'Jars'),
('Fresh Malai Paneer', '200g', 120.00, 30, 'Packets'),
('Spiced Buttermilk', '200ml', 15.00, 100, 'Bottles')
ON CONFLICT DO NOTHING;

-- 4. SEED INVENTORY (Sync with Products)
DELETE FROM inventory; -- Reset inventory display
INSERT INTO inventory (name, vol, count, loaded, unit) VALUES
('A2 Cow Milk', '1L Bottle', 150, 60, 'Bottles'),
('Buffalo Milk', '1L Bottle', 80, 30, 'Bottles'),
('Malai Dahi', '500g Pkt', 40, 15, 'Packets'),
('Desi Cow Ghee', '500ml Jar', 25, 5, 'Jars'),
('Fresh Malai Paneer', '200g Pkt', 30, 10, 'Packets'),
('Spiced Buttermilk', '200ml Btl', 100, 20, 'Bottles');

-- 5. SEED CUSTOMERS (Linking to Areas)
DO $$
DECLARE
    indira_id INT := (SELECT id FROM areas WHERE name = 'Indiranagar' LIMIT 1);
    kora_id INT := (SELECT id FROM areas WHERE name = 'Koramangala' LIMIT 1);
    white_id INT := (SELECT id FROM areas WHERE name = 'Whitefield' LIMIT 1);
    jaya_id INT := (SELECT id FROM areas WHERE name = 'Jayanagar' LIMIT 1);
    hsr_id INT := (SELECT id FROM areas WHERE name = 'HSR Layout' LIMIT 1);
BEGIN
    INSERT INTO customers (name, phone, area_id, frequency, status, route_sl_no, default_qty, past_outstanding) VALUES
    ('Rahul Sharma', '9876500001', indira_id, 'Morning Only', 'Active', 1, 2, 450.00),
    ('Priya Patel', '9876500002', kora_id, 'Morning & Evening', 'Active', 1, 1, 0.00),
    ('Amit Singh', '9876500003', white_id, 'Evening Only', 'Active', 1, 1, 120.00),
    ('Sneha Reddy', '9876500004', jaya_id, 'Morning Only', 'Active', 1, 3, 0.00),
    ('Vikram Rao', '9876500005', hsr_id, 'Morning & Evening', 'Inactive', 1, 2, 850.00),
    ('Anjali Desai', '9876500006', indira_id, 'Morning Only', 'Active', 2, 1, 0.00),
    ('Rohan Gupta', '9876500007', kora_id, 'Evening Only', 'Active', 2, 2, 340.00),
    ('Neha Kumar', '9876500008', white_id, 'Morning & Evening', 'Active', 2, 1, 0.00),
    ('Arjun Verma', '9876500009', jaya_id, 'Morning Only', 'Active', 2, 4, 1500.00),
    ('Kavita Joshi', '9876500010', hsr_id, 'Evening Only', 'Active', 2, 1, 65.00)
    ON CONFLICT (phone) DO NOTHING;
END $$;

-- 6. SEED DELIVERIES (Last 3 days + Today)
DO $$
DECLARE
    cust1 UUID := (SELECT id FROM customers WHERE phone = '9876500001'); -- Rahul (Morn)
    cust2 UUID := (SELECT id FROM customers WHERE phone = '9876500002'); -- Priya (Morn & Eve)
    cust3 UUID := (SELECT id FROM customers WHERE phone = '9876500003'); -- Amit (Eve)
    cust6 UUID := (SELECT id FROM customers WHERE phone = '9876500006'); -- Anjali (Morn)
    cust8 UUID := (SELECT id FROM customers WHERE phone = '9876500008'); -- Neha (Morn & Eve)
BEGIN
    -- 3 Days Ago
    INSERT INTO deliveries (customer_id, delivery_date, shift, milk_qty, delivered, inventory_deducted) VALUES
    (cust1, CURRENT_DATE - 3, 'morning', 2, TRUE, TRUE),
    (cust2, CURRENT_DATE - 3, 'morning', 1, TRUE, TRUE),
    (cust2, CURRENT_DATE - 3, 'evening', 1, TRUE, TRUE),
    (cust3, CURRENT_DATE - 3, 'evening', 1, TRUE, TRUE);

    -- 2 Days Ago
    INSERT INTO deliveries (customer_id, delivery_date, shift, milk_qty, delivered, inventory_deducted, misc_items) VALUES
    (cust1, CURRENT_DATE - 2, 'morning', 2, TRUE, TRUE, '[{"name": "Fresh Malai Paneer", "qty": 1}]'::jsonb),
    (cust2, CURRENT_DATE - 2, 'morning', 1, TRUE, TRUE, '[]'::jsonb),
    (cust6, CURRENT_DATE - 2, 'morning', 1, TRUE, TRUE, '[]'::jsonb),
    (cust2, CURRENT_DATE - 2, 'evening', 1, TRUE, TRUE, '[]'::jsonb),
    (cust3, CURRENT_DATE - 2, 'evening', 1, TRUE, TRUE, '[]'::jsonb);

    -- Yesterday
    INSERT INTO deliveries (customer_id, delivery_date, shift, milk_qty, delivered, inventory_deducted, misc_items) VALUES
    (cust1, CURRENT_DATE - 1, 'morning', 2, TRUE, TRUE, '[]'::jsonb),
    (cust2, CURRENT_DATE - 1, 'morning', 1, TRUE, TRUE, '[]'::jsonb),
    (cust6, CURRENT_DATE - 1, 'morning', 1, FALSE, FALSE, '[]'::jsonb),
    (cust8, CURRENT_DATE - 1, 'morning', 1, TRUE, TRUE, '[{"name": "Malai Dahi", "qty": 2}]'::jsonb),
    (cust2, CURRENT_DATE - 1, 'evening', 1, TRUE, TRUE, '[]'::jsonb),
    (cust3, CURRENT_DATE - 1, 'evening', 1, FALSE, FALSE, '[]'::jsonb);

    -- Today (Morning - Completed)
    INSERT INTO deliveries (customer_id, delivery_date, shift, milk_qty, delivered, inventory_deducted, misc_items) VALUES
    (cust1, CURRENT_DATE, 'morning', 2, TRUE, TRUE, '[{"name": "Desi Cow Ghee", "qty": 1}]'::jsonb),
    (cust2, CURRENT_DATE, 'morning', 1, TRUE, TRUE, '[]'::jsonb),
    (cust6, CURRENT_DATE, 'morning', 1, TRUE, TRUE, '[]'::jsonb),
    (cust8, CURRENT_DATE, 'morning', 1, TRUE, TRUE, '[]'::jsonb);

    -- Today (Evening - Pending)
    INSERT INTO deliveries (customer_id, delivery_date, shift, milk_qty, delivered, inventory_deducted) VALUES
    (cust2, CURRENT_DATE, 'evening', 1, FALSE, FALSE),
    (cust3, CURRENT_DATE, 'evening', 1, FALSE, FALSE),
    (cust8, CURRENT_DATE, 'evening', 1, FALSE, FALSE);
END $$;

-- 7. SEED BILLS
DO $$
DECLARE
    cust1 UUID := (SELECT id FROM customers WHERE phone = '9876500001');
    cust5 UUID := (SELECT id FROM customers WHERE phone = '9876500005');
    cust9 UUID := (SELECT id FROM customers WHERE phone = '9876500009');
BEGIN
    INSERT INTO bills (customer_id, type, amount, status) VALUES
    (cust1, 'Monthly', 3500.00, 'Pending'),
    (cust5, 'Monthly', 1850.00, 'Paid'),
    (cust9, 'Weekly', 910.00, 'Pending');
END $$;
