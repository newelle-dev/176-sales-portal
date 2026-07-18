# UI & Design Context

## Design Philosophy
The app should feel like a premium, modern salon tool. It must be brutally simple for stylists to use when they are exhausted after a long shift. 

## Layout Principles
- **Mobile-First:** The primary device is an iPhone/Android. Touch targets must be large (min 44px).
- **Clean Dashboards:** Use card-based layouts for metrics. 
- **Typography:** Sans-serif, clean, highly legible numbers. Focus on typographic hierarchy (big numbers, small labels).

## Color Tokens (Tailwind)
*Keep it monochromatic with elegant accent colors for a sleek, premium look.*
- **Background:** `bg-gray-50`
- **Cards/Containers:** `bg-white` with subtle `shadow-sm` and `rounded-2xl`
- **Primary Text:** `text-gray-900`
- **Secondary Text (Labels/Dates):** `text-gray-500`
- **Accent/Brand:** `text-black` or a muted elegant tone (e.g., `slate-800`).
- **Success/Positive Data:** Soft green (`text-emerald-600`) for sales numbers.
- **Deduction/Adjustment Data:** Soft amber (`text-amber-600` text, `bg-amber-50` background, `border-amber-100` border).

## Components
- **Metric Card:** A clean white card displaying the category name, total amount, and an icon.
- **Transaction Accordion List (Stylist):** Groups transaction records by local calendar day under interactive accordion headers. Summarizes daily sales count and totals, expanding smoothly to show individual transaction rows.
- **Searchable Multi-Select Input (Admin):** Dropdown select interface populated from the database with manual override for adding aliases.
- **Data Table (Admin):** Clean lines, sticky headers, and clear action buttons for managing staff and aliases.