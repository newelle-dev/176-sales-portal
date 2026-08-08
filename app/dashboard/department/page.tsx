import { createClient, getCachedSession } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Scissors, Package, ShoppingBag, Percent, Calendar, TrendingUp, TrendingDown, DollarSign, Target, Award } from 'lucide-react';
import PopoverDateFilter from '@/components/dashboard/PopoverDateFilter';
import { getTransactionCategory, cleanItemDescription } from '@/lib/transaction-utils';
import { ITEM_DICTIONARY } from '@/lib/item-dictionary';
import { resolveDateFilterParams } from '@/lib/date-utils';
import DepartmentTransactionsList from './DepartmentTransactionsList';
import StylistLeaderboardClient from '@/app/admin/components/StylistLeaderboardClient';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

const METRICS = [
  { label: 'Ala Carte', icon: Scissors, unit: 'services' },
  { label: 'Packages', icon: Package, unit: 'items' },
  { label: 'Products', icon: ShoppingBag, unit: 'retail items' },
  { label: 'Deductions', icon: Percent, unit: 'items' },
];

function getDepartmentLabel(dept: string): string {
  switch (dept) {
    case 'HAIR':
      return 'Hair';
    case 'NAILS':
      return 'Nails';
    case 'ARTISTRY_LASH':
      return 'Artistry & Lash';
    default:
      return dept;
  }
}

// Aggregation helper
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
    totalSales: alacarteSum + packageSum + productSum + deductionSum,
    netSales: alacarteSum + packageSum + productSum,
  };
}

