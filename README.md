# Milkow - Dairy Delivery CRM

Milkow is a full-stack CRM and route management application designed specifically for daily milk delivery businesses. It provides route optimization, customer profile management, shift-based inventory tracking, and automated billing with UPI integrations.

## Core Features

- **Dashboard**: Real-time snapshot of loaded inventory, delivered stock, and financial health (accounts receivable/advances).
- **Route Operations**: Dedicated interface for drivers to mark deliveries during Morning/Evening shifts, handle spot sales, and record empties returned.
- **Customer Management**: Detailed profiles tracking subscriptions, default products/quantities, custom pricing, vacation pauses, and ledger history.
- **Inventory & Pipeline**: Management of stock loaded onto vans, tracking of extra items, and end-of-shift reconciliation.
- **Billing & Collections**: Automated invoice generation, spot billing, and integrated UPI QR code creation for rapid cash collection on the route.
- **Multi-Tenant Franchising**: Built-in support for multiple franchise operators with isolated data via Row Level Security (RLS) and a `superadmin` impersonation mode.
- **Optimistic UI**: System-wide optimistic updates ensure that actions like saving edits, marking deliveries, or recording payments feel instantaneous, masking network latency.

## Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org) (App Router)
- **Database & Auth**: [Supabase](https://supabase.com) (PostgreSQL with RLS)
- **Styling**: [Tailwind CSS](https://tailwindcss.com) + Framer Motion (Animations)
- **Icons**: Lucide React
- **PWA Ready**: Built with mobile-first principles for drivers on the go.

## Getting Started

First, ensure you have your `.env.local` configured with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Then, run the development server:

```bash
npm run dev
# or yarn dev / pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

## Database Schema Highlights

The application relies on a deeply integrated PostgreSQL schema:
- `franchises` & `user_roles`: Multi-tenant foundations separating data by franchise.
- `customers`: Tracks active status, default products, and balances.
- `products` & `inventory`: Handles dynamic daily pricing, units, and loaded vehicle stock.
- `deliveries`: Records daily drops, shift timings, and miscellaneous items via JSONB.
- `bills` & `payments`: Full financial ledger.
- `customer_financials`: A powerful SQL View that aggregates ledger data in real-time to prevent balance drift.

*For a full breakdown of every function and API route, see the `Complete-Document.md` or `doc.md` almanac.*
