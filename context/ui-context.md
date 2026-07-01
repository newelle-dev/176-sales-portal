# UI & Design Context

## Design Philosophy
The app should feel like a premium, modern salon tool. It must be brutally simple for stylists to use when they are exhausted after a long shift. 

## Layout Principles
- **Mobile-First:** The primary device is an iPhone/Android. Touch targets must be large (min 44px).
- **Clean Dashboards:** Use card-based layouts for metrics. 
- **Typography:** Sans-serif, clean, highly legible numbers. Focus on typographic hierarchy (big numbers, small labels).

## Color Tokens (Tailwind)
*Keep it monochromatic with one accent color for a sleek look.*
- **Background:** `bg-gray-50`
- **Cards/Containers:** `bg-white` with subtle `shadow-sm`
- **Primary Text:** `text-gray-900`
- **Secondary Text (Labels/Dates):** `text-gray-500`
- **Accent/Brand:** `text-black` or a muted elegant tone (e.g., `slate-800`).
- **Success/Positive Data:** Soft green (`text-emerald-600`) for sales numbers.

## Components
- **Metric Card:** A clean white card displaying the category name, total amount, and an icon.
- **Data Table (Admin):** Clean lines, sticky headers, clear action buttons for editing staff.