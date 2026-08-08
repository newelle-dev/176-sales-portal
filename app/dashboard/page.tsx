import { createClient, getCachedSession } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Scissors, Package, ShoppingBag, Percent, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import TransactionsList from './TransactionsList';
import PopoverDateFilter from '@/components/dashboard/PopoverDateFilter';
import { getTransactionCategory, cleanItemDescription } from '@/lib/transaction-utils';
import { resolveDateFilterParams } from '@/lib/date-utils';
import { ITEM_DICTIONARY } from '@/lib/item-dictionary';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// ---------------------------------------------------------------------------
// Metric card configuration — avoids repeating the same Card template 4×
// ---------------------------------------------------------------------------

interface MetricConfig {
  label: string;
  icon: typeof Scissors;
  unit: string;
}

const METRICS: MetricConfig[] = [
  { label: 'Ala Carte', icon: Scissors, unit: 'services' },
  { label: 'Packages', icon: Package, unit: 'items' },
  { label: 'Products', icon: ShoppingBag, unit: 'retail items' },
  { label: 'Deductions', icon: Percent, unit: 'items' },
];

// ---------------------------------------------------------------------------
// Aggregation helper — keeps the page component focused on layout
// ---------------------------------------------------------------------------

interface AggregationResult {
  sums: number[];        // [alacarte, packages, products, deductions]
  counts: number[];      // [alacarte, packages, products, deductions]
  totalSales: number;    // including deductions
  netSales: number;      // excluding deductions
}

function aggregateTransactions(
  txList: { type: string; amount: number; deduction: number }[],
): AggregationResult {
  let alacarteSum = 0, packageSum = 0, productSum = 0, deductionSum = 0;
  let alacarteCount = 0, packageCount = 0, productCount = 0, deductionCount = 0;

  txList.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    const ded = Number(tx.deduction) || 0;

    deductionSum += ded;
    if (ded > 0) deductionCount++;

    const category = getTransactionCategory({ type: tx.type, amount: amt });
    switch (category) {
      case 'alacarte':
        alacarteSum += amt;
        if (amt !== 0) alacarteCount++;
        break;
      case 'packages':
        packageSum += amt;
        if (amt !== 0) packageCount++;
        break;
      case 'products':
        productSum += amt;
        if (amt !== 0) productCount++;
        break;
    }
  });

  return {
    sums: [alacarteSum, packageSum, productSum, deductionSum],
    counts: [alacarteCount, packageCount, productCount, deductionCount],
    // Deductions represent real revenue from deduction transactions and are intentionally included in total sales
    totalSales: alacarteSum + packageSum + productSum + deductionSum,
    netSales: alacarteSum + packageSum + productSum,
  };
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const { user, profile } = await getCachedSession();

  if (!user || !profile) {
    redirect('/login');
  }

  const supabase = await createClient();

  const resolvedParams = await searchParams;
  const {
    resolvedMonthType,
    startDate: startOfMonth,
    endDate: startOfNextMonth,
    selStartMonthStr,
    selEndMonthStr,
    dateRangeLabel,
    cutoffLabel,
    availableMonths,
  } = resolveDateFilterParams(resolvedParams);

  // Fetch transactions for the selected month or date range
  const { data: transactions, error: txError } = await supabase
    .from('transactions')
    .select('*')
    .eq('profile_id', user.id)
    .gte('transaction_date', startOfMonth)
    .lt('transaction_date', startOfNextMonth)
    .order('transaction_date', { ascending: false });

  if (txError) {
    // Log server-side for debugging; display a user-friendly fallback
    console.error('[DashboardPage] Failed to fetch transactions:', txError.message);
  }

  const txList = transactions || [];

  // Pre-resolve item descriptions server-side so the 37KB ITEM_DICTIONARY
  // doesn't need to ship in the client bundle.
  const resolvedTxList = txList.map((tx) => ({
    ...tx,
    item_description: cleanItemDescription(tx.item_description, ITEM_DICTIONARY),
  }));

  // Aggregations
  const { sums, counts, totalSales, netSales } = aggregateTransactions(txList);
  const currentMonthName = dateRangeLabel;

  return (
    <main className="max-w-md md:max-w-4xl w-full mx-auto px-4 py-6 md:py-10 space-y-6 sm:space-y-8">
      {/* Welcome Banner & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-gray-150 p-4 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            Hello, {profile?.name || 'Stylist'}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 font-medium flex items-center gap-1.5 select-none">
            <Calendar className="w-3.5 h-3.5" />
            Performance for {currentMonthName}
          </p>
        </div>
        <div className="shrink-0 pt-2 sm:pt-0 border-t border-gray-100 sm:border-0">
          <PopoverDateFilter
            months={availableMonths}
            currentMonthType={resolvedMonthType}
            startMonth={selStartMonthStr}
            endMonth={selEndMonthStr}
            basePath="/dashboard"
            cutoffLabel={cutoffLabel}
          />
        </div>
      </div>

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Monthly Sales (with deductions) */}
        <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-5 sm:p-6 flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block select-none">
                Total Monthly Sales (Incl. Deductions)
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                RM {totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">
                  {txList.length} total transaction records
                </span>
              </div>
            </div>

            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-150 flex items-center justify-center text-gray-700 shrink-0 select-none">
              <TrendingUp className="w-5.5 h-5.5 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        {/* Total Monthly Sales (excluding deductions) */}
        <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-5 sm:p-6 flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block select-none">
                Total Monthly Sales (Excl. Deductions)
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                RM {netSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">
                  Revenue from services, packages & retail
                </span>
              </div>
            </div>

            <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-150 flex items-center justify-center text-gray-700 shrink-0 select-none">
              <DollarSign className="w-5.5 h-5.5 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid of Category Cards — driven by METRICS config */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {METRICS.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <Card key={metric.label} className="border-gray-200 bg-white shadow-sm rounded-xl overflow-hidden flex flex-col justify-between">
              <CardHeader className="p-3.5 sm:p-4 pb-0 flex flex-row items-center justify-between space-y-0 select-none">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{metric.label}</span>
                <Icon className="w-4 h-4 text-gray-400" />
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4 pt-2.5 sm:pt-3">
                <div className="text-base sm:text-lg font-bold text-gray-900 truncate">
                  RM {sums[idx].toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                  {counts[idx]} {metric.unit}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Transaction History Section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Recent Transactions</h2>
          <p className="text-xs text-gray-500">List of all your transaction and deduction records for this month.</p>
        </div>
        <TransactionsList transactions={resolvedTxList} />
      </div>
    </main>
  );
}
