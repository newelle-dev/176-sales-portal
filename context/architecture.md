# System Architecture

## Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (configured for Tailwind v4)
- **Database & Auth:** Supabase (PostgreSQL)
- **CSV Parsing:** PapaParse (running server-side in Server Actions)
- **Hosting:** Vercel

## Core Data Models

**1. Profiles Table**
- `id` (uuid, primary key, matches auth.users)
- `email` (string)
- `name` (string, primary name of the stylist)
- `wess_names` (array of strings, text[], GIN-indexed aliases for matching unlinked Wess employee names)
- `role` (string, 'admin' | 'stylist')
- `created_at` (timestamp)

**2. Transactions Table**
- `id` (uuid, primary key)
- `profile_id` (uuid, foreign key to Profiles, ON DELETE SET NULL, nullable to support unlinked transactions)
- `employee_name` (string, raw employee name from CSV)
- `branch` (string, resolved location: 'Bangsar' | 'SS2' | 'KLGCC')
- `transaction_date` (timestamp)
- `reference_no` (string, unique constraint with appended suffix index `_{count}` to support multiple items per ticket and prevent duplicates. For Employee Service Detail records, prefixed with `ESD_`)
- `customer_name` (string)
- `item_description` (string)
- `type` (string, mapped to 'S', 'G', 'C', 'P')
- `amount` (decimal/numeric, mapped from 'Nett')
- `deduction` (decimal/numeric, mapped from 'Deduction' or 'Actual Value' for prepaid service rows)
- `quantity` (decimal/numeric, mapped from 'Qty')
- `created_at` (timestamp)

**3. Database Functions & Triggers**
- **RPC `get_distinct_employee_names`:** SQL function returning distinct employee names from the transactions table to populate the name alias configuration UI.
- **Trigger `tr_link_transactions_on_profile_change`:** Triggers on INSERT/UPDATE of `profiles` to automatically scan unlinked transactions and retroactively link them to `profile_id` if the transaction `employee_name` matches any of the profile's `wess_names` (case-insensitive normalized).

## System Boundaries & Invariants
- **Authentication:** All routes except `/login` must be protected. Enforced via `proxy.ts` (Next.js 16 proxy convention).
- **Data Isolation:** Stylists must NEVER be able to query or view transactions belonging to another `profile_id` (Enforce via Supabase RLS - Row Level Security).
- **Idempotent Uploads:** The CSV parser must gracefully handle duplicate uploads. If a transaction's `reference_no` already exists in the database, it should be updated/upserted, not duplicated.
- **Branch Suffix Resolution:**
  - Suffix `none` (default) -> Bangsar
  - Suffix `-2` -> KLGCC
  - Suffix `-3` -> SS2
  (Resolved from the transaction's ticket reference number).
- **Employee Service Detail (ESD) Format:**
  - Mapped with `amount = 0` (nett sales unaffected) and `deduction = Actual Value`.
  - Reference number is prefixed with `ESD_` to prevent key collisions with standard transaction records.