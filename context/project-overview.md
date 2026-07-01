# Project Overview: 176 Sales Report

## The Vision
"176 Sales Report" is an internal web application designed to replace a tedious, manual spreadsheet workflow for a hair salon. It automates the parsing of raw "WessConnect" software CSV exports and provides stylists with a zero-friction, mobile-first dashboard to track their daily and monthly sales.

## Target Audience
1. **Salon Admin/Manager:** Needs a fast, reliable way to upload daily WessConnect CSVs and manage staff access.
2. **Salon Stylists:** Need a simple, mobile-friendly way to see their current month's sales without dealing with complex apps or forgotten passwords.

## Key User Flows
- **Admin Flow:** Logs in -> Manages Team (adds name/email/password) -> Drags & drops `BANGSAR.csv` into the upload zone -> System parses, cleans, and saves the data.
- **Stylist Flow:** Opens app on mobile -> Logs in with Email/Password (stays logged in for 30 days) -> Views dashboard showing "Current Month" totals broken down by category.

## In Scope (Version 1)
- Simple Email/Password authentication via Supabase.
- Admin dashboard to manage users (Stylists).
- Secure Server Action to parse uploaded WessConnect CSV files.
- Filtering CSV logic to isolate: 'S' (Ala Carte), 'G'/'C' (Package), and 'P' (Product).
- Mobile-optimized Stylist dashboard showing Current Month sales metrics.

## Out of Scope (For Now)
- Commission/percentage calculations.
- Deduction tracking.
- SMS/WhatsApp Magic Link authentication (using standard Email/Password instead to keep it simple and free).
- Complex date range pickers for stylists (defaulting to Current Month).