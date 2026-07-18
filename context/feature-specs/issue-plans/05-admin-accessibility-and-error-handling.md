# Plan: Admin Module Accessibility and Error Handling

## 1. Context & Objective
* **Accessibility Issues:** Several components in the admin interface lack necessary labels and attributes for screen readers and assistive technologies:
  - Progress bars (representing annual, department, monthly milestone, branch contribution, and category sales goals) are custom `div` elements that lack ARIA attributes. Assistive technologies see them only as plain decorative blocks.
  - Icon-only buttons (such as the "remove file" button in the CSV uploader and the "edit/delete stylist" buttons in the stylist manager) lack text labels. Assistive technologies announce them as generic "button"s.
* **Error Handling Issue:** If a database query fails when loading the Admin Dashboard (`app/admin/page.tsx`), the page catches the error and logs it to the server console, but silently renders an empty dashboard (RM 0.00 nett sales, 0 transactions). This can mislead administrators into thinking that there is no data or that transactions were deleted.
* **Goal:** 
  1. Add proper ARIA attributes to all visual progress bars and metrics indicators.
  2. Implement descriptive `aria-label` tags on all icon-only buttons.
  3. Introduce a top-level user-friendly error warning banner on the Admin Dashboard when database queries fail, along with a retry link.

---

## 2. Proposed Changes

### 2.1 Accessibility Improvements

#### [MODIFY] [page.tsx](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/page.tsx)

* **Overall YTD Target Progress (around lines 327-340):**
  Add ARIA attributes representing the current progress percent:
  ```html
  <div 
    role="progressbar"
    aria-valuenow={Math.min(100, ytdProgressPercent)}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label="Yearly Target Progress"
    className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden relative"
  >
  ```

* **Department Target Progress Bars (around lines 362, 386, 410):**
  - **Hair:**
    ```html
    <div 
      role="progressbar"
      aria-valuenow={Math.min(100, hairTarget > 0 ? (hairYTDSales / hairTarget * 100) : 0)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Hair department YTD target progress"
      className="w-full h-2 bg-gray-50 rounded-full overflow-hidden relative border border-gray-100"
    >
    ```
  - **Nails:**
    ```html
    <div 
      role="progressbar"
      aria-valuenow={Math.min(100, nailsTarget > 0 ? (nailsYTDSales / nailsTarget * 100) : 0)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Nails department YTD target progress"
      className="w-full h-2 bg-gray-50 rounded-full overflow-hidden relative border border-gray-100"
    >
    ```
  - **Artistry & Lash:**
    ```html
    <div 
      role="progressbar"
      aria-valuenow={Math.min(100, artistryLashTarget > 0 ? (artistryLashYTDSales / artistryLashTarget * 100) : 0)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Artistry and Lash department YTD target progress"
      className="w-full h-2 bg-gray-50 rounded-full overflow-hidden relative border border-gray-100"
    >
    ```

* **Monthly Sales Milestone Progress (around line 476):**
  ```html
  <div 
    role="progressbar"
    aria-valuenow={Math.min(100, monthlyProgressPercent)}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label="Monthly Sales Milestone Progress"
    className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"
  >
  ```

* **Branch Contribution Progress Bars (around line 508):**
  ```html
  <div 
    role="progressbar"
    aria-valuenow={percent}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={`Branch contribution percentage for ${branchName}`}
    className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"
  >
  ```

* **Sales Category Mix Progress Bars (around line 548):**
  ```html
  <div 
    role="progressbar"
    aria-valuenow={percent}
    aria-valuemin={0}
    aria-valuemax={100}
    aria-label={`Sales contribution percentage for category ${item.label}`}
    className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"
  >
  ```

#### [MODIFY] [UploadZone.tsx](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/UploadZone.tsx)

* **Remove File Button (around line 170):**
  Add explicit descriptive `aria-label`:
  ```html
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      removeFile(idx);
    }}
    disabled={isPending}
    aria-label={`Remove file ${file.name}`}
    className="text-gray-400 hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer"
  >
    <X className="w-3.5 h-3.5" />
  </button>
  ```

