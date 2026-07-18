# Feature Spec: Department Targets & Stylist Profiles

This feature specification details the plan and architecture to support setting and tracking sales targets per department (HAIR, NAILS, and ARTISTRY/LASH), assigning stylists to departments and roles, and updating the admin analytics dashboard with department-specific progress metrics.

---

## Architectural Context & Requirements

### 1. Department Mapping & Targets (2026)
The overall salon target of **RM 9,000,000.00** is divided among three core departments:
- **HAIR** (referred to as **HS** in data sheets): **RM 5,044,500.00**
- **NAILS**: **RM 1,561,500.00**
- **ARTISTRY/LASH** (referred to as **Artistry & Lash**): **RM 2,394,000.00**

### 2. Profile Management
- Assign each stylist to a specific **department** (`HAIR`, `NAILS`, or `ARTISTRY_LASH`) in their profile.
- Allow admins to edit the stylist's **role** (`admin` | `stylist`) and **department** in the Team Manager dialogs.

### 3. Dynamic Analytics
- Map each transaction's department dynamically based on the performing stylist's assigned department.
- Display annual targets, actual performance, and progress/pace indicators for *each* department alongside the overall total on the Admin Dashboard.
- Allow admins to configure target amounts per department for any given year.

---

## Phase 1: Database Migration & Profile Management

In this phase, we establish the schema updates, write SQL migrations, update database type definitions, and implement profile management for roles and departments in the team manager.

### 1.1 Database Migration (SQL)
We need to update `public.profiles` to support `department` and update `public.targets` to be keyed by both `year` and `department`.

```sql
-- 1. Update public.profiles
-- Add department column if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS department text;

-- Add check constraint for department validation
ALTER TABLE public.profiles 
ADD CONSTRAINT profiles_department_check 
CHECK (department IN ('HAIR', 'NAILS', 'ARTISTRY_LASH'));

-- 2. Restructure public.targets for composite primary key
-- Drop existing single-column primary key constraint (was 'year')
ALTER TABLE public.targets DROP CONSTRAINT IF EXISTS targets_pkey;

-- Add department column to targets
ALTER TABLE public.targets 
ADD COLUMN IF NOT EXISTS department text NOT NULL DEFAULT 'TOTAL';

-- Add check constraint for department in targets table
ALTER TABLE public.targets 
ADD CONSTRAINT targets_department_check 
CHECK (department IN ('HAIR', 'NAILS', 'ARTISTRY_LASH', 'TOTAL'));

-- Set new composite primary key on (year, department)
ALTER TABLE public.targets 
ADD CONSTRAINT targets_pkey PRIMARY KEY (year, department);

-- 3. Populate 2026 targets based on requirements
INSERT INTO public.targets (year, department, target_amount) VALUES
  (2026, 'TOTAL', 9000000.00),
  (2026, 'HAIR', 5044500.00),
  (2026, 'NAILS', 1561500.00),
  (2026, 'ARTISTRY_LASH', 2394000.00)
ON CONFLICT (year, department) 
DO UPDATE SET target_amount = EXCLUDED.target_amount;
```

### 1.2 Type Safety (`types/database.types.ts`)
Add `department` to the `profiles` Row, Insert, and Update types, and update `targets` types to include `department: string` as part of the model.

### 1.3 Team Manager updates (`app/admin/team/`)
- **Add Stylist & Edit Stylist Dialogs (`TeamManager.tsx`)**:
  - Add a `<select>` dropdown for **Department** (`HAIR` | `NAILS` | `ARTISTRY_LASH`).
  - Add a `<select>` dropdown for **Role** (`stylist` | `admin`).
- **Server Actions (`actions.ts`)**:
  - Update `createStylistAction` to accept `department` and `role` from the FormData and insert them into Supabase Auth and the `profiles` table.
  - Update `updateStylistAction` to accept and update `department` and `role` in both Auth and DB.

---

## Phase 2: Analytics & Dashboard Integration

In this phase, we update the data fetching logic to calculate department-specific sales and update the Admin Dashboard UI to display progress charts and allow configuring targets per department.

### 2.1 Optimized Sales Aggregation (Supabase RPC)
Create a new database function that groups YTD and monthly sales by department in a single query.

```sql
CREATE OR REPLACE FUNCTION get_sales_by_department(
  start_date timestamptz,
  end_date timestamptz
) RETURNS TABLE (
  department text,
  sales_sum numeric
) AS $$
  SELECT 
    COALESCE(p.department, 'UNASSIGNED') as department,
    COALESCE(SUM(t.amount), 0) as sales_sum
  FROM public.transactions t
  LEFT JOIN public.profiles p ON t.profile_id = p.id
  WHERE t.transaction_date >= start_date
    AND t.transaction_date < end_date
    AND t.amount != 0
  GROUP BY p.department;
$$ LANGUAGE sql STABLE;
```

### 2.2 Admin Dashboard Integration (`app/admin/page.tsx`)
- Fetch YTD sales grouped by department using `get_sales_by_department`.
- Fetch monthly sales grouped by department for the selected month.
- Fetch all target rows for the selected year:
  - `TOTAL` target (fallback to sum if missing)
  - `HAIR` target
  - `NAILS` target
  - `ARTISTRY_LASH` target
- Display the target progress section as a grid of cards:
  - **Overall Progress**: RM 9M target vs. overall actual.
  - **HAIR Progress**: RM 5,044,500 target vs. actual HAIR sales.
  - **NAILS Progress**: RM 1,561,500 target vs. actual NAILS sales.
  - **ARTISTRY/LASH Progress**: RM 2,394,000 target vs. actual LASH sales.
  - Each card will display a custom progress bar, pacing percentage, and standard metrics.

### 2.3 Targets Configuration Dialog (`app/admin/EditTargetDialog.tsx` & actions)
- Update `EditTargetDialog.tsx` to display inputs for each department's target amount (HAIR, NAILS, and ARTISTRY/LASH).
- Display the calculated total (sum of the three) in real-time.
- Update `updateYearlyTargetAction` server action to upsert targets for each department (`HAIR`, `NAILS`, `ARTISTRY_LASH`) as well as the computed `TOTAL` target row.