export default async function DepartmentSalesPage({ searchParams }: PageProps) {
  const { user, profile } = await getCachedSession();

  if (!user || !profile) {
    redirect('/login');
  }

  // Only allow directors and admins
  if (profile.role !== 'director' && profile.role !== 'admin') {
    redirect('/dashboard');
  }

  const resolvedParams = await searchParams;

  // Resolve department
  let department = profile.department;
  if (profile.role === 'admin' && !department) {
    const paramDept = resolvedParams?.dept;
    department = (typeof paramDept === 'string' && ['HAIR', 'NAILS', 'ARTISTRY_LASH'].includes(paramDept)) 
      ? paramDept 
      : 'HAIR';
  }

  if (!department) {
    redirect('/dashboard');
  }

  const supabase = await createClient();

  const {
    resolvedMonthType,
    startDate: startOfMonth,
    endDate: startOfNextMonth,
    selStartMonthStr,
    selEndMonthStr,
    dateRangeLabel,
    cutoffLabel,
    selYear,
    availableMonths,
    currentYear,
    currentDay,
  } = resolveDateFilterParams(resolvedParams);

  const startOfYear = `${selYear}-01-01T00:00:00+08:00`;
  const startOfNextYear = `${selYear + 1}-01-01T00:00:00+08:00`;

  // 1. Fetch department stylists (members)
  const { data: departmentMembers, error: membersError } = await supabase
    .from('profiles')
    .select('id, name, email, role, username')
    .eq('department', department)
    .order('name', { ascending: true });

  if (membersError) {
    console.error('[DepartmentSalesPage] Failed to fetch department members:', membersError.message);
  }

  const members = departmentMembers || [];
  const memberIds = members.map((m) => m.id);

  // 2. Fetch transactions for these department members
  let transactions: any[] = [];
  if (memberIds.length > 0) {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .in('profile_id', memberIds)
      .gte('transaction_date', startOfMonth)
      .lt('transaction_date', startOfNextMonth)
      .order('transaction_date', { ascending: false });

    if (error) {
      console.error('[DepartmentSalesPage] Failed to fetch transactions:', error.message);
    } else {
      transactions = data || [];
    }
  }

  // Pre-resolve descriptions and map stylist names
  const resolvedTransactions = transactions.map((tx) => {
    const matchingMember = members.find((m) => m.id === tx.profile_id);
    return {
      ...tx,
      item_description: cleanItemDescription(tx.item_description, ITEM_DICTIONARY),
      stylist_name: matchingMember?.name || tx.employee_name,
    };
  });

  // Aggregations for Department KPIs
  const { sums, counts, totalSales, netSales } = aggregateTransactions(transactions);

  // Fetch stylist leaderboard from RPC
  let leaderboardData = [] as any[];
  try {
    const { data, error } = await supabase.rpc('get_monthly_stylist_leaderboard', {
      start_date: startOfMonth,
      end_date: startOfNextMonth,
      filter_department: department
    });
    
    if (error) {
      console.error('[DepartmentSalesPage] Failed to fetch stylist leaderboard:', error.message);
    } else {
      leaderboardData = (data || []).map(row => ({
        employee_name: row.employee_name,
        department: row.department,
        branch: row.branch,
        all_amount: Number(row.all_amount),
        all_count: Number(row.all_count),
        alacarte_amount: Number(row.alacarte_amount),
        alacarte_count: Number(row.alacarte_count),
        packages_amount: Number(row.packages_amount),
        packages_count: Number(row.packages_count),
        products_amount: Number(row.products_amount),
        products_count: Number(row.products_count),
      }));
    }
  } catch (err) {
    console.error('[DepartmentSalesPage] Error calling get_monthly_stylist_leaderboard:', err);
  }

  // 3. Fetch target for the department
  const { data: targetData } = await supabase
    .from('targets')
    .select('target_amount')
    .eq('year', selYear)
    .eq('department', department)
    .maybeSingle();

  const deptTarget = Number(targetData?.target_amount || 0);

  // 4. Fetch YTD sales for the department
  let deptYTDSales = 0;
  const { data: ytdDeptSalesRes } = await supabase
    .rpc('get_sales_by_department', {
      start_date: startOfYear,
      end_date: startOfNextYear,
    });

  if (ytdDeptSalesRes) {
    const matched = ytdDeptSalesRes.find((d: any) => d.department === department);
    deptYTDSales = Number(matched?.sales_sum || 0);
  }

  // Time calculations for Target Pacing
  const isCurrentYear = selYear === currentYear;
  const isFutureYear = selYear > currentYear;
  const isLeapYear = (selYear % 4 === 0 && selYear % 100 !== 0) || (selYear % 400 === 0);
  const totalDays = isLeapYear ? 366 : 365;

  let daysElapsed = totalDays;
  if (isCurrentYear) {
    const startOfYearDate = new Date(selYear, 0, 1);
    const klPartsDay = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kuala_Lumpur',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
    }).formatToParts(new Date());
    const klYear = Number(klPartsDay.find(p => p.type === 'year')?.value);
    const klMonth = Number(klPartsDay.find(p => p.type === 'month')?.value) - 1;
    const klDay = Number(klPartsDay.find(p => p.type === 'day')?.value);
    
    const today = new Date(klYear, klMonth, klDay);
    const diffTime = today.getTime() - startOfYearDate.getTime();
    daysElapsed = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }

  const timePassedPercent = isFutureYear ? 0 : (daysElapsed / totalDays) * 100;
  const deptProgressPercent = deptTarget > 0 ? (deptYTDSales / deptTarget) * 100 : 0;
  const paceDifference = deptProgressPercent - timePassedPercent;

  const currentMonthName = dateRangeLabel;

  return (
    <main className="max-w-md md:max-w-4xl w-full mx-auto px-4 py-6 md:py-10 space-y-6 sm:space-y-8">
      {/* Welcome Banner & Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-gray-150 p-5 sm:p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
              {getDepartmentLabel(department)} Department
            </h1>
            <span className="text-[9px] sm:text-[10px] px-2 py-0.5 rounded-full bg-slate-900 text-white font-bold uppercase tracking-wider">
              Director Portal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-500 font-medium flex items-center gap-1.5 select-none">
            <Calendar className="w-3.5 h-3.5" />
            Performance for {currentMonthName}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0 pt-3 sm:pt-0 border-t border-gray-100 sm:border-0">
          {profile.role === 'admin' && (
            <div className="flex gap-1.5 text-[10px] font-bold bg-gray-50 border border-gray-150 p-1 rounded-xl select-none">
              {(['HAIR', 'NAILS', 'ARTISTRY_LASH'] as const).map((d) => (
                <Link
                  key={d}
                  href={`/dashboard/department?dept=${d}&monthType=${resolvedMonthType}&startMonth=${selStartMonthStr}&endMonth=${selEndMonthStr}`}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                    department === d 
                      ? 'bg-black text-white shadow-sm' 
                      : 'text-gray-500 hover:text-black hover:bg-gray-100/50'
                  }`}
                >
                  {getDepartmentLabel(d)}
                </Link>
              ))}
            </div>
          )}
          <PopoverDateFilter
            months={availableMonths}
            currentMonthType={resolvedMonthType}
            startMonth={selStartMonthStr}
            endMonth={selEndMonthStr}
            basePath={profile.role === 'admin' ? `/dashboard/department?dept=${department}` : '/dashboard/department'}
            cutoffLabel={cutoffLabel}
          />
        </div>
      </div>

      {/* Target Progress Card */}
      {deptTarget > 0 && (
        <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-gray-700" />
                  {getDepartmentLabel(department)} department Target Progress ({selYear})
                </CardTitle>
                <CardDescription className="text-xs text-gray-400">
                  Annual target tracking excluding deduction sales
                </CardDescription>
              </div>
              {isCurrentYear && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${
                  paceDifference >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-650'
                }`}>
                  {paceDifference >= 0 ? (
                    <>
                      <TrendingUp className="w-3.5 h-3.5" />
                      +{paceDifference.toFixed(1)}% ahead of pace
                    </>
                  ) : (
                    <>
                      <TrendingDown className="w-3.5 h-3.5" />
                      {paceDifference.toFixed(1)}% behind pace
                    </>
                  )}
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">YTD Department Sales</span>
                <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                  RM {deptYTDSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div className="space-y-1 sm:text-right">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Annual Target</span>
                <div className="text-xl sm:text-2xl font-extrabold text-gray-700">
                  RM {deptTarget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] sm:text-xs font-semibold text-gray-400 block select-none">
                  (RM {(deptTarget / 312).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / day)
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              {isCurrentYear && (
                <div className="flex items-center justify-end gap-3 text-[10px] text-gray-400 font-bold select-none pb-0.5">
                  <div className="flex items-center gap-1">
                    <div className="w-2.5 h-2 bg-black rounded-sm" />
                    <span>YTD Sales</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-0.5 h-2.5 bg-slate-400" />
                    <span>Pace Target ({timePassedPercent.toFixed(1)}%)</span>
                  </div>
                </div>
              )}

              <div className="relative py-1">
                <div
                  role="progressbar"
                  aria-valuenow={Math.min(100, deptProgressPercent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${getDepartmentLabel(department)} Target Progress`}
                  className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-black transition-all duration-550"
                    style={{ width: `${Math.min(100, deptProgressPercent)}%` }}
                  />
                </div>
                {isCurrentYear && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 z-10 flex flex-col items-center justify-center animate-pulse"
                    style={{ left: `${timePassedPercent}%` }}
                    title={`Pace Target: ${timePassedPercent.toFixed(1)}%`}
                  >
                    <div className="w-0.5 h-[18px] bg-slate-400 shadow-[0_0_2px_rgba(255,255,255,1)] rounded-full" />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold select-none">
                <span>{deptProgressPercent.toFixed(1)}% Achieved</span>
                {isCurrentYear ? (
                  <span>Day {daysElapsed} of {totalDays}</span>
                ) : isFutureYear ? (
                  <span>Year Not Started</span>
                ) : (
                  <span>Year Ended</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Total Monthly Sales (with deductions) */}
        <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <CardContent className="p-5 sm:p-6 flex items-center justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block select-none">
                Monthly Department Sales (Incl. Deductions)
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                RM {totalSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium">
                  {transactions.length} total transaction records
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
                Monthly Department Sales (Excl. Deductions)
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

      {/* Grid of Category Cards */}
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

      {/* Stylist Leaderboard Breakdown */}
      <div className="space-y-4">
        <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden flex flex-col">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-600" />
                  Stylist Performance Leaderboard
                </CardTitle>
                <CardDescription className="text-xs text-gray-400">
                  Stylists ranked by Nett Sales for {currentMonthName}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <StylistLeaderboardClient
            currentMonthName={currentMonthName}
            data={leaderboardData}
            hideDepartmentFilter={true}
          />
        </Card>
      </div>

      {/* Transaction History Section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Department Transaction History</h2>
          <p className="text-xs text-gray-500">Transactions performed by all stylists in your department for this month.</p>
        </div>
        <DepartmentTransactionsList 
          transactions={resolvedTransactions} 
          stylists={members}
        />
      </div>
    </main>
  );
}
