'use client';

import { useRouter } from 'next/navigation';
import { useTransition, useState, useEffect } from 'react';
import { Calendar, ChevronDown, Check, ArrowLeft, Loader2 } from 'lucide-react';

interface MonthOption {
  value: string;
  label: string;
}

interface PopoverDateFilterProps {
  months: MonthOption[];
  currentMonthType: 'this-month' | 'last-month' | 'range';
  startMonth: string;
  endMonth: string;
  basePath: string; // e.g. '/admin' or '/dashboard'
}

export default function PopoverDateFilter({
  months,
  currentMonthType,
  startMonth,
  endMonth,
  basePath,
}: PopoverDateFilterProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isOpen, setIsOpen] = useState(false);
  const [showRangePicker, setShowRangePicker] = useState(currentMonthType === 'range');
  const [localStartMonth, setLocalStartMonth] = useState(startMonth);
  const [localEndMonth, setLocalEndMonth] = useState(endMonth);

  // Sync state if props change (e.g. navigation via back button)
  useEffect(() => {
    setLocalStartMonth(startMonth);
    setLocalEndMonth(endMonth);
    setShowRangePicker(currentMonthType === 'range');
  }, [currentMonthType, startMonth, endMonth]);

  // Reset range picker view when popover opens/closes
  useEffect(() => {
    if (!isOpen) {
      setShowRangePicker(currentMonthType === 'range');
    }
  }, [isOpen, currentMonthType]);

  const getMonthLabel = (monthStr: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  let activeLabel = '';
  if (currentMonthType === 'this-month') {
    const currentMonthStr = months[0]?.value || ''; // latest month in available list
    activeLabel = currentMonthStr ? `This Month (${getMonthLabel(currentMonthStr)})` : 'This Month';
  } else if (currentMonthType === 'last-month') {
    const lastMonthStr = months[1]?.value || '';
    activeLabel = lastMonthStr ? `Last Month (${getMonthLabel(lastMonthStr)})` : 'Last Month';
  } else {
    if (startMonth === endMonth) {
      activeLabel = getMonthLabel(startMonth);
    } else {
      activeLabel = `${getMonthLabel(startMonth)} - ${getMonthLabel(endMonth)}`;
    }
  }

  const handleTypeSelect = (type: 'this-month' | 'last-month') => {
    setIsOpen(false);
    startTransition(() => {
      router.push(`${basePath}?monthType=${type}`);
    });
  };

  const handleApply = () => {
    setIsOpen(false);
    startTransition(() => {
      router.push(`${basePath}?monthType=range&startMonth=${localStartMonth}&endMonth=${localEndMonth}`);
    });
  };

  return (
    <div className="relative select-none font-sans shrink-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className="flex items-center gap-2 bg-white border border-gray-250 hover:border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-black cursor-pointer transition-colors disabled:opacity-60 h-[38px]"
      >
        {isPending ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
        ) : (
          <Calendar className="w-3.5 h-3.5 text-gray-400" />
        )}
        <span className="truncate max-w-[180px] sm:max-w-none">{activeLabel}</span>
        <ChevronDown className="w-3.5 h-3.5 ml-1 text-gray-400" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop overlay to handle closing popover when clicking outside */}
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          
          {/* Popover Card */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-150 rounded-2xl shadow-lg p-3 z-50 font-sans">
            {!showRangePicker ? (
              <div className="space-y-1">
                <button
                  onClick={() => handleTypeSelect('this-month')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition-colors text-left h-[38px] ${
                    currentMonthType === 'this-month'
                      ? 'bg-gray-50 text-gray-900 font-extrabold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>This Month</span>
                  {currentMonthType === 'this-month' && <Check className="w-3.5 h-3.5 text-gray-900" />}
                </button>
                <button
                  onClick={() => handleTypeSelect('last-month')}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition-colors text-left h-[38px] ${
                    currentMonthType === 'last-month'
                      ? 'bg-gray-50 text-gray-900 font-extrabold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>Last Month</span>
                  {currentMonthType === 'last-month' && <Check className="w-3.5 h-3.5 text-gray-900" />}
                </button>
                <button
                  onClick={() => setShowRangePicker(true)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-bold rounded-xl transition-colors text-left h-[38px] ${
                    currentMonthType === 'range'
                      ? 'bg-gray-50 text-gray-900 font-extrabold'
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <span>Select Month Range...</span>
                  {currentMonthType === 'range' && <Check className="w-3.5 h-3.5 text-gray-900" />}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2">
                  <button
                    onClick={() => setShowRangePicker(false)}
                    className="p-1 hover:bg-gray-50 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <span className="text-xs font-bold text-gray-800">Select Month Range</span>
                </div>

                {/* Form */}
                <div className="space-y-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">From Month</label>
                    <select
                      value={localStartMonth}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalStartMonth(val);
                        // Adjust end month if it becomes earlier than the start month
                        if (localEndMonth < val) {
                          setLocalEndMonth(val);
                        }
                      }}
                      className="w-full bg-white border border-gray-250 hover:border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-black cursor-pointer transition-colors font-sans"
                    >
                      {months.map((m) => (
                        <option key={m.value} value={m.value}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">To Month</label>
                    <select
                      value={localEndMonth}
                      onChange={(e) => setLocalEndMonth(e.target.value)}
                      className="w-full bg-white border border-gray-250 hover:border-gray-300 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 shadow-sm focus:outline-none focus:ring-1 focus:ring-black cursor-pointer transition-colors font-sans"
                    >
                      {months.map((m) => (
                        <option key={m.value} value={m.value} disabled={m.value < localStartMonth}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Apply Button */}
                <button
                  onClick={handleApply}
                  disabled={isPending}
                  className="w-full bg-black hover:bg-gray-800 text-white rounded-xl px-3 py-2 text-xs font-bold shadow-sm cursor-pointer disabled:opacity-60 transition-all flex items-center justify-center gap-1.5 h-[36px]"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Apply Range</span>
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
