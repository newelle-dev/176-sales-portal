'use client';

import { useRouter } from 'next/navigation';

interface MonthOption {
  value: string;
  label: string;
}

interface MonthSelectorProps {
  months: MonthOption[];
  defaultValue: string;
}

export default function MonthSelector({ months, defaultValue }: MonthSelectorProps) {
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    router.push(`/dashboard?month=${e.target.value}`);
  };

  return (
    <div className="flex items-center gap-2 select-none">
      <label htmlFor="month-select" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        View Month:
      </label>
      <select
        id="month-select"
        value={defaultValue}
        onChange={handleChange}
        className="bg-white border border-gray-250 hover:border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-black cursor-pointer transition-colors"
      >
        {months.map((m) => (
          <option key={m.value} value={m.value}>
            {m.label}
          </option>
        ))}
      </select>
    </div>
  );
}
