# Plan: Securing Unauthorized Admin Team Server Actions

## 1. Context & Objective
* **Vulnerability:** The Server Actions in `app/admin/team/actions.ts` (`createStylistAction`, `updateStylistAction`, and `deleteStylistAction`) perform administration tasks using `createAdminClient()`. However, they currently omit authentication and authorization checks. This allows any unauthenticated user or client to invoke these Server Actions via HTTP POST, leading to privilege escalation, account takeover, or data deletion.
* **Goal:** Implement proper session verification and role-based access control (RBAC) at the entry point of each action, ensuring only authenticated administrators can execute them. Additionally, we will clean up the catch-block typing (changing `any` to `unknown`) to resolve related style guidelines/lint warnings in these modified functions.

---

## 2. Proposed Changes

### Component: Admin Team Actions
#### [MODIFY] [actions.ts](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/team/actions.ts)

* **Imports:**
  * Add `import { createClient } from '@/lib/supabase/server';` to enable session and database profile checks.
* **Refactoring `createStylistAction`, `updateStylistAction`, and `deleteStylistAction`:**
  * At the very beginning of each function, insert the authorization check block:
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
  * Refactor the `catch (error: any)` blocks to use `catch (error: unknown)` to comply with the project's type safety rules. Example:
    ```typescript
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'An unexpected error occurred.';
      return { error: message };
    }
    ```

---

## 3. Verification Plan

### Automated Verification
* Verify compiling and building without errors using:
  ```powershell
  npm run build
  ```

### Manual Verification
* **Admin Verification:** Log in as an administrator and verify that adding, editing, and deleting a stylist continues to function correctly through the UI.
* **Negative Test (Optional/Mocking):** Verify that if a stylist account attempts to call these actions (e.g. by intercepting or calling the actions directly), they receive the unauthorized error response.
