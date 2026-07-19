# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- V1 Core Setup

## Current Goal

- Build foundation & implement authentication/database integration

## Completed

- Created Admin Account: Added a new administrator account (`Admin`, username: `admin176`, email: `admin@example.com`, role: `admin`, password: `password123`) using the Supabase Auth Admin API and synced it to `public.profiles`.
- Synced and Bulk-Created Stylist Profiles: Processed all 54 stylists and assistants. Set their emails to the `[name]@example.com` format, usernames to case-insensitive lowercase names, and populated their WessConnect CSV name alias mappings (`wess_names`) in the `public.profiles` table. Verified that all 23,650 transaction records in the database were successfully matched and retroactively linked to their profiles.
- Redesigned Team Manager Dialogs (Add and Edit Stylist): Restructured the dialog layouts into a responsive two-column grid and moved the searchable transaction name list to a popover dropdown (closing on click outside), saving over 200px of vertical height. Implemented browser autofill mitigation using dummy inputs and `autoComplete` attributes, and styled selects with Lucide ChevronDown icons.
- Implemented username-based login (Option A): Added a case-insensitive unique `username` column to `public.profiles`, updated trigger functions to support it, and modified login server actions to dynamically resolve emails via user's usernames. Integrated username management in the admin Team Manager UI with uniqueness validations and search capabilities.
- Implemented database-driven aggregations for the Admin Dashboard (Issue 4): Created four custom Supabase database functions (`get_monthly_sales_summary`, `get_monthly_branch_sales`, `get_monthly_sales_mix`, `get_monthly_stylist_leaderboard`) to offload transaction processing to PostgreSQL. Regenerated TypeScript definitions in `types/database.types.ts` and refactored the admin page to query these aggregates directly, eliminating all in-memory aggregation loops.
- Implemented accessibility and error handling improvements in the Admin module (Issue 5): Added `role="progressbar"` and detailed ARIA tags (`aria-valuenow`, `aria-label`) to all target achievement progress bars and contribution meters. Added descriptive `aria-label` tags to icon-only buttons in `UploadZone.tsx` and `TeamManager.tsx`. Added a database fetch error check and warning banner with a retry link on the admin dashboard.
- Resolved Edit Target Dialog Cascading Renders: Removed the `useEffect` hook in `app/admin/EditTargetDialog.tsx` to eliminate ESLint cascading renders warnings, utilizing a key-based remounting mechanism on the dialog instance in `app/admin/page.tsx` when target values or year change. Cleaned up the unused `initialTotal` prop from types and destructured variables.
- Secured Team Management Server Actions: Added session authentication and admin-role verification checks to `createStylistAction`, `updateStylistAction`, and `deleteStylistAction` in `app/admin/team/actions.ts` to prevent unauthorized execution. Refactored the catch-block errors from `any` to `unknown` for strict type safety.
- Validated July 2026 sales data: confirmed 100% data consistency between all 6 uploaded CSV files and the Supabase transaction records (rows, nett sales, and deductions match exactly across all branches).
- Fixed Admin Dashboard data fetching bugs: added paginated query logic (`fetchAllTransactions`) to bypass Supabase's silent 1000-row PostgREST limit; optimized YTD Sales calculation to use a newly created database function `get_sales_sum` (RPC) for scale-resilient sums; and corrected the filter to include negative type-C redemptions while keeping ESD transactions excluded.
- Implemented Admin Dashboard improvements: registered custom color variables (`gray-150`, `gray-250`, `gray-450`, `gray-405`, `red-650`, `slate-350`, `orange-850`) in Tailwind v4 `@theme inline` block in `app/globals.css` to fix uncompiled color tokens; resolved the off-by-one error in the yearly progress pace calculation; added "Year Not Started" status text for future years; and added server-side query error logging for admin data fetches.
- Rebuilt the root `/admin` page as a dedicated Overview & Stats Dashboard. It displays annual target progress with a live pacing indicator, monthly milestone achievement metrics, branch contribution meters, a categorical sales mix, and a dynamic stylist leaderboard sorted by Nett Sales (all calculations correctly exclude deduction sales).
- Split the admin panel layouts by moving the drag-and-drop CSV Upload Zone and Danger Zone components to a separate, dedicated `/admin/upload` page.
- Updated `components/admin/AdminHeader.tsx` to include clear navigation links for "Dashboard" and "Upload CSV".
- Created the `public.targets` table in Supabase and implemented a target settings configuration modal dialog on the dashboard allowing admins to edit targets dynamically via `updateYearlyTargetAction` Server Action.
- Added type definitions for `public.targets` in `types/database.types.ts` for end-to-end type safety.
- Added a second main KPI card on the stylist dashboard to display Total Monthly Sales excluding deductions (representing revenue from services, packages, and products), alongside the total including deductions, providing stylists with clear and comprehensive metrics.
- Implemented a "Danger Zone" section on the Admin dashboard to clear all transaction records. This includes a secure Server Action `clearTransactionsAction` verifying admin authentication, a double-confirmation Dialog prompting the user to type `DELETE` to confirm, and cache revalidation for dashboard route updates.
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
- Streamlined the daily WessConnect CSV upload workflow by implementing batch multi-file uploading in `UploadZone.tsx`, aggregating success statistics per file/branch, and introducing an unmapped employee warnings panel with a direct link to Team Manager. Corrected branch suffix mapping to: no suffix = Bangsar, `-2` = KLGCC, and `-3` = SS2. Verified compilation via a successful full production build (`npm run build`).
- Implemented robustness fixes in server-side and script CSV parsing (handling `(asst)` in name normalization, supporting slashes in date parsing, trimming header cells, chunking Supabase upsert calls in chunks of 300, and adding immediate path revalidation for stylist dashboards).
- Corrected timezone offset mismatch bug where transaction dates from WessConnect CSVs (stored without offsets in the database's `timestamptz` columns) were interpreted as UTC and displayed 8 hours ahead (shifted into the next day) in the browser. Updated parsing helpers to append `+08:00` offset, adjusted month boundaries in dashboard queries, configured frontend formatting and grouping to explicitly use the `'Asia/Kuala_Lumpur'` timezone, and executed database correction SQL to shift all existing records back by 8 hours.
- Adjusted Ala Carte sales aggregation and tab filtering to correctly categorize negative type `C` (redemption) and negative type `S` (price adjustment) transactions under Ala Carte rather than Packages. This ensures point redemptions subtract from both the daily totals and monthly totals of Ala Carte sales, and display correctly under the stylist's "Ala Carte" dashboard view.
- Adjusted the daily total sales calculations on the stylist dashboard's transaction list to dynamically adapt based on the selected tab filter. Ala Carte, Packages, and Products daily totals now exclude deduction values and only sum nett sales, while the Deductions tab sums deductions and the All tab sums both.
- Resolved the 3 critical issues from the code quality report: refactored transaction CSV parsing and stylist updates to utilize strong TypeScript signatures (eliminating `any` type holes), and created a request-memoized `getCachedSession` helper to reduce redundant database/auth round-trips from 4 to 2 on every dashboard page render. Updated the code quality report markdown file to reflect completion.
- Implemented support for parsing the new Wess "Employee Service Detail" CSV files. Added automatic format detection in `uploadCsvAction`, mapping the "Actual Value" of prepaid services directly to transaction deductions, setting `amount = 0` (so nett sales are unaffected), and prefixing reference numbers with `ESD_` to prevent key collisions. Successfully imported 701 prepaid service transactions across all branches and confirmed correct database aggregation in stylist total deductions.

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

