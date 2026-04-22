-- ==========================================
-- MILKOW COMPREHENSIVE SAMPLE DATA (V4)
-- ==========================================

-- 1. SEED SYSTEM SETTINGS
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
ON CONFLICT (name) DO UPDATE SET price = EXCLUDED.price;

-- 4. SEED INVENTORY (Sync with Products)
DELETE FROM inventory;
INSERT INTO inventory (product_id, name, vol, count, loaded, unit) 
SELECT id, name, size, stock, stock/2, unit FROM products;

-- 5. SEED CUSTOMERS
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

-- 6. SEED DELIVERIES & DELIVERY ITEMS
DO $$
DECLARE
    cust1 UUID := (SELECT id FROM customers WHERE phone = '9876500001');
    cust2 UUID := (SELECT id FROM customers WHERE phone = '9876500002');
    cust3 UUID := (SELECT id FROM customers WHERE phone = '9876500003');
    cust6 UUID := (SELECT id FROM customers WHERE phone = '9876500006');
    cust8 UUID := (SELECT id FROM customers WHERE phone = '9876500008');
    paneer_id UUID := (SELECT id FROM products WHERE name = 'Fresh Malai Paneer');
    dahi_id UUID := (SELECT id FROM products WHERE name = 'Malai Dahi');
    ghee_id UUID := (SELECT id FROM products WHERE name = 'Desi Cow Ghee');
    del_id UUID;
BEGIN
    -- 3 Days Ago
    INSERT INTO deliveries (customer_id, delivery_date, shift, milk_qty, delivered, inventory_deducted) VALUES
    (cust1, CURRENT_DATE - 3, 'morning', 2, TRUE, TRUE),
    (cust2, CURRENT_DATE - 3, 'morning', 1, TRUE, TRUE),
    (cust2, CURRENT_DATE - 3, 'evening', 1, TRUE, TRUE),
    (cust3, CURRENT_DATE - 3, 'evening', 1, TRUE, TRUE)
    ON CONFLICT DO NOTHING;

    -- 2 Days Ago (with Misc Items)
    INSERT INTO deliveries (customer_id, delivery_date, shift, milk_qty, delivered, inventory_deducted, misc_items) 
    VALUES (cust1, CURRENT_DATE - 2, 'morning', 2, TRUE, TRUE, '[{"name": "Fresh Malai Paneer", "qty": 1}]'::jsonb)
    ON CONFLICT (customer_id, delivery_date, shift) DO UPDATE SET id = EXCLUDED.id 
    RETURNING id INTO del_id;
    
    IF del_id IS NOT NULL THEN
        INSERT INTO delivery_items (delivery_id, product_id, quantity, unit_price)
        VALUES (del_id, paneer_id, 1, 120.00) ON CONFLICT DO NOTHING;
    END IF;

    INSERT INTO deliveries (customer_id, delivery_date, shift, milk_qty, delivered, inventory_deducted) VALUES
    (cust2, CURRENT_DATE - 2, 'morning', 1, TRUE, TRUE),
    (cust6, CURRENT_DATE - 2, 'morning', 1, TRUE, TRUE),
    (cust2, CURRENT_DATE - 2, 'evening', 1, TRUE, TRUE),
    (cust3, CURRENT_DATE - 2, 'evening', 1, TRUE, TRUE)
    ON CONFLICT DO NOTHING;

    -- Yesterday (with Dahi)
    INSERT INTO deliveries (customer_id, delivery_date, shift, milk_qty, delivered, inventory_deducted, misc_items) 
    VALUES (cust8, CURRENT_DATE - 1, 'morning', 1, TRUE, TRUE, '[{"name": "Malai Dahi", "qty": 2}]'::jsonb)
    ON CONFLICT (customer_id, delivery_date, shift) DO UPDATE SET id = EXCLUDED.id 
    RETURNING id INTO del_id;

    IF del_id IS NOT NULL THEN
        INSERT INTO delivery_items (delivery_id, product_id, quantity, unit_price)
        VALUES (del_id, dahi_id, 2, 50.00) ON CONFLICT DO NOTHING;
    END IF;

    -- Today (with Ghee)
    INSERT INTO deliveries (customer_id, delivery_date, shift, milk_qty, delivered, inventory_deducted, misc_items) 
    VALUES (cust1, CURRENT_DATE, 'morning', 2, TRUE, TRUE, '[{"name": "Desi Cow Ghee", "qty": 1}]'::jsonb)
    ON CONFLICT (customer_id, delivery_date, shift) DO UPDATE SET id = EXCLUDED.id 
    RETURNING id INTO del_id;

    IF del_id IS NOT NULL THEN
        INSERT INTO delivery_items (delivery_id, product_id, quantity, unit_price)
        VALUES (del_id, ghee_id, 1, 750.00) ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- 7. SEED BILLS & BILL DELIVERIES
DO $$
DECLARE
    cust1 UUID := (SELECT id FROM customers WHERE phone = '9876500001');
    bill1_id UUID;
BEGIN
    -- Create a bill for Rahul (cust1)
    INSERT INTO bills (customer_id, type, amount, status, start_date, end_date) 
    VALUES (cust1, 'Monthly', 3500.00, 'Pending', CURRENT_DATE - 30, CURRENT_DATE)
    RETURNING id INTO bill1_id;

    -- Link recent deliveries to this bill
    INSERT INTO bill_deliveries (bill_id, delivery_id)
    SELECT bill1_id, id FROM deliveries WHERE customer_id = cust1 AND delivery_date >= CURRENT_DATE - 30;
END $$;
