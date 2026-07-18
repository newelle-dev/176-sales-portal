# Code Quality Review: Admin Module (`app/admin`)

This document reviews the codebase under [app/admin](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin) to identify improvements in security, code quality, maintainability, performance, accessibility, and user experience.

---

## 1. Security & Authorization

### 🟢 [RESOLVED] Critical: Unauthorized Server Actions
* **Location:** [app/admin/team/actions.ts](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/team/actions.ts) (`createStylistAction`, `updateStylistAction`, `deleteStylistAction`)
* **Issue:** These Server Actions instantiate the `createAdminClient()` (using the `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS) and perform user administration operations directly. However, they **completely omit** session and role checks. Any client can invoke these Server Actions via HTTP POST requests without authentication, allowing them to create accounts, modify any account's details (including changing admin emails and passwords), or delete stylists.
* **Implementation:** Resolved by importing `createClient` from `@/lib/supabase/server` and inserting the following verification block at the entry point of each action:
  ```typescript
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Unauthorized: No active session.' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'admin') {
    return { error: 'Unauthorized: Only admins can manage team members.' };
  }
  ```
  Additionally, the error catch blocks were refactored from `catch (error: any)` to `catch (error: unknown)` to comply with strict TypeScript guidelines.

---

## 2. Code Quality & Maintainability

### 🟠 Important: Hardcoded Name Overrides
* **Location:** [app/admin/actions.ts](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/actions.ts#L44-L50) (`NAME_OVERRIDES`)
* **Issue:** The stylist aliases dictionary is hardcoded in the codebase:
  ```typescript
  const NAME_OVERRIDES: Record<string, string> = {
    'sven': 'sven tan',
    'alice': 'alice assist',
    'jessie': 'jessie cheah',
    'jingwen': 'jing wen',
    'williamassist': 'william assist',
  };
  ```
  This is a serious maintainability issue, as adding or correcting a stylist's CSV alias name requires code modifications and a redeployment.
* **Recommendation:** Since the database schema already includes a GIN-indexed `wess_names` text array column in `profiles` to map aliases dynamically, these overrides should be moved to the database. Remove the hardcoded dictionary and ensure these mappings are configured directly via the Team Manager UI.

### 🟠 Important: Bloated Component Structure in Team Manager
* **Location:** [app/admin/team/TeamManager.tsx](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/team/TeamManager.tsx)
* **Issue:** The component is 595 lines long and embeds three complex dialog models (Add Stylist, Edit Stylist, Delete Stylist) directly in the layout file. This triggers state pollution: variables like `wessSearch` and `selectedWessNames` are shared between dialogs, forcing manual state clears on cancels, which is error-prone.
* **Recommendation:** Refactor and split the dialogs into small, self-contained components:
  * `AddStylistDialog.tsx`
  * `EditStylistDialog.tsx`
  * `DeleteStylistDialog.tsx`
  Place them in a subfolder like `app/admin/team/components/`. This ensures local states are isolated and automatically destroyed on unmount.

### 🟡 Suggestion: Mixed Business Logic in Dashboard Page
* **Location:** [app/admin/page.tsx](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/page.tsx)
* **Issue:** The page is a Server Component that contains the visual layout but also calculates data aggregations (converting raw transactions into a branch contribution map, category mix map, leaderboard array, and pace metrics). This mix increases cognitive load and hinders testability.
* **Recommendation:** Extract all data aggregation and math calculations into a dedicated utility file like `app/admin/utils.ts` or `lib/admin-utils.ts` containing pure, unit-testable functions.

---

## 3. State & Side Effect Management

### 🟠 Important: Cascading Renders due to Synchronous State Updates in Effect
* **Location:** [app/admin/EditTargetDialog.tsx](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/EditTargetDialog.tsx#L40-L44)
* **Issue:** ESLint reports: `Error: Calling setState synchronously within an effect can trigger cascading renders`. The component uses `useEffect` to sync incoming initial target props to local state:
  ```typescript
  React.useEffect(() => {
    setHairVal(initialHair.toString());
    setNailsVal(initialNails.toString());
    setArtistryLashVal(initialArtistryLash.toString());
  }, [initialHair, initialNails, initialArtistryLash]);
  ```
* **Recommendation:** Avoid setting state in `useEffect` when props change. Instead, key the component instance by the props that determine its state (e.g., using `key={`${selYear}-${hairTarget}-${nailsTarget}-${artistryLashTarget}`}` inside `app/admin/page.tsx` when instantiating `<EditTargetDialog>`). This forces React to discard the old dialog instance and instantiate a new one with correct initial values, eliminating the need for `useEffect` entirely.

---

## 4. Performance & Scaling

### 🟠 Important: Client-Side Transaction Aggregation
* **Location:** [app/admin/page.tsx](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/page.tsx#L168-L224)
* **Issue:** The dashboard uses `fetchAllTransactions` to retrieve all transaction rows for the selected month in chunks of 1000, and then processes them in JS memory to compute categories, stylist rankings, and branch totals. As sales numbers grow over the years, downloading thousands of rows and looping over them will cause network latency, slow down Server Component renders, and waste DB read resources.
* **Recommendation:** Delegate aggregations to PostgreSQL. Implement Supabase database Views or RPC functions (e.g., `get_monthly_branch_sales(month_str)`, `get_monthly_stylist_leaderboard(month_str)`) so that only small, summarized datasets (e.g., 3 rows for branches, ~20 rows for the leaderboard) are transferred over the network.

---

## 5. UI, Accessibility & User Feedback

### 🟡 Suggestion: Lack of ARIA Attributes on Visual Elements
* **Location:** [app/admin/page.tsx](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/page.tsx) (Progress Bars)
* **Issue:** The annual target progress bars and branch contribution indicators are visual divs without screen-reader accessibility tags.
* **Recommendation:** Add appropriate ARIA accessibility tags like `role="progressbar"`, `aria-valuenow`, `aria-valuemin`, and `aria-valuemax` to the progress divs.
* **Code Example:**
  ```html
  <div 
    role="progressbar" 
    aria-valuenow={ytdProgressPercent} 
    aria-valuemin={0} 
    aria-valuemax={100}
    className="..."
  >
  ```

### 💡 Nitpick: Missing `aria-label` on Icon Buttons
* **Location:** [app/admin/UploadZone.tsx](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/UploadZone.tsx#L170-L180), [app/admin/team/TeamManager.tsx](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/team/TeamManager.tsx#L187-L215)
* **Issue:** Icon-only buttons (such as the remove file button in the upload list, and the edit/delete buttons in the stylist table) lack readable names for assistive technologies. They rely on visual icons (like Lucide `X`, `Edit`, `Trash2`), causing screen readers to announce them simply as "button".
* **Recommendation:** Add explicit `aria-label` descriptors to these buttons.
* **Code Example:**
  ```html
  <button 
    type="button" 
    onClick={() => removeFile(idx)}
    disabled={isPending}
    aria-label={`Remove file ${file.name}`}
    className="..."
  >
  ```

### 🟡 Suggestion: Error State Handling on Dashboard Render
* **Location:** [app/admin/page.tsx](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/page.tsx#L160-L162)
* **Issue:** If the queries for transactions or YTD sales crash, the catch block logs the details to server console logs, but the UI is silently rendered as if everything is empty (RM 0.00 nett sales, 0 transactions). This can mislead the admin into thinking the portal is empty or data has been deleted.
* **Recommendation:** Add a top-level error indicator check. If a DB error is detected, show a friendly warning banner on the dashboard page informing the user that data failed to load, along with a retry link.

---

## 6. Code Style & Linting Corrections

The ESLint static analysis identified the following errors and warnings that should be resolved:

### Unused Imports & Variables
* **`app/admin/page.tsx`**: `createClient` import is defined but never used.
* **`app/admin/EditTargetDialog.tsx`**: Prop `initialTotal` is destructured but never used.
* **`app/admin/actions.ts`**:
  * Unused variables: `_` (assigned in date regex splits), `prepaidIdx`, `focIdx`, `durationIdx`, `valueIdx` (unused columns in Employee Service Detail parser).
  * Use `const` instead of `let` for destructured values on line 59.

### Type Safety (`any` Avoidance)
* **`app/admin/actions.ts`** & **`app/admin/team/actions.ts`**: Use explicit typings instead of `any` in catch blocks (e.g. `error: unknown` and cast/handle accordingly, or use `error instanceof Error`).

### HTML Syntax / Escape Warnings
* **`app/admin/UploadZone.tsx`**: Line 253 contains an unescaped apostrophe in the text `"Stylists won't see..."` which should be escaped as `"Stylists won&apos;t see..."` to adhere to JSX rules.

---

## 7. Summary of Actions & Proposed File Structure

To clean up the admin panel, we recommend structuring the directories as follows:

```
app/admin/
├── team/
│   ├── components/            <-- [NEW] Store split dialog components
│   │   ├── AddStylistDialog.tsx
│   │   ├── EditStylistDialog.tsx
│   │   └── DeleteStylistDialog.tsx
│   ├── actions.ts             <-- [MODIFY] Secure actions with role checks
│   ├── page.tsx               <-- [MODIFY] Use getCachedSession
│   └── TeamManager.tsx        <-- [MODIFY] Clean rendering, delegate dialogs
│
├── utils.ts                   <-- [NEW] Pure functions for aggregations
├── page.tsx                   <-- [MODIFY] Clean page layout, delegate maths
└── actions.ts                 <-- [MODIFY] Migrate NAME_OVERRIDES to DB
```
