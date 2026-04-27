-- ==========================================
-- MILKOW SAMPLE DATA (V6 NORMALIZED)
-- ==========================================

-- 1. CLEAR EXISTING DATA
TRUNCATE 
    bill_deliveries, 
    delivery_items, 
    payments, 
    bills, 
    deliveries, 
    inventory, 
    customers, 
    products, 
    areas 
CASCADE;

-- 2. AREAS
INSERT INTO areas (name) VALUES 
('North Sector'), 
('Downtown Hub'), 
('Green Valley'), 
('South Ridge');

-- 3. PRODUCTS
INSERT INTO products (name, size, price, stock, unit) VALUES 
('Raw Buffalo Milk', '1L', 65.00, 100, 'Bottles'),
('Pure Cow Milk', '1L', 55.00, 150, 'Bottles'),
('Fresh Curd', '500g', 45.00, 50, 'Packets'),
('Artisan Ghee', '500g', 450.00, 20, 'Items'),
('Farm Paneer', '200g', 120.00, 30, 'Packets');

-- 4. INITIAL INVENTORY SYNC
INSERT INTO inventory (product_id, name, vol, count, loaded, unit)
SELECT id, name, size, stock, stock / 2, unit
FROM products;

-- 5. CUSTOMERS
DO $$ 
DECLARE 
    north_id INTEGER := (SELECT id FROM areas WHERE name = 'North Sector' LIMIT 1);
    green_id INTEGER := (SELECT id FROM areas WHERE name = 'Green Valley' LIMIT 1);
    milk_id UUID := (SELECT id FROM products WHERE name = 'Raw Buffalo Milk' LIMIT 1);
    cow_id UUID := (SELECT id FROM products WHERE name = 'Pure Cow Milk' LIMIT 1);
BEGIN
    INSERT INTO customers (name, phone, area_id, frequency, default_product_id, default_qty, past_outstanding, delivery_order)
    VALUES 
    ('Sayas Rahman', '9876543210', north_id, 'Morning Only', milk_id, 2, 0.00, 1000.00),
    ('Adnan Sami', '9123456789', north_id, 'Morning & Evening', cow_id, 1, 150.00, 2000.00),
    ('Fatima Begum', '9223344556', green_id, 'Morning Only', milk_id, 1, -200.00, 1000.00),
    ('Rahul Khanna', '9988776655', north_id, 'Evening Only', cow_id, 3, 0.00, 3000.00);
END $$;

-- 6. SYSTEM SETTINGS
INSERT INTO system_settings (key, value) VALUES 
('general', '{
    "system_user": {"name": "Milkow Admin"},
    "payment": {
        "upi_id": "milkow@upi",
        "payee_name": "Milkow Distributions",
        "currency_code": "INR"
    }
}'::jsonb),
('daily_prices', jsonb_build_object(
    CURRENT_DATE::text, (SELECT jsonb_object_agg(name, price) FROM products)
));

-- 7. NORMALIZED DELIVERIES, BILLS, AND PAYMENTS
DO $$ 
DECLARE 
    cust_record RECORD;
    paneer_id UUID := (SELECT id FROM products WHERE name = 'Farm Paneer' LIMIT 1);
    del_id UUID;
    bill_id UUID;
    total_bill_amount DECIMAL(12, 2);
    misc_item_json JSONB;
BEGIN
    FOR cust_record IN SELECT id, name, default_product_id, default_qty FROM customers LOOP
        
        -- Create Misc Items JSON for the UI summary
        misc_item_json := jsonb_build_array(
            jsonb_build_object('name', 'Farm Paneer', 'qty', 1)
        );

        -- A. Create Delivery Header
        INSERT INTO deliveries (customer_id, product_id, milk_qty, shift, delivery_date, delivered, misc_items)
        VALUES (cust_record.id, cust_record.default_product_id, cust_record.default_qty, 'Morning Only', CURRENT_DATE, TRUE, misc_item_json)
        RETURNING id INTO del_id;

        -- B. Create Delivery Items (The actual transaction records)
        -- Primary Product (Milk)
        INSERT INTO delivery_items (delivery_id, product_id, quantity, unit_price)
        VALUES (
            del_id, 
            cust_record.default_product_id, 
            cust_record.default_qty, 
            (SELECT price FROM products WHERE id = cust_record.default_product_id)
        );

        -- Add Paneer as a secondary item for everyone
        INSERT INTO delivery_items (delivery_id, product_id, quantity, unit_price)
        VALUES (del_id, paneer_id, 1, (SELECT price FROM products WHERE id = paneer_id));

        -- C. Calculate Total for the Bill
        SELECT SUM(quantity * unit_price) INTO total_bill_amount 
        FROM delivery_items 
        WHERE delivery_id = del_id;

        -- D. Generate an Individual Bill for this delivery
        INSERT INTO bills (customer_id, type, amount, status, start_date, end_date, notes)
        VALUES (cust_record.id, 'Monthly', total_bill_amount, 'Pending', CURRENT_DATE, CURRENT_DATE, 'Auto-generated for delivery')
        RETURNING id INTO bill_id;

        -- E. Link Bill to Delivery (Many-to-Many support)
        INSERT INTO bill_deliveries (bill_id, delivery_id) VALUES (bill_id, del_id);
        UPDATE deliveries SET billed = TRUE WHERE id = del_id;

        -- F. Handle Payments (Simulate 'Adnan Sami' and 'Sayas Rahman' paying immediately)
        IF cust_record.name IN ('Sayas Rahman', 'Adnan Sami') THEN
            INSERT INTO payments (customer_id, bill_id, amount, method, notes)
            VALUES (cust_record.id, bill_id, total_bill_amount, 'Cash', 'Paid on delivery');

            -- Trigger handles the bill status and outstanding, but we'll set it here for the sample
            UPDATE bills SET status = 'Paid', paid_at = now() WHERE id = bill_id;
        END IF;

    END LOOP;
END $$;