#### [MODIFY] [TeamManager.tsx](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/team/TeamManager.tsx)

* **Edit and Delete Stylist Buttons (around lines 187, 202):**
  Add explicit `aria-label` tags mapping the specific stylist names:
  ```html
  <Button
    variant="ghost"
    size="icon-sm"
    className="text-gray-400 hover:text-black hover:bg-gray-100"
    onClick={() => { ... }}
    title="Edit Stylist"
    aria-label={`Edit profile for stylist ${stylist.name}`}
  >
    <Edit className="h-3.5 w-3.5" />
  </Button>
  ```
  ```html
  <Button
    variant="ghost"
    size="icon-sm"
    className="text-gray-400 hover:text-destructive hover:bg-destructive/10"
    onClick={() => { ... }}
    title="Delete Stylist"
    aria-label={`Delete profile for stylist ${stylist.name}`}
  >
    <Trash2 className="h-3.5 w-3.5" />
  </Button>
  ```

---

### 2.2 Dashboard Error Handling

#### [MODIFY] [page.tsx](file:///c:/Users/alec/OneDrive/Desktop/alec176avenue/176-sales-portal/app/admin/page.tsx)

* **Import `AlertTriangle`:**
  ```typescript
  import {
    TrendingUp,
    Target,
    MapPin,
    Calendar,
    Sparkles,
    Award,
    TrendingDown,
    AlertTriangle // <-- ADDED
  } from 'lucide-react';
  ```

* **Track DB Error State in Component Loader:**
  ```typescript
  let ytdSales = 0;
  let ytdDeptSalesList: { department: string; sales_sum: number }[] = [];
  let monthTxRaw: MonthTxRow[] = [];
  let hasFetchError = false; // <-- ADDED

  try {
    const [ytdSalesRes, ytdDeptSalesRes, monthTxRows] = await Promise.all([
      // ... queries ...
    ]);

    if (ytdSalesRes.error) {
      console.error('[AdminDashboardPage] Failed to fetch YTD sales sum:', ytdSalesRes.error.message);
      hasFetchError = true; // <-- SET ERROR
    } else {
      ytdSales = Number(ytdSalesRes.data || 0);
    }

    if (ytdDeptSalesRes.error) {
      console.error('[AdminDashboardPage] Failed to fetch YTD department sales sum:', ytdDeptSalesRes.error.message);
      hasFetchError = true; // <-- SET ERROR
    } else {
      ytdDeptSalesList = ytdDeptSalesRes.data || [];
    }

    monthTxRaw = monthTxRows;
  } catch (error: any) {
    console.error('[AdminDashboardPage] Failed to fetch transactions:', error.message || error);
    hasFetchError = true; // <-- SET ERROR
  }
  ```

* **Render Alert Banner in Layout:**
  Add a warning alert block right above the yearly progress tracker card (around line 275):
  ```tsx
  {hasFetchError && (
    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs flex flex-col gap-2 shadow-sm font-medium">
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4.5 h-4.5 text-red-600 shrink-0" />
        <span>We encountered an issue fetching database metrics for this month. Dashboard statistics and leaderboard values may be incomplete or empty.</span>
      </div>
      <div>
        <a href={`/admin?month=${selectedMonthStr}`} className="underline font-bold text-red-700 hover:text-red-950">
          Try refreshing the page
        </a>
      </div>
    </div>
  )}
  ```

---

## 3. Verification Plan

### Automated Verification
* Verify compiling and building without errors:
  ```powershell
  npm run build
  ```

### Manual Verification
1. **Screen Reader Check:** Use browser developer tools or screen reader extensions (e.g. ChromeVox, VoiceOver) to inspect elements. Verify that the progress bars announce their respective values and roles correctly, and that the edit, delete, and remove file buttons announce their labels rather than generic button texts.
2. **Error Banner Check:** Temporarily force a database query crash (e.g., by changing a table name to a non-existent name in the fetch logic) on the local server. Verify that the dashboard displays the red alert banner notifying the user that data failed to load, along with a working retry link.
