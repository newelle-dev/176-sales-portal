'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface LeaderboardEntry {
  employee_name: string;
  department: string | null;
  branch: string;
  all_amount: number;
  all_count: number;
  alacarte_amount: number;
  alacarte_count: number;
  packages_amount: number;
  packages_count: number;
  products_amount: number;
  products_count: number;
}

interface StylistLeaderboardClientProps {
  currentMonthName: string;
  data: LeaderboardEntry[];
}

type FilterType = 'all' | 'alacarte' | 'packages' | 'products';
type DeptType = 'all' | 'HAIR' | 'NAILS' | 'ARTISTRY_LASH';

export default function StylistLeaderboardClient({
  currentMonthName,
  data,
}: StylistLeaderboardClientProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [activeDept, setActiveDept] = useState<DeptType>('all');

  // 1. Filter by department
  let filtered = data || [];
  if (activeDept !== 'all') {
    filtered = filtered.filter(
      (item) => item.department?.toUpperCase() === activeDept.toUpperCase()
    );
  }

  // 2. Map and select category values
  const mapped = filtered.map((item) => {
    let amount = 0;
    let count = 0;
    if (activeFilter === 'all') {
      amount = item.all_amount;
      count = item.all_count;
    } else if (activeFilter === 'alacarte') {
      amount = item.alacarte_amount;
      count = item.alacarte_count;
    } else if (activeFilter === 'packages') {
      amount = item.packages_amount;
      count = item.packages_count;
    } else if (activeFilter === 'products') {
      amount = item.products_amount;
      count = item.products_count;
    }
    return {
      employee_name: item.employee_name,
      branch: item.branch,
      amount,
      count,
    };
  });

  // 3. Filter out zero sales in active category and sort by amount descending
  const leaderboard = mapped
    .filter((item) => item.amount > 0 || item.count > 0)
    .sort((a, b) => b.amount - a.amount);

  return (
    <>
      <div className="px-6 pb-4 border-b border-gray-100 bg-white grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Category Dropdown */}
        <div className="space-y-1">
          <label htmlFor="category-select" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block select-none">
            Category
          </label>
          <div className="relative">
            <select
              id="category-select"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as FilterType)}
              className="flex h-9 w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-3 pr-8 py-1.5 text-xs font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-black/5 text-gray-900 appearance-none cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="alacarte">Ala Carte</option>
              <option value="packages">Packages</option>
              <option value="products">Products</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Department Dropdown */}
        <div className="space-y-1">
          <label htmlFor="department-select" className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block select-none">
            Department
          </label>
          <div className="relative">
            <select
              id="department-select"
              value={activeDept}
              onChange={(e) => setActiveDept(e.target.value as DeptType)}
              className="flex h-9 w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-3 pr-8 py-1.5 text-xs font-semibold shadow-sm transition-colors focus-visible:outline-none focus-visible:border-black focus-visible:ring-black/5 text-gray-900 appearance-none cursor-pointer"
            >
              <option value="all">All Departments</option>
              <option value="HAIR">Hair</option>
              <option value="NAILS">Nails</option>
              <option value="ARTISTRY_LASH">Artistry & Lash</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="p-0 flex-1 flex flex-col justify-between">
        {leaderboard.length > 0 ? (
          <div
            className="max-h-[350px] overflow-y-auto scrollbar-thin focus:outline-none focus:ring-1 focus:ring-black rounded-b-2xl"
            tabIndex={0}
            role="region"
            aria-label={`${activeFilter} performance leaderboard table`}
          >
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 select-none sticky top-0 backdrop-blur-sm z-10">
                  <th className="py-2.5 px-4 text-center w-12 bg-gray-50/50">Rank</th>
                  <th className="py-2.5 px-4 bg-gray-50/50">Stylist Name</th>
                  <th className="py-2.5 px-4 text-center bg-gray-50/50">Qty</th>
                  <th className="py-2.5 px-4 text-right pr-6 bg-gray-50/50">Nett Sales</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs">
                {leaderboard.map((stylist, index) => {
                  const isTopThree = index < 3;
                  return (
                    <tr key={stylist.employee_name} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 px-4 text-center font-bold text-gray-400">
                        {isTopThree ? (
                          <span
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                              index === 0 ? 'bg-amber-100 text-amber-800' :
                              index === 1 ? 'bg-slate-200 text-slate-800' :
                              'bg-orange-100 text-orange-850'
                            }`}
                            aria-label={`Rank ${index + 1} (${index === 0 ? 'Gold' : index === 1 ? 'Silver' : 'Bronze'} Medal)`}
                          >
                            {index + 1}
                          </span>
                        ) : (
                          index + 1
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-900">
                        {stylist.employee_name}
                      </td>
                      <td className="py-3 px-4 text-center text-gray-500 font-semibold">
                        {stylist.count}
                      </td>
                      <td className="py-3 px-4 text-right pr-6 font-bold text-gray-900">
                        RM {stylist.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-gray-500 font-medium bg-white flex-1 flex items-center justify-center min-h-[150px]">
            No transaction data available for {currentMonthName} in this category and department.
          </div>
        )}
      </div>
    </>
  );
}
