# Milkow | Project Handover Documentation

## 1. Project Overview
Milkow is a smart dairy operations management system designed to automate the daily workflows of milk distribution businesses. It handles everything from daily route planning and inventory tracking to automated billing and financial settlement.

---

## 2. Technical Stack
- **Frontend**: Next.js 16 (App Router), React 19
- **Styling**: Tailwind CSS 4, Framer Motion (Animations)
- **Backend/Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Icons**: Lucide React
- **PWA**: @ducanh2912/next-pwa (Progressive Web App support)

---

## 3. Getting Started

### Prerequisites
- Node.js (v18 or higher)
- A Supabase Project

### Environment Variables
Create a `.env.local` file in the root directory with the following:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation
```bash
npm install
npm run dev
```

---

## 4. Database Architecture
The system uses a relational PostgreSQL schema. All setup logic is consolidated in `supabase_setup.sql`.

### Core Tables
- `customers`: Primary customer records including delivery preferences and decimal indexing for route order.
- `products`: Product master list with pricing and stock levels.
- `deliveries`: Daily transaction headers tracking status (Delivered, Billed).
- `delivery_items`: Normalized line items for each delivery.
- `bills`: Aggregated customer charges (Pending/Paid).
- `payments`: Individual collection events.
- `inventory`: Physical stock pipeline tracking.
- `areas`: Delivery zones/routes.
- `system_settings`: JSONB configurations (UPI details, Admin name, Automation timestamps).

### Key PostgreSQL Trigger: `handle_payment_settlement`
Located in the `Trigger` section of `supabase_setup.sql`. This trigger automatically marks pending bills as paid and settles customer outstanding balances whenever a new payment is inserted.

---

## 5. Application Features & Pages

### 📊 Dashboard (`/`)
Real-time overview of business health, including inventory alerts, delivery progress, and financial summaries.

### 🚚 Delivery Management (`/delivery`)
The operational core. Allows delivery drivers to follow a pre-planned route, mark deliveries as complete, and add "Misc Items" on the fly.

### 💰 Billing & Payments (`/billing`)
A comprehensive financial dashboard to track receivables, generate UPI QR codes for payments, and manage customer ledgers.

### 👥 Customer Directory (`/customers`)
Manage customer profiles, delivery frequencies, and their exact position in the delivery route using the "Delivery Order" decimal system.

### 📦 Inventory Control (`/inventory`)
Track stock levels in real-time. Features "Auto-Deduction" where marking a delivery as complete automatically decrements the corresponding stock.

### 👤 System Settings (`/profile`)
Configure business details (UPI ID, Payee Name) and security. Changing the PIN here automatically updates the user's Supabase Auth login password.

---

## 6. Core Automations & Function-Level Documentation (`lib/automation.ts`)

The background tasks and automated data manipulations are handled centrally in `lib/automation.ts`.

### `resetDailyRoute()`
- **Signature**: `export async function resetDailyRoute(): Promise<{ ran: boolean; message: string }>`
- **Purpose**: Automatically generates today's delivery records based on customer schedules. Queries active customers, checks existing deliveries for today, and creates missing delivery records for shifts depending on the frequency.

### `deductInventoryOnDelivery(stopId, milkQty, miscProducts)`
- **Signature**: `export async function deductInventoryOnDelivery(stopId: string, milkQty: number, miscProducts: Record<string, number> = {}): Promise<void>`
- **Purpose**: Deducts inventory for a specific delivery stop when a delivery is marked as complete. Prevents double-deduction by checking the `inventory_deducted` flag. Supports deducting miscellaneous items (`miscProducts`) ordered on the fly.

### `generateDailyBills()`
- **Signature**: `export async function generateDailyBills(): Promise<{ ran: boolean; count: number; message: string }>`
- **Purpose**: Aggregates all completed but unbilled daily deliveries into customer bills. Calculates total amount based on milk quantity, product price, and additional miscellaneous items, inserts records into the `bills` table, and marks `deliveries` as billed.

### `checkAndRunAutomations()`
- **Signature**: `export async function checkAndRunAutomations(): Promise<void>`
- **Purpose**: Master runner for daily checks. Sequentially calls `resetDailyRoute()`, and if the current time is past 6 PM, triggers `generateDailyBills()`.

---

## 7. Database Client (`lib/supabase.ts`)

### `getSupabaseClient()`
- **Signature**: `const getSupabaseClient = () => any`
- **Purpose**: Initializes and returns the Supabase client. Switches between client-side (`createBrowserClient` with session persistence) and server-side (`createClient`) initialization depending on the execution context. Falls back to a mock client if environment variables are missing.

---

## 8. Security & RLS
- **Authentication**: Secured via Supabase Auth.
- **RLS (Row Level Security)**: All tables are protected. Only authenticated users can view or modify data.
- **PIN Security**: The administrative PIN is synced with the Supabase account password for unified security.

---

## 9. Deployment & Maintenance
- **Build**: `npm run build`
- **Database Migrations**: If changes are needed, update `supabase_setup.sql` and run the queries in the Supabase SQL Editor.
- **Static Assets**: Logos and assets are located in `/public/assets`.

---

