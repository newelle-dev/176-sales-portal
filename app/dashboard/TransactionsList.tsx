'use client';

import { useState } from 'react';
import { Search, Sparkles, Scissors, Package, ShoppingBag, Percent, MapPin, Calendar, ChevronDown } from 'lucide-react';
import { ITEM_DICTIONARY } from '@/lib/item-dictionary';

interface Transaction {
  id: string;
  amount: number;
  deduction: number;
  transaction_date: string;
  customer_name: string;
  item_description: string;
  type: string;
  branch: string | null;
  employee_name: string;
}

interface TransactionsListProps {
  transactions: Transaction[];
}

type FilterType = 'all' | 'alacarte' | 'packages' | 'products' | 'deductions';

export default function TransactionsList({ transactions }: TransactionsListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  const toggleDay = (dateKey: string) => {
    setExpandedDays((prev) => ({
      ...prev,
      [dateKey]: !prev[dateKey],
    }));
  };

  // Helper to clean customer name
  const cleanCustomerName = (name: string) => {
    if (!name) return 'Walk-in';
    return name.includes(':') ? name.split(':').slice(1).join(':').trim() : name;
  };

  // Helper to clean item description (optional formatting)
  const cleanItemDescription = (desc: string) => {
    if (!desc) return '';
    // If the description is just a code (like HSCS07), map it to the full description
    let fullDesc = desc;
    if (!desc.includes(':') && ITEM_DICTIONARY[desc]) {
      fullDesc = ITEM_DICTIONARY[desc];
    }
    // Strip prefixes like "HSCS08: A La Carte -"
    return fullDesc.replace(/^[^:]+:\s*(?:A La Carte|Package|Product)?\s*-\s*/i, '').trim();
  };

  // Helper to format date
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => {
    // 1. Text Search filtering
    const searchLower = searchQuery.toLowerCase();
    const customerClean = cleanCustomerName(tx.customer_name).toLowerCase();
    const descLower = tx.item_description?.toLowerCase() || '';
    const branchLower = tx.branch?.toLowerCase() || '';
    const matchesSearch =
      customerClean.includes(searchLower) ||
      descLower.includes(searchLower) ||
      branchLower.includes(searchLower);

    if (!matchesSearch) return false;

    // 2. Tab/Category filtering
    if (activeFilter === 'all') return true;
    if (activeFilter === 'alacarte') return tx.type === 'S' && tx.amount > 0;
    if (activeFilter === 'packages') return (tx.type === 'G' || tx.type === 'C') && tx.amount > 0;
    if (activeFilter === 'products') return tx.type === 'P' && tx.amount > 0;
    if (activeFilter === 'deductions') return tx.deduction > 0;

    return true;
  });

  // Group filtered transactions by local date
  const groupsMap: Record<string, Transaction[]> = {};
  filteredTransactions.forEach((tx) => {
    try {
      const date = new Date(tx.transaction_date);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${day}`;
      
      if (!groupsMap[dateKey]) {
        groupsMap[dateKey] = [];
      }
      groupsMap[dateKey].push(tx);
    } catch {
      if (!groupsMap['unknown']) {
        groupsMap['unknown'] = [];
      }
      groupsMap['unknown'].push(tx);
    }
  });

  // Sort dates descending
  const sortedDates = Object.keys(groupsMap).sort((a, b) => {
    if (a === 'unknown') return 1;
    if (b === 'unknown') return -1;
    return b.localeCompare(a);
  });

  const getFormattedDate = (dateKey: string) => {
    if (dateKey === 'unknown') return 'Unknown Date';
    try {
      const [year, month, day] = dateKey.split('-').map(Number);
      const date = new Date(year, month - 1, day);
      return date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateKey;
    }
  };

  const groupedDays = sortedDates.map((dateKey) => {
    const txs = groupsMap[dateKey];
    const dailyTotal = txs.reduce((sum, tx) => sum + (Number(tx.amount) || 0) + (Number(tx.deduction) || 0), 0);
    return {
      dateKey,
      formattedDate: getFormattedDate(dateKey),
      transactions: txs,
      dailyTotal,
    };
  });

  return (
    <div className="space-y-6">
      {/* Search and Tabs Container */}
      <div className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by customer, service, or branch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-black placeholder-gray-400 shadow-sm text-gray-900 transition-all"
          />
        </div>

        {/* Horizontal Scrollable Tabs */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-none select-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {[
            { id: 'all', label: 'All', icon: null },
            { id: 'alacarte', label: 'Ala Carte', icon: Scissors },
            { id: 'packages', label: 'Packages', icon: Package },
            { id: 'products', label: 'Products', icon: ShoppingBag },
            { id: 'deductions', label: 'Deductions', icon: Percent },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeFilter === tab.id;
            return (
              <button
                key={tab.id}
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

      {/* Transaction List */}
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
              return (
                <div key={group.dateKey} className="space-y-2">
                  {/* Accordion Header */}
                  <button
                    onClick={() => toggleDay(group.dateKey)}
                    className="w-full bg-white border border-gray-200/80 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-gray-300 hover:bg-gray-50/20 transition-all gap-4 text-left cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-450 shrink-0">
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
                      <span className="font-bold text-sm text-emerald-600">
                        RM {group.dailyTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <div className="text-gray-400 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                        <ChevronDown className="w-4 h-4" />
                      </div>
                    </div>
                  </button>

                  {/* Accordion Content */}
                  {isExpanded && (
                    <div className="pl-3 sm:pl-4 border-l-2 border-gray-200/60 ml-5 sm:ml-6 space-y-2.5 mt-2 transition-all duration-200">
                      {group.transactions.map((tx) => {
                        const isDeductionOnly = tx.deduction > 0 && tx.amount === 0;
                        const cleanDesc = cleanItemDescription(tx.item_description);
                        const cleanCust = cleanCustomerName(tx.customer_name);

                        return (
                          <div
                            key={tx.id}
                            className="bg-white border border-gray-200/80 rounded-xl p-4 flex items-center justify-between shadow-sm hover:border-gray-300 transition-all gap-4"
                          >
                            <div className="space-y-1 min-w-0 flex-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-sm text-gray-900 truncate block">
                                  {cleanDesc || 'Unknown Service'}
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
