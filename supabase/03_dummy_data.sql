-- ==========================================
-- MILKOW — 03_dummy_data.SQL
-- Sample data for development & testing.
-- WARNING: TRUNCATES ALL DATA before insert.
-- ==========================================


-- ─── CLEAR ALL DATA ───────────────────────
TRUNCATE bill_deliveries, delivery_items, payments, bills,
         deliveries, inventory, customers, products, areas
CASCADE;


-- ─── AREAS ────────────────────────────────
INSERT INTO areas (name) VALUES
    ('North Sector'),
    ('Downtown Hub'),
    ('Green Valley'),
    ('South Ridge'),
    ('Palm Estates'),
    ('Riverside Walk');


-- ─── PRODUCTS ─────────────────────────────
INSERT INTO products (name, size, price, stock, unit) VALUES
    ('Raw Buffalo Milk', '1L',   72.00,  200, 'Bottles'),
    ('Pure Cow Milk',    '1L',   64.00,  250, 'Bottles'),
    ('Fresh Curd',       '500g', 50.00,  100, 'Packets'),
    ('Artisan Ghee',     '500g', 550.00,  40, 'Items'),
    ('Farm Paneer',      '200g', 140.00,  60, 'Packets'),
    ('Greek Yogurt',     '200g',  85.00,  30, 'Packets');


-- ─── INVENTORY (synced from products) ─────
INSERT INTO inventory (product_id, name, vol, count, loaded, unit)
SELECT id, name, size, stock, stock - 20, unit FROM products;


-- ─── CUSTOMERS ────────────────────────────
DO $$
DECLARE
    north_id  INTEGER := (SELECT id FROM areas WHERE name = 'North Sector'   LIMIT 1);
    green_id  INTEGER := (SELECT id FROM areas WHERE name = 'Green Valley'   LIMIT 1);
    palm_id   INTEGER := (SELECT id FROM areas WHERE name = 'Palm Estates'   LIMIT 1);
    river_id  INTEGER := (SELECT id FROM areas WHERE name = 'Riverside Walk' LIMIT 1);
    down_id   INTEGER := (SELECT id FROM areas WHERE name = 'Downtown Hub'   LIMIT 1);

    buffalo_id UUID := (SELECT id FROM products WHERE name = 'Raw Buffalo Milk' LIMIT 1);
    cow_id     UUID := (SELECT id FROM products WHERE name = 'Pure Cow Milk'    LIMIT 1);
BEGIN
    INSERT INTO customers (name, phone, area_id, frequency, default_product_id, default_qty, past_outstanding, delivery_order)
    VALUES
        ('Sayas Rahman',       '9876543210', north_id, 'Morning Only',     buffalo_id, 2,    0.00, 10.0),
        ('Adnan Sami',         '9123456789', north_id, 'Morning & Evening', cow_id,    1,  450.00, 20.0),
        ('Fatima Begum',       '9223344556', green_id, 'Morning Only',     buffalo_id, 1, -300.00, 15.0),
        ('Rahul Khanna',       '9988776655', palm_id,  'Evening Only',     cow_id,    3,    0.00, 30.0),
        ('Priya Sharma',       '9898989898', river_id, 'Morning Only',     buffalo_id, 2,  120.00,  5.0),
        ('Vikram Singh',       '9797979797', down_id,  'Morning Only',     cow_id,    2,    0.00, 40.0),
        ('Zoya Khan',          '9696969696', palm_id,  'Morning & Evening', buffalo_id, 1,   0.00, 25.0),
        ('Arjun Kapoor',       '9595959595', green_id, 'Evening Only',     cow_id,    2,    0.00, 12.0),
        ('Meera Nair',         '9494949494', north_id, 'Morning Only',     buffalo_id, 3, -150.00,  8.0),
        ('Siddharth Malhotra', '9393939393', river_id, 'Morning Only',     cow_id,    1,    0.00, 35.0);
END $$;


-- ─── SYSTEM SETTINGS ──────────────────────
INSERT INTO system_settings (key, value) VALUES
    (
        'general',
        '{"system_user": {"name": "Milkow Operations"}, "payment": {"upi_id": "milkow.biz@upi", "payee_name": "Milkow Dairy Farm", "currency_code": "INR"}}'::jsonb
    ),
    (
        'daily_prices',
        jsonb_build_object(CURRENT_DATE::text, (SELECT jsonb_object_agg(name, price) FROM products))
    );


