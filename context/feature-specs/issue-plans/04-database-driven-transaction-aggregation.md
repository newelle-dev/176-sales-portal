# Plan: Database-Driven Transaction Aggregation

## 1. Context & Objective
* **Performance Issue:** The Admin Dashboard (`app/admin/page.tsx`) currently fetches all transaction records for the selected month using the `fetchAllTransactions` utility. It then processes thousands of raw records in Node.js memory to compute total sales, transaction counts, branch contribution splits, sales category mix values, and the stylist leaderboard. As transaction volume scales, fetching and looping over every transaction will increase network load, slow down Server Component renders, and waste database read resources.
* **Goal:** Offload transaction aggregations to the PostgreSQL database using custom Supabase Database Functions (RPC). Instead of fetching thousands of raw rows, the server will retrieve only pre-aggregated summary datasets (~3 rows for branch sales, 3 rows for category mix, ~20 rows for leaderboard, and 1 row for summary metrics).

---

## 2. Proposed Changes

### 2.1 Database Updates (SQL)
We will define four database functions under the `public` schema in Supabase. These functions run on the database server to perform the aggregation.

```sql
-- 1. Get Monthly Sales and Transaction Count
CREATE OR REPLACE FUNCTION public.get_monthly_sales_summary(start_date timestamptz, end_date timestamptz)
RETURNS TABLE(sales_sum numeric, tx_count bigint)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COALESCE(SUM(t.amount), 0)::numeric as sales_sum,
    COUNT(*)::bigint as tx_count
  FROM public.transactions t
  WHERE t.transaction_date >= start_date
    AND t.transaction_date < end_date
    AND t.amount <> 0;
$$;

-- 2. Get Monthly Sales by Branch
CREATE OR REPLACE FUNCTION public.get_monthly_branch_sales(start_date timestamptz, end_date timestamptz)
RETURNS TABLE(branch text, sales_sum numeric)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT COALESCE(t.branch, 'Bangsar') as branch, SUM(t.amount)::numeric as sales_sum
  FROM public.transactions t
  WHERE t.transaction_date >= start_date
    AND t.transaction_date < end_date
    AND t.amount <> 0
  GROUP BY COALESCE(t.branch, 'Bangsar');
$$;

-- 3. Get Monthly Sales by Category Mix
CREATE OR REPLACE FUNCTION public.get_monthly_sales_mix(start_date timestamptz, end_date timestamptz)
RETURNS TABLE(category text, sales_sum numeric)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    CASE 
      WHEN t.type = 'S' OR (t.type = 'C' AND t.amount < 0) THEN 'alacarte'
      WHEN t.type = 'G' OR (t.type = 'C' AND t.amount >= 0) THEN 'packages'
      WHEN t.type = 'P' THEN 'products'
      ELSE 'other'
    END as category,
    SUM(t.amount)::numeric as sales_sum
  FROM public.transactions t
  WHERE t.transaction_date >= start_date
    AND t.transaction_date < end_date
    AND t.amount <> 0
  GROUP BY 
    CASE 
      WHEN t.type = 'S' OR (t.type = 'C' AND t.amount < 0) THEN 'alacarte'
      WHEN t.type = 'G' OR (t.type = 'C' AND t.amount >= 0) THEN 'packages'
      WHEN t.type = 'P' THEN 'products'
      ELSE 'other'
    END;
$$;

-- 4. Get Monthly Stylist Leaderboard
CREATE OR REPLACE FUNCTION public.get_monthly_stylist_leaderboard(start_date timestamptz, end_date timestamptz)
RETURNS TABLE(employee_name text, amount numeric, count bigint, branch text)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    t.employee_name,
    SUM(t.amount)::numeric as amount,
    COUNT(*)::bigint as count,
    COALESCE(MAX(t.branch), 'Bangsar') as branch
  FROM public.transactions t
  WHERE t.transaction_date >= start_date
    AND t.transaction_date < end_date
    AND t.amount <> 0
  GROUP BY t.employee_name
  ORDER BY amount DESC;
$$;
```

### 2.2 Application Refactoring
#### [MODIFY] [page.tsx](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/page.tsx)

* **Update Server Component Fetch logic:**
  Remove `fetchAllTransactions` import and call.
  In the `Promise.all` query block, fetch pre-aggregated data using the new database functions:
  ```typescript
  const [
    ytdSalesRes,
    ytdDeptSalesRes,
    monthSummaryRes,
    branchSalesRes,
    salesMixRes,
    leaderboardRes
  ] = await Promise.all([
    supabase.rpc('get_sales_sum', { start_date: startOfYear, end_date: startOfNextYear }),
    supabase.rpc('get_sales_by_department', { start_date: startOfYear, end_date: startOfNextYear }),
    supabase.rpc('get_monthly_sales_summary', { start_date: startOfMonth, end_date: startOfNextMonth }),
    supabase.rpc('get_monthly_branch_sales', { start_date: startOfMonth, end_date: startOfNextMonth }),
    supabase.rpc('get_monthly_sales_mix', { start_date: startOfMonth, end_date: startOfNextMonth }),
    supabase.rpc('get_monthly_stylist_leaderboard', { start_date: startOfMonth, end_date: startOfNextMonth }),
  ]);
  ```

* **Replace in-memory aggregation math:**
  Extract values directly from RPC responses:
  1. **Summary sales & transaction count:**
     ```typescript
     const monthSales = Number(monthSummaryRes.data?.[0]?.sales_sum || 0);
     const monthTxCount = Number(monthSummaryRes.data?.[0]?.tx_count || 0);
     ```
  2. **Branch contributions:**
     ```typescript
     const branchMap = { Bangsar: 0, SS2: 0, KLGCC: 0 };
     branchSalesRes.data?.forEach(row => {
       if (row.branch in branchMap) {
         branchMap[row.branch as keyof typeof branchMap] = Number(row.sales_sum);
       }
     });
     const branchTotal = branchMap.Bangsar + branchMap.SS2 + branchMap.KLGCC;
     ```
  3. **Sales Category Mix:**
     ```typescript
     let alacarteSum = 0;
     let packageSum = 0;
     let productSum = 0;
     salesMixRes.data?.forEach(row => {
       if (row.category === 'alacarte') alacarteSum = Number(row.sales_sum);
       else if (row.category === 'packages') packageSum = Number(row.sales_sum);
       else if (row.category === 'products') productSum = Number(row.sales_sum);
     });
     const mixTotal = alacarteSum + packageSum + productSum;
     ```
  4. **Leaderboard:**
     ```typescript
     const leaderboard = leaderboardRes.data || [];
     ```

---

## 3. Verification Plan

### Automated Verification
* Run compilation check:
  ```powershell
  npm run build
  ```

### Manual Verification
1. Run the migration SQL in the Supabase SQL editor to create the four RPC functions.
2. Navigate to the Admin Dashboard on the local server.
3. Compare the totals, branch percentages, category mix values, and stylist rankings for a selected month (e.g., July 2026) against the production or original values to verify that results match down to the cent.
4. Verify that navigation between different months updates all metrics correctly.
