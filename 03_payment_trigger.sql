-- PostgreSQL Trigger to automate debt settlement upon payment
-- Run this in your Supabase SQL Editor

-- 1. Create the Settlement Function
CREATE OR REPLACE FUNCTION handle_payment_settlement()
RETURNS TRIGGER AS $$
BEGIN
    -- A. Wipe legacy past_outstanding from customers table
    UPDATE customers 
    SET past_outstanding = 0 
    WHERE id = NEW.customer_id;
    
    -- B. Mark all PENDING bills as PAID for this customer
    UPDATE bills 
    SET status = 'Paid' 
    WHERE customer_id = NEW.customer_id AND status = 'Pending';
    
    -- C. Mark all delivered but unbilled records as 'billed'
    -- (This prevents the 'Grand Total' from double-counting these once the payment is in)
    UPDATE deliveries 
    SET billed = true 
    WHERE customer_id = NEW.customer_id AND delivered = true AND billed = false;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the Trigger to the payments table
-- This fires every time a new payment is recorded (via Billing page or API)
DROP TRIGGER IF EXISTS trg_payment_settlement ON payments;
CREATE TRIGGER trg_payment_settlement
AFTER INSERT ON payments
FOR EACH ROW
EXECUTE FUNCTION handle_payment_settlement();

-- Verify: You can now remove the manual UPDATE calls from your frontend 
-- code if you prefer, as the database will handle it automatically.
