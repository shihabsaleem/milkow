# Migration Plan: Transitioning Milkow from Firebase to Supabase

This document outlines the strategic phase-shift from a Firebase NoSQL architecture to a Supabase PostgreSQL environment. The goal is to leverage SQL relations, Row Level Security (RLS), and native Edge Functions.

---

## 🏗️ 1. Database Schema Redesign (SQL)

Firestore's nested documents will be flattened into normalized relational tables.

### Proposed Tables:
- **`profiles`**: Stores user-specific settings and PIN (extending Supabase Auth).
- **`customers`**: (`id`, `name`, `phone`, `area`, `frequency`, `status`, `created_at`).
- **`active_route`**: (`id`, `customer_id` (FK), `qty`, `delivered`, `extras` (JSONB), `inventory_deducted`, `shift`).
- **`inventory`**: (`id`, `name`, `total_count`, `loaded_count`, `unit`).
- **`products`**: (`id`, `name`, `size`, `price` (dec), `stock_count`).
- **`bills`**: (`id`, `customer_id` (FK), `amount`, `status`, `details`, `date`, `auto_generated`).
- **`system_config`**: (`key`, `value` (JSONB)) for tracking automation last-run timestamps.

---

## 🔐 2. Authentication & Security

1.  **Authentication**: Switch from Firebase Client Auth to Supabase Auth. Use a custom `profiles` table to store the delivery PIN and admin metadata.
2.  **RLS (Row Level Security)**:
    - Implement policies to ensure only authenticated "Admin" roles can modify billing and inventory.
    - Public/Read permissions for delivery personnel on specific route views.

---

## 🤖 3. Automation Engine (Server-Side)

The current client-side `automation.ts` will be migrated to **Supabase Edge Functions** or **Postgres Cron**:

- **Daily Reset**: A `pg_cron` job to reset `delivered` and `extras` in the `active_route` table at 00:00.
- **Daily Billing**: A cron job at 18:00 to run an SQL function that inserts rows into `bills` based on `active_route` status.
- **Inventory Triggers**: Use **Postgres Triggers** to automatically deduct stock from the `inventory` table whenever a row in `active_route` is updated to `delivered = true`.

---

## 💻 4. Frontend Refactoring

### Step 1: Initialization
- Replace `firebase.ts` with `supabaseClient.ts`.
- Environment variables: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### Step 2: Data Fetching
- Replace Firestore `onSnapshot` with `supabase.from('table').on('*', callback).subscribe()`.
- Refactor `updateDoc` and `setDoc` to `.update()` and `.upsert()`.

### Step 3: Auth Logic
- Update `AuthContext.tsx` to use `supabase.auth.onAuthStateChange` and `supabase.auth.signInWithPassword`.

---

## 🚦 5. Migration Execution Steps

### Phase A: The Infrastructure (Days 1-2)
- [ ] Spin up Supabase Project.
- [ ] Run SQL migrations to create the schema.
- [ ] Configure RLS policies.

### Phase B: Data Ingestion (Day 3)
- [ ] Export Firestore collections as JSON.
- [ ] Script a migration tool (Node.js) to map NoSQL IDs to SQL Primary Keys and upload to Supabase.

### Phase C: Code Transition (Days 4-6)
- [ ] Update `lib/` directory with Supabase SDK logic.
- [ ] Refactor Dashboard and Delivery pages.
- [ ] Test real-time subscriptions.

### Phase D: Automation & Cutover (Day 7)
- [ ] Deploy Edge Functions.
- [ ] Run side-by-side tests with Firebase to verify bill accuracy.
- [ ] Deprecate Firebase project.

---

## 💡 Why Supabase for Milkow?
- **Data Integrity**: Foreign key constraints prevent "ghost" bills for deleted customers.
- **JSONB Support**: Efficiently store and query the `extras` map.
- **Reliable Cron**: Moving logic from the browser to the server ensures billing runs even if no one is logged in.
