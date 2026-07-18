# Code Standards & Conventions

## TypeScript & Framework
- Use strict TypeScript typing for all props, database responses, and state. Do not use `any` type overrides (use precise database row types from `@/types/database.types` or properly define types).
- Default to **Server Components** in Next.js App Router.
- Only use **Client Components** (`"use client"`) when interactivity (hooks, state, event listeners) is strictly required.
- Use the request-memoized `getCachedSession` helper in layouts, pages, or middleware to retrieve the active user session and profile. This reduces redundant database and authentication queries down to a single fetch per render cycle.

## Project Structure
- `/app` - Next.js App Router pages and API routes.
- `/components` - Reusable UI components (e.g., `ui/Button.tsx`, `dashboard/MetricCard.tsx`).
- `/lib` - Utility functions, Supabase client initialization, and CSV parser logic.
- `/types` - Shared TypeScript interfaces and database types.

## Styling (Tailwind)
- Avoid inline styles; use Tailwind classes exclusively.
- Extract highly repeated class combinations into reusable UI components rather than bloating standard files.
- Ensure all UI elements are mobile-responsive first (`md:` and `lg:` prefixes for larger screens).

## Data Fetching & Mutations
- Use Next.js Server Actions for form submissions and CSV uploading.
- Do not use client-side fetching for initial page loads (fetch directly in the Server Component and pass data down as props).