-- ─── TRANSACTIONS — 7 DAYS HISTORY ────────
DO $$
DECLARE
    cust_record       RECORD;
    paneer_id         UUID := (SELECT id FROM products WHERE name = 'Farm Paneer' LIMIT 1);
    curd_id           UUID := (SELECT id FROM products WHERE name = 'Fresh Curd'  LIMIT 1);
    del_id            UUID;
    bill_id           UUID;
    total_bill_amount DECIMAL(12, 2);
    d                 DATE;
    s                 shift_type;
BEGIN
    FOR i IN 1..7 LOOP
        d := CURRENT_DATE - (i * INTERVAL '1 day');

        FOR cust_record IN
            SELECT id, frequency, default_product_id, default_qty FROM customers
        LOOP
            FOR s IN
                SELECT unnest(
                    CASE cust_record.frequency
                        WHEN 'Morning Only'     THEN ARRAY['Morning Only']::shift_type[]
                        WHEN 'Evening Only'     THEN ARRAY['Evening Only']::shift_type[]
                        ELSE ARRAY['Morning Only', 'Evening Only']::shift_type[]
                    END
                )
            LOOP
                -- Delivery
                INSERT INTO deliveries (customer_id, product_id, milk_qty, shift, delivery_date, delivered)
                VALUES (cust_record.id, cust_record.default_product_id, cust_record.default_qty, s, d, TRUE)
                RETURNING id INTO del_id;

                -- Main delivery item
                INSERT INTO delivery_items (delivery_id, product_id, quantity, unit_price)
                VALUES (
                    del_id,
                    cust_record.default_product_id,
                    cust_record.default_qty,
                    (SELECT price FROM products WHERE id = cust_record.default_product_id)
                );

                -- Occasional misc: Paneer (~20% chance)
                IF random() > 0.8 THEN
                    INSERT INTO delivery_items (delivery_id, product_id, quantity, unit_price)
                    VALUES (del_id, paneer_id, 1, (SELECT price FROM products WHERE id = paneer_id));
                END IF;

                -- Occasional misc: Curd (~10% chance)
                IF random() > 0.9 THEN
                    INSERT INTO delivery_items (delivery_id, product_id, quantity, unit_price)
                    VALUES (del_id, curd_id, 2, (SELECT price FROM products WHERE id = curd_id));
                END IF;

                -- Bill for this delivery
                SELECT SUM(quantity * unit_price) INTO total_bill_amount
                FROM delivery_items WHERE delivery_id = del_id;

                INSERT INTO bills (customer_id, type, amount, status, notes)
                VALUES (cust_record.id, 'Spot', total_bill_amount, 'Pending', 'Daily Log')
                RETURNING id INTO bill_id;

                INSERT INTO bill_deliveries (bill_id, delivery_id) VALUES (bill_id, del_id);
                UPDATE deliveries SET billed = TRUE WHERE id = del_id;

                -- 70% chance bill is already paid
                IF random() > 0.3 THEN
                    UPDATE bills SET status = 'Paid' WHERE id = bill_id;

                    INSERT INTO payments (customer_id, bill_id, amount, method, payment_date)
                    VALUES (
                        cust_record.id,
                        bill_id,
                        total_bill_amount,
                        'UPI',
                        now() - (random() * INTERVAL '12 hours')
                    );
                END IF;

            END LOOP;
        END LOOP;
    END LOOP;

    -- Today's pending deliveries (morning, not delivered yet)
    FOR cust_record IN
        SELECT id, frequency, default_product_id, default_qty FROM customers
    LOOP
        IF cust_record.frequency IN ('Morning Only', 'Morning & Evening') THEN
            INSERT INTO deliveries (customer_id, product_id, milk_qty, shift, delivery_date, delivered)
            VALUES (cust_record.id, cust_record.default_product_id, cust_record.default_qty, 'Morning Only', CURRENT_DATE, FALSE);
        END IF;
    END LOOP;

END $$;
