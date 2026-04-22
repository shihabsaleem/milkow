# Milkow System Database: How it Works

The Milkow System Database is built on Supabase (PostgreSQL), utilizing a relational architecture designed for real-time tracking, automated billing, and inventory management.

## 1. Core Architecture
The database follows a Relational Model, meaning data is organized into tables that are linked together via unique identifiers (IDs). This ensures data integrity—for example, a bill cannot exist without being linked to a valid customer.

## 2. Key Data Entities (Tables)
The system is centered around five primary pillars:

*   **Customers:** Stores the "Source of Truth" for all clients, including their contact details, delivery area, preferred frequency (Morning/Evening), and current outstanding balance.
*   **Deliveries:** The operational heart of the system. Every day, the system generates a new set of records here. It tracks which customer gets what quantity, in which shift, and whether it has been successfully delivered.
*   **Inventory & Products:** 
    *   Inventory tracks "Van Stock"—the milk bottles currently loaded for the day's route.
    *   Products acts as a master catalog for items like Ghee, Paneer, etc., including their stock levels and prices.
*   **Bills:** Tracks financial transactions. Records are generated automatically based on successful deliveries, storing the total amount and payment status (Pending/Paid).
*   **System Settings:** A configuration table that stores metadata, such as the last time a daily route was reset or when the last batch of bills was generated.

## 3. How the Automation Logic Works
The "magic" of the system happens through the interaction of these tables:

1.  **Daily Route Initialization:** Every morning, the system checks the system_settings. If the route hasn't been reset for today, it scans the Customers table for all "Active" clients and clones their preferences into the Deliveries table for the new day.
2.  **Live Inventory Sync:** When a delivery is marked as "Delivered" in the app, the system performs an atomic update:
    *   It deducts the quantity from the Inventory (Van Stock).
    *   It flags the delivery record as inventory_deducted = true to prevent double-counting.
3.  **End-of-Day Billing:** At a scheduled time (e.g., after 6 PM), the system looks for all Deliveries marked as completed for that date. It calculates the total cost based on the Products price list and creates a corresponding entry in the Bills table.

## 4. Security & Performance
*   **RLS (Row Level Security):** The database is protected by Supabase RLS policies. This ensures that only authorized administrators can modify sensitive data like pricing or customer balances.
*   **Triggers:** The system uses PostgreSQL triggers (specifically update_updated_at_column) to automatically timestamp every change, providing a clear audit trail of when data was last modified.
*   **Integrity:** Using Foreign Keys (e.g., customer_id REFERENCES customers(id)), the system prevents "orphan" records, ensuring that if a customer is deleted, their associated delivery history is managed correctly (Cascade Delete).

---
In summary, the Milkow database is not just a storage unit; it's an active engine that moves data from "Customer Preference" to "Daily Route" to "Inventory Deduction" and finally to "Revenue Tracking" with minimal manual input.
