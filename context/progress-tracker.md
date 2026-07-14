# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- V1 Core Setup

## Current Goal

- Build foundation & implement authentication/database integration

## Completed

- Set up design system and UI primitive components (Button, Card, Dialog, Input, ScrollArea, Tabs, TextArea) and `lib/utils.ts` `cn()` helper.
- Set up Supabase project, database schema (Profiles & Transactions tables), triggers, RLS policies, and configured client/server/admin/middleware integration.
- Implemented Email/Password authentication screens (Login page & Server Actions with role-based redirection).
- Completed a comprehensive typography, spacing, and monochromatic light-theme overhaul across all pages (Login page, Admin dashboards, Team manager, Dialogs, Tables, and Stylist views) while preserving files in `components/ui`. Corrected the circular `--font-sans` reference to load Geist Sans correctly.
- Implemented Server Action `uploadCsvAction` using PapaParse to parse, clean, filter, and upsert WessConnect CSV transaction records. Added employee name mapping/normalization logic to link rows to `profile_id`s, and determined branches dynamically based on transaction reference numbers. Created a responsive, monochromatic drag-and-drop `UploadZone` client interface displaying import statistics and missing profile validation alerts.
- Bulk-imported 63 unique stylists and assistants parsed from the WessConnect CSV files into Supabase Auth and synced to the database profiles table, resolving all "Missing employee profile" import warnings.
- Removed the Employee Alignment & Critical Safeguard import halting rule during CSV upload, allowing transactions for matched stylists to be imported directly, while skipping rows with unmatched employees without halting the process or throwing validation errors.
- Added `branch` and `employee_name` columns to the `transactions` table, made `profile_id` nullable, and updated foreign key constraints to `ON DELETE SET NULL`. Integrated branch resolution based on reference number suffixes (Bangsar, SS2, KLGCC) and implemented unique suffixing on tickets to support multiple transaction items per ticket. Bulk-imported 2,496 transactions from your three CSV files.
- Implemented WessConnect CSV name alias matching in Team Management. Added a GIN-indexed `wess_names` (`text[]`) column to `public.profiles` and a Postgres trigger `tr_link_transactions_on_profile_change` to retroactively link unlinked transactions when profiles are added or updated. Updated Team Manager forms and Server Actions to manage matches, and synced the main CSV upload action and local import scripts to support alias resolution.
- Replaced the manual text input for WessConnect CSV name alias matches in the Team Manager's Add and Edit dialogs with a searchable multi-select UI. Admin can now select from a list of unique names loaded directly from the `transactions` table using a newly created `get_distinct_employee_names()` RPC database function. Added support for adding custom names dynamically if not present in the database.
- Implemented the mobile-first Stylist Dashboard (`/dashboard`) layout, featuring a dynamic sticky header with stylist avatar-initials and sign-out logic. Integrated server-side Supabase fetches for transactions, allowing stylists to choose and view any month's performance starting from January 2026. Built responsive UI metrics cards for Ala Carte, Package, Product, and Deduction sales (counting deductions as positive sales). Integrated a client-side searchable, filterable transaction history list with cleaned customer names.
- Redesigned the stylist dashboard's transaction list to group records by local calendar day under custom interactive accordion items (defaulting to collapsed). The headers dynamically summarize daily sales counts and totals, and expand smoothly to show individual transactions with branch and deduction badges.

## In Progress

- None.

## Next Up

- V1 release verification and stylist feedback.

## Open Questions

- None yet.

## Architecture Decisions

- Built design system using shadcn/ui components customized for Tailwind v4 and the dark theme.
- Utilized Next.js 16's updated `proxy.ts` convention (which deprecates `middleware.ts`) for session management and route guards at the root level.
- Built triggers to sync `auth.users` to `public.profiles` and cache roles inside JWT `app_metadata` to avoid database queries on every route request in `proxy.ts`.

## Session Notes

- Verified all primitives and connection modules compile and build successfully using `npm run build`.

