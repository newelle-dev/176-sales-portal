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
- `name` (string, exact match to how it appears in WessConnect CSV)
- `role` (enum: 'admin' | 'stylist')
- `created_at` (timestamp)

**2. Transactions Table**
- `id` (uuid, primary key)
- `profile_id` (uuid, foreign key to Profiles)
- `transaction_date` (timestamp)
- `reference_no` (string, unique constraint to prevent duplicate uploads)
- `customer_name` (string)
- `item_description` (string)
- `type` (enum: 'S', 'G', 'C', 'P')
- `amount` (decimal/numeric)
- `created_at` (timestamp)

## System Boundaries & Invariants
- **Authentication:** All routes except `/login` must be protected.
- **Data Isolation:** Stylists must NEVER be able to query or view transactions belonging to another `profile_id` (Enforce via Supabase RLS - Row Level Security).
- **Idempotent Uploads:** The CSV parser must gracefully handle duplicate uploads. If a transaction's `reference_no` already exists in the database, it should be ignored or updated, not duplicated.