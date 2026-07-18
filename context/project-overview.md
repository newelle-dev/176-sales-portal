# Project Overview: 176 Sales Report

## The Vision
"176 Sales Report" is an internal web application designed to replace a tedious, manual spreadsheet workflow for a hair salon. It automates the parsing of raw "WessConnect" software CSV exports and provides stylists with a zero-friction, mobile-first dashboard to track their daily and monthly sales.

## Target Audience
1. **Salon Admin/Manager:** Needs a fast, reliable way to upload daily WessConnect CSVs, manage staff access, map CSV name variations, and reset/clear data safely.
2. **Salon Stylists:** Need a simple, mobile-friendly way to see their monthly sales performance, broken down by category, without dealing with complex apps or forgotten passwords.

## Key User Flows
- **Admin Flow:** Logs in -> Manages Team (adds/edits stylists, configures WessConnect CSV name aliases using a searchable multi-select UI) -> Drags & drops CSV files (standard transaction reports or Employee Service Detail reports) into the upload zone -> System parses, maps to profiles, resolves branch, and upserts data. An admin can also clear all transaction records using the Danger Zone.
- **Stylist Flow:** Opens app on mobile -> Logs in with Email/Password (stays logged in for 30 days) -> Views dashboard showing monthly totals (broken down by Ala Carte, Packages, Products, and Deductions), overall performance metrics, and a daily-grouped accordion list of transaction history.

## In Scope (Version 1)
- Simple Email/Password authentication via Supabase (role-based route guards and redirection).
- Admin dashboard to manage team members (Stylists) and configure name aliases.
- Secure Server Action to parse, clean, filter, and upsert uploaded WessConnect CSV files (both standard transactions and Employee Service Detail formats).
- Filtering CSV logic to isolate: 'S' (Ala Carte), 'G'/'C' (Package), and 'P' (Product) types.
- Support for Employee Service Detail (ESD) CSV format: prepaid services' Actual Value is mapped directly to transaction deductions (setting Nett Sales/amount = 0), and reference numbers are prefixed with `ESD_` to avoid key collisions.
- Mobile-optimized Stylist dashboard showing performance metrics (Ala Carte, Package, Product, and Deduction sales) and a collapsible daily-grouped transaction list.
- Month-by-month navigation starting from January 2026.
- Admin Danger Zone to clear all transaction records with double-confirmation.
- Automatic retro-linking of historical transactions when new name aliases are configured for a profile.

## Out of Scope (For Now)
- Commission/percentage calculations.
- SMS/WhatsApp Magic Link authentication (using standard Email/Password instead to keep it simple and free).
- Custom day-range selection/pickers (stylists browse performance by calendar month).