# System Architecture

## Tech Stack
- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Database & Auth:** Supabase (PostgreSQL)
- **CSV Parsing:** PapaParse (running server-side)
- **Hosting:** Vercel

## Core Data Models

**1. Profiles Table**
- `id` (uuid, primary key, matches auth.users)
- `email` (string)
- `name` (string, primary name of the stylist)
- `wess_names` (array of strings, text[], GIN-indexed aliases for matching unlinked Wess employee names)
- `role` (enum: 'admin' | 'stylist')
- `created_at` (timestamp)

**2. Transactions Table**
- `id` (uuid, primary key)
- `profile_id` (uuid, foreign key to Profiles, ON DELETE SET NULL, nullable to support unlinked transactions)
- `employee_name` (string, raw employee name from CSV)
- `branch` (string, resolved location: 'Bangsar' | 'SS2' | 'KLGCC')
- `transaction_date` (timestamp)
- `reference_no` (string, unique constraint with appended suffix index to support multiple items per ticket and prevent duplicates)
- `customer_name` (string)
- `item_description` (string)
- `type` (enum: 'S', 'G', 'C', 'P')
- `amount` (decimal/numeric, mapped from 'Nett')
- `deduction` (decimal/numeric, mapped from 'Deduction')
- `created_at` (timestamp)

## System Boundaries & Invariants
- **Authentication:** All routes except `/login` must be protected.
- **Data Isolation:** Stylists must NEVER be able to query or view transactions belonging to another `profile_id` (Enforce via Supabase RLS - Row Level Security).
- **Idempotent Uploads:** The CSV parser must gracefully handle duplicate uploads. If a transaction's `reference_no` already exists in the database, it should be ignored or updated, not duplicated.
- **Branch Suffix Resolution:**
  - Suffix `none` (default) -> Bangsar
  - Suffix `-2` -> KLGCC
  - Suffix `-3` -> SS2