'use client';

import { useState, useMemo } from 'react';
import { Search, Scissors, Package, ShoppingBag, Percent, MapPin, Calendar, ChevronDown, User } from 'lucide-react';
import { cleanCustomerName } from '@/lib/transaction-utils';
import type { Tables } from '@/types/database.types';

type Transaction = Tables<'transactions'>;

interface StylistInfo {
  id: string;
  name: string;
  username: string;
}

interface DepartmentTransactionsListProps {
  transactions: (Transaction & { stylist_name?: string })[];
  stylists: StylistInfo[];
}

type FilterType = 'all' | 'alacarte' | 'packages' | 'products' | 'deductions';

const dayFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kuala_Lumpur',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const timeFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: 'Asia/Kuala_Lumpur',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: true,
});

export default function DepartmentTransactionsList({ transactions, stylists }: DepartmentTransactionsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedStylistId, setSelectedStylistId] = useState<string>('all');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const toggleDay = (dateKey: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  const formatDate = (dateStr: string) => {
    try {
      return timeFormatter.format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  // Filter and group transactions
  const groupedDays = useMemo(() => {
    // 1. Filter transactions
    const filtered = transactions.filter((tx) => {
      // Stylist filter
      if (selectedStylistId !== 'all' && tx.profile_id !== selectedStylistId) {
        return false;
      }

      // Text search
      const searchLower = searchQuery.toLowerCase();
      const customerClean = cleanCustomerName(tx.customer_name).toLowerCase();
      const descLower = tx.item_description?.toLowerCase() || '';
      const branchLower = tx.branch?.toLowerCase() || '';
      const stylistLower = (tx.stylist_name || tx.employee_name || '').toLowerCase();
      
      const matchesSearch =
        customerClean.includes(searchLower) ||
        descLower.includes(searchLower) ||
        branchLower.includes(searchLower) ||
        stylistLower.includes(searchLower);

      if (!matchesSearch) return false;

      // Tab/Category filtering
      if (activeFilter === 'all') return true;
      if (activeFilter === 'alacarte') {
        return (tx.type === 'S' && tx.amount !== 0) || (tx.type === 'C' && tx.amount < 0);
      }
      if (activeFilter === 'packages') {
        return (tx.type === 'G' || tx.type === 'C') && tx.amount > 0;
      }
      if (activeFilter === 'products') return tx.type === 'P' && tx.amount > 0;
      if (activeFilter === 'deductions') return tx.deduction > 0;

      return true;
    });

    // 2. Group by local date
    const groupsMap: Record<string, (Transaction & { stylist_name?: string })[]> = {};
    filtered.forEach((tx) => {
      try {
        const date = new Date(tx.transaction_date);
        const parts = dayFormatter.formatToParts(date);
        const year = parts.find((p) => p.type === 'year')?.value || '1970';
        const month = parts.find((p) => p.type === 'month')?.value || '01';
        const day = parts.find((p) => p.type === 'day')?.value || '01';
        const dateKey = `${year}-${month}-${day}`;

        if (!groupsMap[dateKey]) groupsMap[dateKey] = [];
        groupsMap[dateKey].push(tx);
      } catch {
        if (!groupsMap['unknown']) groupsMap['unknown'] = [];
        groupsMap['unknown'].push(tx);
      }
    });

    // 3. Sort dates descending
    const sortedDates = Object.keys(groupsMap).sort((a, b) => {
      if (a === 'unknown') return 1;
      if (b === 'unknown') return -1;
      return b.localeCompare(a);
    });

    // 4. Build grouped result
    return sortedDates.map((dateKey) => {
      const txs = groupsMap[dateKey];
      const dailyTotal = txs.reduce((sum, tx) => {
        const amt = Number(tx.amount) || 0;
        const ded = Number(tx.deduction) || 0;
        if (activeFilter === 'deductions') return sum + ded;
        if (activeFilter === 'alacarte' || activeFilter === 'packages' || activeFilter === 'products') return sum + amt;
        return sum + amt + ded;
      }, 0);

      let formattedDate = dateKey;
      if (dateKey !== 'unknown') {
        try {
          const [yr, mo, dy] = dateKey.split('-').map(Number);
          const d = new Date(Date.UTC(yr, mo - 1, dy));
          formattedDate = d.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC',
          });
        } catch {
          formattedDate = dateKey;
        }
      } else {
        formattedDate = 'Unknown Date';
      }

      return { dateKey, formattedDate, transactions: txs, dailyTotal };
    });
  }, [transactions, searchQuery, activeFilter, selectedStylistId]);

  return (
    <div className="space-y-6">
      {/* Search & Filters Row */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by customer, service, stylist, branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black placeholder-gray-400 shadow-sm text-gray-900 transition-all h-[42px]"
              aria-label="Search transactions"
            />
          </div>

          {/* Stylist Filter Dropdown */}
          <div className="relative shrink-0 w-full sm:w-[200px]">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <select
              value={selectedStylistId}
              onChange={(e) => setSelectedStylistId(e.target.value)}
              className="w-full pl-10 pr-8 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-semibold text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-black cursor-pointer appearance-none h-[42px] transition-colors"
              aria-label="Filter transactions by stylist"
            >
              <option value="all">All Stylists</option>
              {stylists.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <ChevronDown className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Horizontal Category Tabs */}
        <div
          className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none select-none -mx-4 px-4 sm:mx-0 sm:px-0"
          role="tablist"
          aria-label="Filter transactions by category"
        >
          {([
            { id: 'all', label: 'All', icon: null },
            { id: 'alacarte', label: 'Ala Carte', icon: Scissors },
            { id: 'packages', label: 'Packages', icon: Package },
            { id: 'products', label: 'Products', icon: ShoppingBag },
            { id: 'deductions', label: 'Deductions', icon: Percent },
          ] as const).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveFilter(tab.id as FilterType)}
                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-500 hover:text-black hover:border-gray-300'
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" />}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Transaction List Accordion */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase tracking-wider select-none px-1">
          <span>Daily Sales ({groupedDays.length} {groupedDays.length === 1 ? 'day' : 'days'})</span>
          <span>Daily Total</span>
        </div>

        {groupedDays.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center shadow-sm select-none">
            <Calendar className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-gray-800">No transactions found</p>
            <p className="text-xs text-gray-400 mt-0.5">Try adjusting your search query or filter.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {groupedDays.map((group) => {
              const isExpanded = !!expandedDays[group.dateKey];
              const panelId = `day-panel-${group.dateKey}`;
              const isDeductionTab = activeFilter === 'deductions';
              return (
                <div key={group.dateKey} className="space-y-2">
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleDay(group.dateKey)}
                    aria-expanded={isExpanded}
                    aria-controls={panelId}
                    className="w-full bg-white border border-gray-200/80 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-gray-300 hover:bg-gray-50/20 transition-all gap-4 text-left cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-150 flex items-center justify-center text-gray-450 shrink-0">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <span className="font-semibold text-sm text-gray-900 block truncate">
                          {group.formattedDate}
                        </span>
                        <span className="text-xs text-gray-400 block font-medium">
                          {group.transactions.length} {group.transactions.length === 1 ? 'transaction' : 'transactions'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`font-bold text-sm ${isDeductionTab ? 'text-amber-600' : 'text-emerald-600'}`}>
                        RM {group.dailyTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <div className="text-gray-400 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div
                      id={panelId}
                      role="region"
                      aria-label={`Transactions for ${group.formattedDate}`}
                      className="pl-3 sm:pl-4 border-l-2 border-gray-200/60 ml-5 sm:ml-6 space-y-2.5 mt-2 transition-all duration-200"
                    >
                      {group.transactions.map((tx) => {
                        const cleanCust = cleanCustomerName(tx.customer_name);
                        const stylistDisplayName = tx.stylist_name || tx.employee_name || 'Unlinked';

                        return (
                          <div
                            key={tx.id}
                            className="bg-white border border-gray-200/80 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-gray-300 transition-all gap-4"
                          >
                            <div className="space-y-1.5 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-sm text-gray-900 truncate block">
                                  {tx.item_description || 'Unknown Service'}
                                </span>

                                {/* Stylist Badge */}
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-50 text-slate-700 border border-slate-150 uppercase tracking-wider">
                                  <User className="w-2.5 h-2.5" />
                                  {stylistDisplayName}
                                </span>

                                {/* Branch Badge */}
                                {tx.branch && (
                                  <span className="inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-gray-50 text-gray-500 border border-gray-150 uppercase tracking-wider">
                                    <MapPin className="w-2.5 h-2.5" />
                                    {tx.branch}
                                  </span>
                                )}

                                {/* Deduction Label Badge */}
                                {tx.deduction > 0 && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100 uppercase tracking-wider">
                                    Deduction Sale
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
                                <span className="font-medium text-gray-700 truncate max-w-[130px]">
                                  {cleanCust}
                                </span>
                                <span className="text-gray-300">•</span>
                                <span>{formatDate(tx.transaction_date)}</span>
                              </div>
                            </div>

                            <div className="text-right flex flex-col items-end shrink-0">
                              {/* Primary Amount Column */}
                              {tx.amount !== 0 && (
                                <span className={`font-bold text-sm ${tx.amount > 0 ? 'text-emerald-600' : 'text-gray-900'}`}>
                                  {tx.amount > 0 ? '+' : ''}RM{tx.amount.toFixed(2)}
                                </span>
                              )}

                              {/* Secondary Deduction Column */}
                              {tx.deduction > 0 && (
                                <span className="font-bold text-sm text-amber-600">
                                  RM{tx.deduction.toFixed(2)}
                                </span>
                              )}

                              {/* Fallback 0.00 display */}
                              {tx.amount === 0 && tx.deduction === 0 && (
                                <span className="font-semibold text-sm text-gray-400">
                                  RM0.00
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
