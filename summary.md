# Software Requirements Specification (SRS) — Milkow System

## 1. Introduction

### 1.1 Purpose
The purpose of this document is to provide a detailed description of the Milkow dairy management system. It will outline the system's functional and non-functional requirements, database design, and core business logic.

### 1.2 Scope
Milkow is a cloud-native application designed to digitize milk distribution. It encompasses customer management, real-time route execution, inventory tracking throughout the supply chain, and automated end-of-day billing and payment collection.

### 1.3 Definitions, Acronyms, and Abbreviations
- **SRS**: Software Requirements Specification
- **PWA**: Progressive Web App
- **UPI**: Unified Payments Interface
- **Firestore**: NoSQL Database provided by Firebase
- **Extra Product**: Any non-subscription item (e.g., Ghee, Curd) sold during a delivery.

---

## 2. Overall Description

### 2.1 Product Perspective
Milkow replaces a traditional paper-based or local-spreadsheet system with a real-time, multi-user cloud environment. It acts as an ERP specifically tailored for local dairy distributors.

### 2.2 System Functions
- **Route Management**: Sequential delivery tracking with status updates.
- **Dynamic Sales**: Recording extra item sales on-the-fly.
- **Inventory Control**: Real-time stock deduction from van-loaded and total inventory.
- **Automation Runner**: Background processes for daily resets and billing.
- **Financial Analytics**: Tracking pending vs. collected revenue.

### 2.3 User Classes and Characteristics
- **Administrators**: Full access to inventory, pricing, configuration, and financial reports.
- **Delivery Personnel**: Access to the delivery route, stock updates, and payment collection tools.

### 2.4 Constraints
- Requires active internet connection for real-time Firebase sync.
- Optimized for mobile browser environments (Touch-first UI).

---

## 3. External Interface Requirements

### 3.1 User Interfaces
- **Visual Design**: High-contrast, premium Glassmorphism aesthetic.
- **Interactions**: Framer Motion powered transitions and tactile feedback.
- **Responsive**: Mobile-first grid layouts for delivery; dashboard layouts for tablets/desktop.

### 3.2 Software Interfaces
- **Next.js 16 (React 19)**: Core application engine.
- **Firebase 12**: Authentication, NoSQL Storage, and Real-time listeners.
- **WhatsApp API**: Integration for bill sharing and payment reminders.
- **UPI Deep-linking**: Protocol-level integration for payment app launching.

---

## 4. System Features (Functional Requirements)

### 4.1 Route Execution Engine
- **ID-FR-1**: The system shall allow marking deliveries as "Done" or "Skipped".
- **ID-FR-2**: The system shall persist "Extra Products" added to a stop immediately to the cloud.
- **ID-FR-3**: Users shall be able to re-sequence stops by updating the sequence number.

### 4.2 Automated Inventory Deduction
- **ID-FR-4**: Upon marking a delivery "Done", the system shall deduct the primary quantity and any extras from the global and loaded inventory.
- **ID-FR-5**: The system shall utilize an `inventoryDeducted` flag to prevent duplicate subtractions.

### 4.3 Automated Billing & Resets
- **ID-FR-6**: The system shall automatically reset the daily route at 00:00 local time.
- **ID-FR-7**: The system shall generate `Pending` bill records after 18:00 local time for all successful deliveries.
- **ID-FR-8**: Bill amounts shall be calculated dynamically based on current product prices: `(Qty × MilkPrice) + Σ(ExtraQty × ProductPrice)`.

---

## 5. Database Schema & Data Logic

### 5.1 Collection: `active_route`
| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `Number` | Stop sequence ID |
| `name` | `String` | Customer identifier |
| `qty` | `String` | Base milk subscription quantity |
| `delivered` | `Boolean` | Current status toggle |
| `extras` | `Map<String, Number>` | Key-value store for one-off sales |
| `inventoryDeducted` | `Boolean` | Concurrency/Duplicate prevention flag |

### 5.2 Collection: `products`
| Field | Type | Description |
| :--- | : :--- | :--- |
| `name` | `String` | Unique product name |
| `price` | `String` | Formatted price (e.g., "₹90") |
| `stock` | `Number` | Physical stock quantity |

---

## 6. Non-functional Requirements

### 6.1 Performance
- **Latency**: Firestore listeners shall update UI within <200ms of data changes.
- **Offline**: PWA manifest enables basic loading in low-connectivity areas.

### 6.2 Security
- **Authentication**: Firestore rules enforced via Firebase Auth to restrict write access to authorized owners only.
- **Data Integrity**: Batch writes used for multi-collection inventory updates to ensure atomicity.



---

## 7. Data Relativity & Entity Flow

The Milkow system operates on a highly coupled data model where real-time synchronization is key. The following represents the logical flow and relativity of data:

1.  **Subscription Linkage**: The `active_route` is populated based on `customers` data. A change in a customer's standard `qty` or `status` (Active/Inactive) directly influences the generation of the next day's route.
2.  **Transaction Trigger**: When a delivery is completed:
    *   **Inventories Relate**: `inventory` (the van) and `products` (global stock) are reduced.
    *   **Financials Relate**: The `bills` collection receives a new entry which aggregates data from the `active_route` (quantities) and `products` (live pricing).
3.  **Cyclical Dependency**: The `automation` settings track the "state of the world" (last reset, last bill gen), creating a cyclical dependency where the system's current logic behavior depends on the timestamps of previous automated actions.

---

## 8. Potential System Improvements

### 8.1 Technical Optimizations
- **Edge Functions (Cloud Functions)**: Moving the "Automation Logic" from the client-side to Firebase Cloud Functions would ensure 100% reliability even if no user opens the app at midnight.
- **Advanced Caching**: Implementing a service worker with background sync to allow delivery personnel to record deliveries even with *zero* internet connectivity, syncing automatically when back in range.

### 8.2 Functional Roadmap
- **Route Optimization**: Integrating Google Maps API to automatically sort the `active_route` based on the most efficient driving path between customer coordinates.
- **Vendor Management**: Adding a "Supplier" module to track when bulk milk is purchased, allowing for a full Profit/Loss (P&L) analysis within the dashboard.
- **Automated WhatsApp Reminders**: Using a WhatsApp Business API to send the generated bill PDFs automatically at the end of the month without manual sharing.

