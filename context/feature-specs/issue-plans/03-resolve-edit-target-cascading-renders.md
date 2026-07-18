# Plan: Resolving Edit Target Dialog Cascading Renders & Unused Props

## 1. Context & Objective
* **Cascading Renders Warning:** The `EditTargetDialog` component (`app/admin/EditTargetDialog.tsx`) uses a `useEffect` hook to synchronize incoming `initialHair`, `initialNails`, and `initialArtistryLash` props into local component state. ESLint flags this with the warning: `Error: Calling setState synchronously within an effect can trigger cascading renders`.
* **Unused Prop Warning:** The prop `initialTotal` is destructured in the function signature of `EditTargetDialog` but is never utilized in the component.
* **Goal:** 
  1. Eliminate the `useEffect` hook in `EditTargetDialog.tsx`. Instead, force component remounting via React's `key` mechanism when target values or the selected year change.
  2. Remove the unused `initialTotal` prop from `EditTargetDialogProps` and `EditTargetDialog` destructuring.

---

## 2. Proposed Changes

### Component: Admin Dashboard Page
#### [MODIFY] [page.tsx](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/page.tsx)

* **Key Assignment:**
  Update the instantiation of `EditTargetDialog` around line 265 to include a unique `key` prop based on `selYear`, `hairTarget`, `nailsTarget`, and `artistryLashTarget`. This ensures React discards the old dialog instance and creates a new one with correct initial values when these props change:
  ```tsx
  <EditTargetDialog
    key={`${selYear}-${hairTarget}-${nailsTarget}-${artistryLashTarget}`}
    year={selYear}
    initialHair={hairTarget}
    initialNails={nailsTarget}
    initialArtistryLash={artistryLashTarget}
  />
  ```

### Component: Edit Target Dialog
#### [MODIFY] [EditTargetDialog.tsx](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/EditTargetDialog.tsx)

* **Prop Signatures:**
  * Remove `initialTotal` from `EditTargetDialogProps` interface.
  * Remove `initialTotal` from the destructured arguments list in `EditTargetDialog` definition.
* **Remove `useEffect`:**
  * Delete the entire `useEffect` hook (lines 40-44).
  * Let state variables initialize cleanly during component mount.

---

## 3. Verification Plan

### Automated Verification
* Verify compiling and building without errors:
  ```powershell
  npm run build
  ```

### Manual Verification
* **Year & Value Switching:** Open the admin dashboard, switch between different years, and click "Configure Target". Verify that the dialog displays the correct initial targets for each year.
* **Updating Values:** Update the target values for a year, click "Save Targets", and re-open the dialog. Verify that the updated values are correctly reflected in the dialog text inputs.
