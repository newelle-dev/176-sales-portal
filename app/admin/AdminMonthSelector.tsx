'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';

interface MonthOption {
  value: string;
  label: string;
}

interface AdminMonthSelectorProps {
  months: MonthOption[];
  defaultValue: string;
}

export default function AdminMonthSelector({ months, defaultValue }: AdminMonthSelectorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    startTransition(() => {
      router.push(`/admin?month=${e.target.value}`);
    });
  };

  return (
    <div className="flex items-center gap-2 select-none">
      <label htmlFor="admin-month-select" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
        View Month:
      </label>
      <div className="relative">
        <select
          id="admin-month-select"
          value={defaultValue}
          onChange={handleChange}
          disabled={isPending}
          className="bg-white border border-gray-250 hover:border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-black cursor-pointer transition-colors disabled:opacity-60 font-sans"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        {isPending && (
          <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-gray-400" />
        )}
      </div>
    </div>
  );
}
