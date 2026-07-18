# Plan: Migrating Hardcoded Name Overrides to the Database

## 1. Context & Objective
* **Maintainability Issue:** The CSV upload pipeline in `app/admin/actions.ts` utilizes a hardcoded mapping dictionary (`NAME_OVERRIDES`) to translate normalized employee names to their primary profile names (e.g., `'jingwen'` -> `'jing wen'`, `'jessie'` -> `'jessie cheah'`). Hardcoding these mappings is a maintainability concern since any alias addition or correction requires a code change and a production deployment.
* **Goal:** Eliminate `NAME_OVERRIDES` from the codebase entirely. In its place, rely exclusively on the database profiles table, specifically using the existing `wess_names` (text array) column. We will update database profiles with the necessary aliases first so that the upload logic works seamlessly.

---

## 2. Proposed Changes

### 2.1 Database Updates (SQL)
To ensure the transition is seamless, we need to populate the `wess_names` column for any existing profiles that currently rely on the hardcoded `NAME_OVERRIDES`.
Specifically:
- **Jing Wen:** Her profile is registered under the name `"Jing Wen"` and her current `wess_names` array is `["jing wen (manicurist)"]`. Without the override `'jingwen' -> 'jing wen'`, a CSV transaction showing `"jingwen"` (no space) will normalize to `"jingwen"` and fail to match. We will add `"jingwen"` to her `wess_names` array in the database.
- **Jessie:** Her profile is registered under `"Jessie"` and her `wess_names` is `["jessie cheah (star specialist)"]`.
  - Normalizing the primary name `"Jessie"` gives `"jessie"`.
  - Normalizing her alias `"jessie cheah (star specialist)"` gives `"jessie cheah"`.
  - In the CSV, rows might contain `"Jessie"` or `"Jessie Cheah"`.
  - `"Jessie"` matches her primary name, and `"Jessie Cheah"` matches her normalized alias.
  - So her profile will map correctly without any changes or overrides!
- **Sven Tan, Alice Assist, William Assist:** Currently, these stylists do not have registered accounts/profiles in the database (they only have historical transactions). Moving forward, when the administrator creates profiles for them via the Team Manager UI:
  - For Sven Tan: Create profile name `"Sven Tan"`, add alias `"sven"`.
  - For Alice Assist: Create profile name `"Alice Assist"`, add alias `"alice"`.
  - For William Assist: Create profile name `"William Assist"`, add alias `"williamassist"`.

We will run the following SQL update:
```sql
UPDATE public.profiles
SET wess_names = array_append(COALESCE(wess_names, '{}'::text[]), 'jingwen')
WHERE name = 'Jing Wen' AND NOT ('jingwen' = ANY(COALESCE(wess_names, '{}'::text[])));
```

### 2.2 Application Refactoring
#### [MODIFY] [actions.ts](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/actions.ts)

* **Remove `NAME_OVERRIDES`:**
  Delete the hardcoded `NAME_OVERRIDES` dictionary:
  ```diff
  -const NAME_OVERRIDES: Record<string, string> = {
  -  'sven': 'sven tan',
  -  'alice': 'alice assist',
  -  'jessie': 'jessie cheah',
  -  'jingwen': 'jing wen',
  -  'williamassist': 'william assist',
  -};
  ```

* **Remove reference-mapping lookups:**
  In the standard CSV parsing block and the Employee Service Detail parsing block, remove the check and override assignment:
  ```diff
  -          let normalizedEmp = normalizeName(rawEmployeeName);
  -          if (NAME_OVERRIDES[normalizedEmp]) {
  -            normalizedEmp = NAME_OVERRIDES[normalizedEmp];
  -          }
  +          const normalizedEmp = normalizeName(rawEmployeeName);
  ```

---

## 3. Verification Plan

### Automated Verification
* Verify compiling and building without errors using:
  ```powershell
  npm run build
  ```

### Manual Verification
1. Run the SQL update statement to append `'jingwen'` to Jing Wen's `wess_names` in the database.
2. Upload a sample CSV (e.g., from July 2026) that contains employee transactions for `"Jing Wen (Manicurist)"` or `"jingwen"` and verify that they map correctly to Jing Wen's profile and do not generate any "unmapped employee profile" warnings.
3. Test that the dashboard counts and stylist rankings remain consistent.
