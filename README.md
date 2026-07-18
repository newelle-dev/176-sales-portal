# 176 Avenue Sales Portal

An internal, premium, mobile-first web application designed to replace a tedious, manual spreadsheet workflow for a salon (176 Avenue). It automates the parsing of raw "WessConnect" software CSV transaction exports and provides stylists and administrators with a zero-friction dashboard to track daily and monthly sales.

---

## 🌟 The Vision

* **For Salon Admins & Managers:** A fast, reliable way to upload daily WessConnect CSV files, manage staff profiles, configure CSV employee name aliases, set yearly targets, and safely manage transaction records.
* **For Salon Stylists:** A beautiful, responsive, and mobile-friendly dashboard that displays monthly sales performance broken down by category without the friction of complex navigation or forgotten passwords.

---

## 🛠️ Tech Stack & Key Libraries

* **Framework:** Next.js 16 (App Router)
* **Language:** TypeScript
* **State & Fetching:** React 19, Server Actions for mutations and file uploads
* **Authentication & Database:** Supabase (Auth, PostgreSQL)
* **CSV Parsing:** PapaParse (running server-side in Server Actions)
* **Styling:** Tailwind CSS (configured for v4 `@theme` variables)
* **UI Components:** Radix UI primitives & Lucide React icons

---

## 🔑 Core Features & Workflows

### 1. Authentication & Security
* **Role-Based Guards:** Redirects users based on roles (`admin` or `stylist`). Enforced at the root level via Next.js 16 `proxy.ts`.
* **Session Cache:** Active user sessions and profiles are managed using a request-memoized helper (`getCachedSession`) to minimize database queries during page rendering.

### 2. Admin Dashboard & Operations
* **Stats & Overview:** Displays annual progress towards target milestones (Hair, Nails, Artistry/Lash, Total) with a live pacing indicator and monthly target achievements.
* **Branch Sales Mix & leaderboards:** Includes branch contribution charts (Bangsar, SS2, KLGCC) and a dynamic stylist leaderboard sorted by Nett Sales (correctly excluding deductions).
* **CSV Upload Center:** Dedicated interface to batch upload standard WessConnect transaction reports and Employee Service Detail (ESD) CSV files. Handles duplicate uploads gracefully.
* **Team Manager:** Manage stylist profiles, configure custom yearly targets, and resolve unmapped employee CSV names using a searchable multi-select alias UI.
* **Danger Zone:** Provides a double-confirmation option (typing `DELETE`) to clear all transaction records from the database when resetting data.

### 3. Stylist Mobile Dashboard
* **KPI Overview:** Dual KPI cards to display monthly totals both including and excluding deductions.
* **Monthly Navigation:** Quickly filter performance metrics starting from January 2026.
* **Categorical Performance:** Drill down into Ala Carte, Package, Product, and Deduction totals.
* **Daily Transaction Accordions:** Collapsible transaction groups categorized by local calendar days, showing branch badges, customer names, and deduction highlights.

---

## 📐 System Architecture & Key Invariants

### 📄 Next.js 16 Proxy Convention
* The deprecated `middleware.ts` is replaced with `proxy.ts` at the project root. It intercepts requests, refreshes Supabase auth sessions, and applies role-based access control.

### ⏰ Timezone Safety & Formatting
* WessConnect CSV exports lack timezone offset information. To prevent transaction dates from shifting when viewed in different locales, all parsed timestamps are explicitly appended with `+08:00` (Asia/Kuala_Lumpur) before database insertion.

### 📂 Employee Service Detail (ESD) Handling
* The importer automatically detects the ESD layout (headers containing `reference no`, `employee`, and `actual value`).
* The **Actual Value** is mapped to the transaction's `deduction` column, the Nett `amount` is set to `0` (retaining accurate revenue-only sales), and reference numbers are prefixed with `ESD_` to avoid ticket ID collisions.

### 🔄 Dynamic Name Matching & Retro-Linking
* Profile aliases (`wess_names` text array) map raw CSV employee names to database profiles.
* A Postgres trigger (`tr_link_transactions_on_profile_change`) runs on profile updates to retroactively link unlinked historical transactions to the stylist's profile ID when new aliases are configured.

### ⚡ PostgreSQL RPC Aggregations
* Complex calculations (yearly targets, leaderboards, and sales mix) are offloaded to custom database functions (`get_monthly_sales_summary`, `get_monthly_branch_sales`, `get_monthly_sales_mix`, `get_monthly_stylist_leaderboard`).
* A paginated loader (`fetchAllTransactions`) bypasses the default 1000-row PostgREST query limit to ensure scale-resilient dashboard calculations.

---

## 📂 Project Directory Structure

```text
├── app/
│   ├── admin/                # Admin Stats, Upload, and Targets
│   │   ├── team/             # Team Management and Profile Alias settings
│   │   ├── upload/           # CSV Upload and Danger Zone page
│   │   ├── utils/            # CSV Parsing and Date utility logic
│   │   └── actions.ts        # Admin operations Server Actions
│   ├── dashboard/            # Stylist mobile-first dashboard and Accordions
│   ├── login/                # Authentication page & actions
│   ├── globals.css           # Styling with Tailwind v4 custom theme
│   ├── layout.tsx            # Root HTML wrap
│   └── page.tsx              # Landing redirection
├── components/
│   ├── ui/                   # Shared primitive components (Button, Dialog, etc.)
│   └── admin/                # Header and layout components
├── context/                  # Project specifications, rules, and progress tracking
├── lib/
│   ├── supabase/             # Client, Server, and Middleware handlers
│   ├── item-dictionary.ts    # List of mapped service/package items
│   └── transaction-utils.ts  # Date and timezone helpers
└── types/                    # Shared types & Supabase generated database types
```

---

## 🚀 Getting Started

### Prerequisites
* Node.js (v18+ recommended)
* A Supabase project with database tables configured (refer to schemas in `/context/architecture.md`)

### Installation & Run

1. Clone the repository and install the dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file in the root directory and populate it with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

3. Start the development server:
   ```bash
   npm run dev 
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📈 Current Project Progress

All core setup phases are complete, including timezone-safe CSV parsers, multi-file uploads, custom database aggregation functions, database triggers, targets configuration, and mobile-first dashboard UI overrides. 

For the complete status checklist and history, refer to [progress-tracker.md](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/context/progress-tracker.md).