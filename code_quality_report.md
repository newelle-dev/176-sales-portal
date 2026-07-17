# 176 Sales Portal — Code Quality Review

> **Stack:** Next.js App Router · TypeScript · Tailwind CSS · Supabase
> **Reviewed files:** 18 source files across `/app`, `/components`, `/lib`, `/types`

---

## Executive Summary

The codebase is **well-structured and production-ready** for a v1 internal tool. Architecture decisions are solid: Server Components for data fetching, Client Components only where interaction is required, Server Actions for mutations, and shared utility functions in `/lib`. The code is readable and the UI/UX is polished.

The findings below focus on the **gap between "good" and "excellent"** — mostly around consistency, edge-case handling, accessibility, and a few real bugs.

---

## 🟠 Important Issues

### 4. `totalSales` Calculation Incorrectly Adds Deductions
**File:** [`app/dashboard/page.tsx` L74](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/dashboard/page.tsx#L74)

```ts
// ❌ Current — deductionSum is added to totalSales, inflating it
totalSales: alacarteSum + packageSum + productSum + deductionSum,
```

Deductions are separate from sales revenue. The "Total Monthly Sales" KPI card will be misleading if deductions are counted as positive sales. If deductions are meant to be added (e.g. they represent real revenue from deduction transactions), this needs a comment explaining why. If not, remove `+ deductionSum`.

---

### 5. `aggregateTransactions` Uses Raw `txList` but Page Passes `resolvedTxList` to Child
**File:** [`app/dashboard/page.tsx` L155–L161](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/dashboard/page.tsx#L155-L161)

```ts
// The aggregation runs on the ORIGINAL txList (pre-description resolution)
const { sums, counts, totalSales } = aggregateTransactions(txList);
// But TransactionsList receives resolvedTxList (post-description resolution)
<TransactionsList transactions={resolvedTxList} />
```
This is correct — the aggregation doesn't need descriptions, only amounts. But it means `txList` is passed to aggregation and `resolvedTxList` to the list, which is subtle and could cause a future bug if someone refactors. A comment explaining this split would help.

---

### 6. Month Generation Hardcoded to Start Year 2026
**File:** [`app/dashboard/page.tsx` L102](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/dashboard/page.tsx#L102)

```ts
const startYear = 2026; // ❌ Hardcoded
```

This should be either a named constant (e.g. `LAUNCH_YEAR = 2026`) or derived from the earliest transaction in the DB. At minimum it should live in a config file, not buried in the render function.

---

### 7. Missing `aria-label` on Delete File Button in UploadZone
**File:** [`app/admin/UploadZone.tsx` L170–L180](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/UploadZone.tsx#L170-L180)

The "X" remove-file button has no `aria-label`. Screen readers will announce "button" with no context.

```tsx
// ✅ Fix
<button
  type="button"
  aria-label={`Remove ${file.name}`}
  onClick={(e) => { e.stopPropagation(); removeFile(idx); }}
  ...
>
  <X className="w-3.5 h-3.5" />
</button>
```

---

### 8. Edit Dialog `onOpenChange` Does Not Handle Open Case
**File:** [`app/admin/team/TeamManager.tsx` L343–L353](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/team/TeamManager.tsx#L343-L353)

```ts
// ❌ Current — handler is asymmetric: only runs cleanup on close
onOpenChange={(open) => {
  if (!open) {
    setIsEditOpen(false);
    ...
  }
}}
```

Compare to the Add dialog which calls `setIsAddOpen(open)` (the correct pattern). The Edit dialog never calls `setIsEditOpen(true)` from `onOpenChange`, which means if the dialog is closed externally (e.g. pressing Escape), it calls `setIsEditOpen(false)` but then the condition `if (!open)` would block setting `open` to true. This is a subtle asymmetry — while it works because `setIsEditOpen(true)` is called from the edit button click, it's fragile.

```ts
// ✅ Fix
onOpenChange={(open) => {
  setIsEditOpen(open);
  if (!open) {
    setSelectedStylist(null);
    setWessSearch('');
    setSelectedWessNames([]);
    setEditError(null);
  }
}}
```

---

### 9. Success Message Uses Markdown in JSX (Not Rendered)
**File:** [`app/admin/UploadZone.tsx` L218](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/UploadZone.tsx#L218)

```tsx
// ❌ Current — ** bold markers appear as literal text in the browser
<p>Imported/updated a total of **{result.insertedCount}** transaction records.</p>

// ✅ Fix — use JSX bold
<p>Imported/updated a total of <strong>{result.insertedCount}</strong> transaction records.</p>
```

Same issue at line 253:
```tsx
// ❌ are **not linked** to any active stylist...
// ✅ are <strong>not linked</strong> to any active stylist...
```

---

### 10. `WessNameSelector` Missing `htmlFor` on Label
**File:** [`components/admin/WessNameSelector.tsx` L69](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/components/admin/WessNameSelector.tsx#L69)

The `<label>` for the WessConnect name picker has no `htmlFor`, so clicking it doesn't focus the search input.

```tsx
// ✅ Fix
<label htmlFor="wess-name-search" className="...">
  WessConnect CSV Name Matches
</label>
<Input
  id="wess-name-search"
  ...
```

---

### 11. `TransactionsList` Tab Buttons Missing `tabpanel` Role on Their Controlled Panel
**File:** [`app/dashboard/TransactionsList.tsx` L167–L198](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/dashboard/TransactionsList.tsx#L167-L198)

The filter buttons correctly use `role="tab"` and `aria-selected`, but there's no associated `role="tabpanel"` wrapping the content below. The accordion content has `role="region"` but that's not the ARIA tab pattern. Either commit to the tabs ARIA pattern (add `role="tabpanel"` + `aria-labelledby`) or drop `role="tab"` from the filter buttons and use them as plain buttons.

---

## 🟡 Suggestions

### 12. Extract `availableMonths` Generation to a Utility
**File:** [`app/dashboard/page.tsx` L96–L120](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/dashboard/page.tsx#L96-L120)

The 24-line month-list generation loop is business logic that doesn't belong in the render function. Move it to `lib/transaction-utils.ts`:

```ts
// lib/transaction-utils.ts
export function generateAvailableMonths(startYear = 2026): MonthOption[] {
  const now = new Date();
  const months: MonthOption[] = [];
  let y = startYear, m = 0;
  while (y < now.getFullYear() || (y === now.getFullYear() && m <= now.getMonth())) {
    months.push({
      value: `${y}-${(m + 1).toString().padStart(2, '0')}`,
      label: new Date(y, m, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' }),
    });
    if (++m > 11) { m = 0; y++; }
  }
  return months.reverse();
}
```

---

### 13. Extract `startOfMonth` / `startOfNextMonth` Date Calculation to Utility
**File:** [`app/dashboard/page.tsx` L130–L135](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/dashboard/page.tsx#L130-L135)

This date-boundary calculation is repeated anywhere month-scoped queries are needed. Extract to `lib/transaction-utils.ts`.

---

### 14. `formatDate` in TransactionsList Should Be Hoisted Outside Component
**File:** [`app/dashboard/TransactionsList.tsx` L48–L54](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/dashboard/TransactionsList.tsx#L48-L54)

The `formatDate` function is defined inside the component and recreated on every render. The formatters (`dayFormatter`, `timeFormatter`) are already correctly hoisted, but `formatDate` wraps them in a new closure each render.

```ts
// ✅ Hoist outside the component
const formatDate = (dateStr: string): string => {
  try { return timeFormatter.format(new Date(dateStr)); } catch { return dateStr; }
};
```

---

### 15. `TeamManager` — State for Add/Edit/Delete Dialogs Could Be Consolidated
**File:** [`app/admin/team/TeamManager.tsx` L29–L45](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/team/TeamManager.tsx#L29-L45)

There are 9 state variables managing 3 dialogs. A single `dialogState` object or a custom `useDialogState` hook would reduce boilerplate:

```ts
type DialogMode = 'add' | 'edit' | 'delete' | null;
const [dialogMode, setDialogMode] = useState<DialogMode>(null);
// Scoped errors remain per-dialog for clarity
```

---

### 16. `filteredStylists` Should Be Memoized
**File:** [`app/admin/team/TeamManager.tsx` L48–L52](file:///c:/Users/alec/OneDrive/Desktop\alec176avenue/176-sales-portal/app/admin/team/TeamManager.tsx#L48-L52)

```ts
// ❌ Current — recalculates on every render
const filteredStylists = initialStylists.filter(...);

// ✅ Fix
const filteredStylists = useMemo(
  () => initialStylists.filter(...),
  [initialStylists, searchQuery]
);
```

---

### 17. `NAME_OVERRIDES` in `actions.ts` Should Live in a Config or `lib/` File
**File:** [`app/admin/actions.ts` L43–L49](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/actions.ts#L43-L49)

Hardcoded staff name overrides buried inside a server action file are hard to discover and maintain. Move to `lib/name-overrides.ts` or `lib/wess-config.ts`.

---

### 18. `getBranchFromRef` — Logic Duplication Between Colon-split and Non-colon Paths
**File:** [`app/admin/actions.ts` L95–L117](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/actions.ts#L95-L117)

The branch-suffix matching logic is duplicated:

```ts
// Both paths do: match /-(\\d+)$/ and check suffix === '2' | '3'
// ✅ Extract inner logic
function getSuffixBranch(refPart: string): string | null {
  const m = refPart.trim().match(/-(\d+)$/);
  if (!m) return null;
  if (m[1] === '2') return 'KLGCC';
  if (m[1] === '3') return 'SS2';
  return null;
}
```

---

### 19. `getTransactionCategory` — `C` with `amount === 0` Treated as Package
**File:** [`lib/transaction-utils.ts` L29–L30](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/lib/transaction-utils.ts#L29-L30)

```ts
if (tx.type === 'S' || (tx.type === 'C' && tx.amount < 0)) return 'alacarte';
if (tx.type === 'G' || (tx.type === 'C' && tx.amount >= 0)) return 'packages'; // ← 0 goes here
```

A `C` transaction with `amount === 0` is classified as a Package. Is this intentional? A zero-amount `C` transaction could also be a voided/cancelled entry. This should be documented or handled explicitly.

---

### 20. Middleware Reads Role from `app_metadata` but Profiles Table Has Its Own `role` Column
**File:** [`lib/supabase/middleware.ts` L41, L61, L74](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/lib/supabase/middleware.ts#L41)

The middleware reads `user.app_metadata?.role` for routing. The `profiles` table also has a `role` column. If these ever get out of sync (e.g., manual DB edit), the routing will be incorrect while the data layer is correct. This is a known Supabase pattern — just worth documenting that `app_metadata.role` is the authoritative source for auth, and a DB trigger keeps them in sync.

---

### 21. `cleanItemDescription` Regex May Not Match All Category Prefix Patterns
**File:** [`lib/transaction-utils.ts` L74](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/lib/transaction-utils.ts#L74)

```ts
.replace(/^[^:]+:\s*(?:A La Carte|Package|Product)?\s*-\s*/i, '')
```

This only strips the prefix if it contains `A La Carte`, `Package`, `Product`, or nothing between `:` and ` - `. New categories added to WessConnect will silently not be stripped. Consider making this more permissive or logging unmatched prefixes.

---

### 22. `MonthSelector` — `<select>` Caret Hidden Behind Spinner
**File:** [`app/dashboard/MonthSelector.tsx` L51–L53](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/dashboard/MonthSelector.tsx#L51-L53)

When `isPending`, the Loader2 spinner overlaps the native select's dropdown arrow. Since the select is `disabled={isPending}`, this is cosmetically fine but visually jarring. Consider an opacity fade on the select instead.

---

### 23. `loading.tsx` `aria-busy` Not Set
**File:** [`app/dashboard/loading.tsx`](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/dashboard/loading.tsx)

The loading skeleton has no `aria-busy="true"` or `aria-label` to signal to screen readers that content is loading. Add `aria-busy="true"` and `aria-label="Loading dashboard"` to the `<main>` element.

---

## 💡 Nitpicks

### 24. `w-5.5` is Not a Standard Tailwind Class
**File:** [`app/dashboard/page.tsx` L204](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/dashboard/page.tsx#L204)

`w-5.5` and `h-5.5` are not in the default Tailwind v3 scale. This might work if you have arbitrary values enabled, but it's cleaner to use `w-5` or `w-6`.

---

### 25. Lucide `Calendar` Icon Used for Both Date Header and Transaction Icon
**File:** [`app/dashboard/TransactionsList.tsx` L210, L231](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/dashboard/TransactionsList.tsx#L210)

The `Calendar` icon is used for both the empty-state illustration and the accordion header date icon. This is fine but a `CalendarDays` or different icon for the accordion header would improve visual distinction.

---

### 26. Unused `React` Import
**File:** [`components/admin/WessNameSelector.tsx` L3](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/components/admin/WessNameSelector.tsx#L3)

```ts
import React from 'react'; // Not needed in Next.js with React 18+
```

Same in `TeamManager.tsx` L3.

---

### 27. `dayFormatter` and `timeFormatter` in `TransactionsList` Could Move to `lib/`
**File:** [`app/dashboard/TransactionsList.tsx` L19–L33](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/dashboard/TransactionsList.tsx#L19-L33)

The `Intl.DateTimeFormat` instances are hoisted (good!), but they live inside the component file. Moving them to `lib/transaction-utils.ts` would make them testable and reusable across components.

---

### 28. `loading.tsx` Does Not Have a `role="status"` for Screen Readers
The loading skeleton should communicate its state:
```tsx
<main role="status" aria-label="Loading dashboard" aria-busy="true" ...>
```

---

## Summary Table

| # | Severity | Area | File | Issue |
|---|----------|------|------|-------|
| 4 | 🟠 Important | Business Logic | `dashboard/page.tsx:74` | Deductions added to Total Monthly Sales |
| 5 | 🟠 Important | Code Clarity | `dashboard/page.tsx:155` | Silent `txList` vs `resolvedTxList` split |
| 6 | 🟠 Important | Maintainability | `dashboard/page.tsx:102` | Hardcoded `startYear = 2026` |
| 7 | 🟠 Important | Accessibility | `admin/UploadZone.tsx:170` | Missing `aria-label` on remove-file button |
| 8 | 🟠 Important | Bug | `admin/team/TeamManager.tsx:343` | Edit dialog `onOpenChange` asymmetry |
| 9 | 🟠 Important | UI Bug | `admin/UploadZone.tsx:218` | Markdown `**bold**` renders as literal text |
| 10 | 🟠 Important | Accessibility | `WessNameSelector.tsx:69` | `<label>` missing `htmlFor` |
| 11 | 🟠 Important | Accessibility | `TransactionsList.tsx:167` | Incomplete ARIA tab pattern |
| 12 | 🟡 Suggestion | Code Quality | `dashboard/page.tsx:96` | Extract month-gen to utility |
| 13 | 🟡 Suggestion | Code Quality | `dashboard/page.tsx:130` | Extract date-boundary calc to utility |
| 14 | 🟡 Suggestion | Performance | `TransactionsList.tsx:48` | `formatDate` recreated per render |
| 15 | 🟡 Suggestion | Code Quality | `TeamManager.tsx:29` | 9 state variables for 3 dialogs |
| 16 | 🟡 Suggestion | Performance | `TeamManager.tsx:48` | `filteredStylists` not memoized |
| 17 | 🟡 Suggestion | Maintainability | `admin/actions.ts:43` | `NAME_OVERRIDES` should be in `/lib` |
| 18 | 🟡 Suggestion | Code Quality | `admin/actions.ts:95` | `getBranchFromRef` inner logic duplication |
| 19 | 🟡 Suggestion | Business Logic | `transaction-utils.ts:30` | `C` + `amount === 0` → Package (undocumented) |
| 20 | 🟡 Suggestion | Maintainability | `middleware.ts:41` | `app_metadata.role` vs `profiles.role` undocumented |
| 21 | 🟡 Suggestion | Correctness | `transaction-utils.ts:74` | `cleanItemDescription` regex too narrow |
| 22 | 🟡 Suggestion | UX | `MonthSelector.tsx:51` | Spinner overlaps select caret |
| 23 | 🟡 Suggestion | Accessibility | `loading.tsx` | Missing `aria-busy` + `role="status"` |
| 24 | 💡 Nitpick | CSS | `dashboard/page.tsx:204` | `w-5.5` / `h-5.5` non-standard Tailwind |
| 25 | 💡 Nitpick | UX | `TransactionsList.tsx:210` | `Calendar` icon dual-use |
| 26 | 💡 Nitpick | Code Quality | `WessNameSelector.tsx:3` | Unused `React` import |
| 27 | 💡 Nitpick | Code Quality | `TransactionsList.tsx:19` | Date formatters could live in `/lib` |
| 28 | 💡 Nitpick | Accessibility | `loading.tsx` | Missing `role="status"` on skeleton |

---

## What's Already Great ✅

- **Server Components by default** — page.tsx is a proper async Server Component with data fetching at the top.
- **RLS enforced at query level** — `eq('profile_id', user.id)` prevents cross-user data leaks even if RLS is misconfigured.
- **ITEM_DICTIONARY pre-resolution** — the 37KB dictionary stays server-side; clients get clean strings. Excellent optimization.
- **`useMemo` in TransactionsList** — filtering + grouping + sorting is all memoized correctly.
- **`useTransition` for mutations** — all three CRUD dialogs use transitions, keeping the UI responsive.
- **Loading skeleton** — pixel-accurate match to the real layout; no layout shift.
- **`Intl.DateTimeFormat` hoisted** — avoids constructing formatters on every render.
- **`getTransactionCategory` shared** — the same function drives both server aggregation and client filtering, ensuring consistency.
- **WessNameSelector is a clean, reusable component** with good prop-typing and documentation.
- **Server Actions are well-typed** with explicit `Promise<ActionState>` return types.
- **Middleware role-based routing** — clean and complete; handles all edge cases (admin to dashboard, stylist to admin, etc.).
- **Idempotent upserts** — `onConflict: 'reference_no'` prevents duplicate imports.
- **CSV BOM stripping** — a real-world CSV compatibility detail properly handled.
