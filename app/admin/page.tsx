import { createAdminClient } from '@/lib/supabase/admin';
import { createClient, getCachedSession } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  TrendingUp,
  Target,
  MapPin,
  Calendar,
  Sparkles,
  Award,
  TrendingDown,
  AlertTriangle
} from 'lucide-react';
import EditTargetDialog from './EditTargetDialog';
import AdminMonthSelector from './AdminMonthSelector';

// Always fetch fresh data — this is a live analytics dashboard
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface MonthTxRow {
  amount: number;
  branch: string | null;
  type: string;
  employee_name: string;
  profile_id: string | null;
}

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const { user, profile } = await getCachedSession();

  if (!user || !profile || profile.role !== 'admin') {
    redirect('/login');
  }

  const resolvedParams = await searchParams;

  // Generate list of available months (from Jan 2026 to current calendar month)
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  const availableMonths = [];
  const startYear = 2026;
  const startMonth = 0; // January

  let y = startYear;
  let m = startMonth;

  while (y < currentYear || (y === currentYear && m <= currentMonth)) {
    const dateObj = new Date(y, m, 1);
    const value = `${y}-${(m + 1).toString().padStart(2, '0')}`;
    const label = dateObj.toLocaleString('en-US', { month: 'long', year: 'numeric' });
    availableMonths.push({ value, label });

    m++;
    if (m > 11) {
      m = 0;
      y++;
    }
  }
  availableMonths.reverse();

  const defaultMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  const selectedMonthStr =
    typeof resolvedParams?.month === 'string' && /^\d{4}-\d{2}$/.test(resolvedParams.month)
      ? resolvedParams.month
      : defaultMonthStr;

  const [selYear, selMonth] = selectedMonthStr.split('-').map(Number);

  const startOfYear = `${selYear}-01-01T00:00:00+08:00`;
  const startOfNextYear = `${selYear + 1}-01-01T00:00:00+08:00`;

  const startOfMonth = `${selYear}-${selMonth.toString().padStart(2, '0')}-01T00:00:00+08:00`;
  const nextMonthYear = selMonth === 12 ? selYear + 1 : selYear;
  const nextMonthVal = selMonth === 12 ? 1 : selMonth + 1;
  const startOfNextMonth = `${nextMonthYear}-${nextMonthVal.toString().padStart(2, '0')}-01T00:00:00+08:00`;

  const supabase = createAdminClient();

  // Fetch targets and transactions
  const targetRes = await supabase
    .from('targets')
    .select('department, target_amount')
    .eq('year', selYear);

  if (targetRes.error) {
    console.error('[AdminDashboardPage] Failed to fetch annual targets:', targetRes.error.message);
  }

  const targetsList = targetRes.data || [];
  const hairTarget = Number(targetsList.find(t => t.department === 'HAIR')?.target_amount || 0);
  const nailsTarget = Number(targetsList.find(t => t.department === 'NAILS')?.target_amount || 0);
  const artistryLashTarget = Number(targetsList.find(t => t.department === 'ARTISTRY_LASH')?.target_amount || 0);
  
  const totalTargetStored = Number(targetsList.find(t => t.department === 'TOTAL')?.target_amount || 0);
  const annualTarget = totalTargetStored > 0 ? totalTargetStored : (hairTarget + nailsTarget + artistryLashTarget);

  let ytdSales = 0;
  let ytdDeptSalesList: { department: string; sales_sum: number }[] = [];
  let monthSales = 0;
  let monthTxCount = 0;
  const branchMap = {
    Bangsar: 0,
    SS2: 0,
    KLGCC: 0
  };
  let alacarteSum = 0;
  let packageSum = 0;
  let productSum = 0;
  let leaderboard: {
    employee_name: string;
    amount: number;
    count: number;
    branch: string;
  }[] = [];
  let hasFetchError = false;

  try {
    const [
      ytdSalesRes,
      ytdDeptSalesRes,
      monthSummaryRes,
      branchSalesRes,
      salesMixRes,
      leaderboardRes
    ] = await Promise.all([
      supabase.rpc('get_sales_sum', {
        start_date: startOfYear,
        end_date: startOfNextYear
      }),
      supabase.rpc('get_sales_by_department', {
        start_date: startOfYear,
        end_date: startOfNextYear
      }),
      supabase.rpc('get_monthly_sales_summary', {
        start_date: startOfMonth,
        end_date: startOfNextMonth
      }),
      supabase.rpc('get_monthly_branch_sales', {
        start_date: startOfMonth,
        end_date: startOfNextMonth
      }),
      supabase.rpc('get_monthly_sales_mix', {
        start_date: startOfMonth,
        end_date: startOfNextMonth
      }),
      supabase.rpc('get_monthly_stylist_leaderboard', {
        start_date: startOfMonth,
        end_date: startOfNextMonth
      }),
    ]);

    if (ytdSalesRes.error) {
      console.error('[AdminDashboardPage] Failed to fetch YTD sales sum:', ytdSalesRes.error.message);
      hasFetchError = true;
    } else {
      ytdSales = Number(ytdSalesRes.data || 0);
    }

    if (ytdDeptSalesRes.error) {
      console.error('[AdminDashboardPage] Failed to fetch YTD department sales sum:', ytdDeptSalesRes.error.message);
      hasFetchError = true;
    } else {
      ytdDeptSalesList = ytdDeptSalesRes.data || [];
    }

    if (monthSummaryRes.error) {
      console.error('[AdminDashboardPage] Failed to fetch monthly sales summary:', monthSummaryRes.error.message);
      hasFetchError = true;
    } else {
      monthSales = Number(monthSummaryRes.data?.[0]?.sales_sum || 0);
      monthTxCount = Number(monthSummaryRes.data?.[0]?.tx_count || 0);
    }

    if (branchSalesRes.error) {
      console.error('[AdminDashboardPage] Failed to fetch branch sales:', branchSalesRes.error.message);
      hasFetchError = true;
    } else {
      branchSalesRes.data?.forEach(row => {
        if (row.branch in branchMap) {
          branchMap[row.branch as keyof typeof branchMap] = Number(row.sales_sum);
        }
      });
    }

    if (salesMixRes.error) {
      console.error('[AdminDashboardPage] Failed to fetch sales mix:', salesMixRes.error.message);
      hasFetchError = true;
    } else {
      salesMixRes.data?.forEach(row => {
        if (row.category === 'alacarte') alacarteSum = Number(row.sales_sum);
        else if (row.category === 'packages') packageSum = Number(row.sales_sum);
        else if (row.category === 'products') productSum = Number(row.sales_sum);
      });
    }

    if (leaderboardRes.error) {
      console.error('[AdminDashboardPage] Failed to fetch stylist leaderboard:', leaderboardRes.error.message);
      hasFetchError = true;
    } else {
      leaderboard = (leaderboardRes.data || []).map(row => ({
        employee_name: row.employee_name,
        amount: Number(row.amount),
        count: Number(row.count),
        branch: row.branch
      }));
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('[AdminDashboardPage] Failed to fetch dashboard data:', msg);
    hasFetchError = true;
  }

  const hairYTDSales = Number(ytdDeptSalesList.find(d => d.department === 'HAIR')?.sales_sum || 0);
  const nailsYTDSales = Number(ytdDeptSalesList.find(d => d.department === 'NAILS')?.sales_sum || 0);
  const artistryLashYTDSales = Number(ytdDeptSalesList.find(d => d.department === 'ARTISTRY_LASH')?.sales_sum || 0);

  const branchTotal = branchMap.Bangsar + branchMap.SS2 + branchMap.KLGCC;
  const mixTotal = alacarteSum + packageSum + productSum;

  // Progress calculations
  const ytdProgressPercent = annualTarget > 0 ? (ytdSales / annualTarget) * 100 : 0;
  const monthlyMilestone = annualTarget / 12;
  const monthlyProgressPercent = monthlyMilestone > 0 ? (monthSales / monthlyMilestone) * 100 : 0;

  // 6. Year Pace progress checks
  const isCurrentYear = selYear === now.getFullYear();
  const isFutureYear = selYear > now.getFullYear();
  const isLeapYear = (selYear % 4 === 0 && selYear % 100 !== 0) || (selYear % 400 === 0);
  const totalDays = isLeapYear ? 366 : 365;

  let daysElapsed = totalDays;
  if (isCurrentYear) {
    const startOfYearDate = new Date(selYear, 0, 1);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffTime = today.getTime() - startOfYearDate.getTime();
    daysElapsed = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }

  const timePassedPercent = isFutureYear ? 0 : (daysElapsed / totalDays) * 100;
  const paceDifference = ytdProgressPercent - timePassedPercent;

  const currentMonthName = new Date(selYear, selMonth - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric'
  });
  return (
    <main className="max-w-4xl w-full mx-auto px-6 py-10 space-y-8">
      {/* Header section with month selector and config */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white border border-gray-150 p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Admin Dashboard</h1>
          <p className="text-sm text-gray-500 font-medium flex items-center gap-1.5 select-none">
            <Calendar className="w-4 h-4 text-gray-400" />
            Performance insights for {currentMonthName}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <AdminMonthSelector months={availableMonths} defaultValue={selectedMonthStr} />
          <EditTargetDialog
            key={`${selYear}-${hairTarget}-${nailsTarget}-${artistryLashTarget}`}
            year={selYear}
            initialHair={hairTarget}
            initialNails={nailsTarget}
            initialArtistryLash={artistryLashTarget}
          />
        </div>
      </div>

      {/* Fetch Error Warning Banner */}
      {hasFetchError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs flex flex-col gap-2 shadow-sm font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4.5 h-4.5 text-red-650 shrink-0" />
            <span>We encountered an issue fetching database metrics for this month. Dashboard statistics and leaderboard values may be incomplete or empty.</span>
          </div>
          <div>
            <a href={`/admin?month=${selectedMonthStr}`} className="underline font-bold text-red-700 hover:text-red-950">
              Try refreshing the page
            </a>
          </div>
        </div>
      )}

      {/* Yearly Target Progress Card */}
      <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
                <Target className="w-5 h-5 text-gray-700" />
                Year {selYear} Target Progress
              </CardTitle>
              <CardDescription className="text-xs text-gray-400">
                Annual target tracking excluding deduction sales
              </CardDescription>
            </div>
            {annualTarget > 0 && isCurrentYear && (
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 ${paceDifference >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-650'
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
        <CardContent className="space-y-6">
          {annualTarget > 0 ? (
            <>
              {/* Overall Progress */}
              <div className="space-y-3 pb-5 border-b border-gray-100">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">YTD Nett Sales</span>
                    <div className="text-3xl font-extrabold tracking-tight text-gray-900">
                      RM {ytdSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <div className="space-y-1 sm:text-right">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Overall Salon Target</span>
                    <div className="text-2xl font-extrabold text-gray-700">
                      RM {annualTarget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div
                    role="progressbar"
                    aria-valuenow={Math.min(100, ytdProgressPercent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Yearly Target Progress"
                    className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden relative"
                  >
                    {/* Time elapsed marker (dashed indicator overlay) */}
                    {isCurrentYear && (
                      <div
                        className="absolute top-0 bottom-0 border-r-2 border-dashed border-gray-450 z-10"
                        style={{ left: `${timePassedPercent}%` }}
                        title={`Current day of year: ${timePassedPercent.toFixed(1)}%`}
                      />
                    )}
                    <div
                      className="h-full bg-black transition-all duration-550"
                      style={{ width: `${Math.min(100, ytdProgressPercent)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-gray-400 font-semibold select-none">
                    <span>{ytdProgressPercent.toFixed(1)}% Achieved</span>
                    {isCurrentYear ? (
                      <span>Day {daysElapsed} of {totalDays} ({timePassedPercent.toFixed(1)}% of year elapsed)</span>
                    ) : isFutureYear ? (
                      <span>Year Not Started</span>
                    ) : (
                      <span>Year Ended</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Department Breakdown Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
                {/* HAIR Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                    <span>Hair (HS)</span>
                    <span className="text-gray-550">{(hairTarget > 0 ? (hairYTDSales / hairTarget * 100) : 0).toFixed(1)}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={Math.min(100, hairTarget > 0 ? (hairYTDSales / hairTarget * 100) : 0)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Hair department YTD target progress"
                    className="w-full h-2 bg-gray-50 rounded-full overflow-hidden relative border border-gray-100"
                  >
                    {isCurrentYear && (
                      <div
                        className="absolute top-0 bottom-0 border-r border-dashed border-gray-400/50 z-10"
                        style={{ left: `${timePassedPercent}%` }}
                      />
                    )}
                    <div
                      className="h-full bg-slate-855 transition-all duration-550"
                      style={{ width: `${Math.min(100, hairTarget > 0 ? (hairYTDSales / hairTarget * 100) : 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                    <span>RM {hairYTDSales.toLocaleString('en-US', { maximumFractionDigits: 0 })} YTD</span>
                    <span>RM {hairTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })} target</span>
                  </div>
                </div>

                {/* NAILS Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                    <span>Nails</span>
                    <span className="text-gray-555">{(nailsTarget > 0 ? (nailsYTDSales / nailsTarget * 100) : 0).toFixed(1)}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={Math.min(100, nailsTarget > 0 ? (nailsYTDSales / nailsTarget * 100) : 0)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Nails department YTD target progress"
                    className="w-full h-2 bg-gray-50 rounded-full overflow-hidden relative border border-gray-100"
                  >
                    {isCurrentYear && (
                      <div
                        className="absolute top-0 bottom-0 border-r border-dashed border-gray-400/50 z-10"
                        style={{ left: `${timePassedPercent}%` }}
                      />
                    )}
                    <div
                      className="h-full bg-slate-855 transition-all duration-550"
                      style={{ width: `${Math.min(100, nailsTarget > 0 ? (nailsYTDSales / nailsTarget * 100) : 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                    <span>RM {nailsYTDSales.toLocaleString('en-US', { maximumFractionDigits: 0 })} YTD</span>
                    <span>RM {nailsTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })} target</span>
                  </div>
                </div>

                {/* ARTISTRY & LASH Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-800">
                    <span>Artistry & Lash</span>
                    <span className="text-gray-555">{(artistryLashTarget > 0 ? (artistryLashYTDSales / artistryLashTarget * 100) : 0).toFixed(1)}%</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={Math.min(100, artistryLashTarget > 0 ? (artistryLashYTDSales / artistryLashTarget * 100) : 0)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Artistry and Lash department YTD target progress"
                    className="w-full h-2 bg-gray-50 rounded-full overflow-hidden relative border border-gray-100"
                  >
                    {isCurrentYear && (
                      <div
                        className="absolute top-0 bottom-0 border-r border-dashed border-gray-400/50 z-10"
                        style={{ left: `${timePassedPercent}%` }}
                      />
                    )}
                    <div
                      className="h-full bg-slate-855 transition-all duration-550"
                      style={{ width: `${Math.min(100, artistryLashTarget > 0 ? (artistryLashYTDSales / artistryLashTarget * 100) : 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-400 font-semibold">
                    <span>RM {artistryLashYTDSales.toLocaleString('en-US', { maximumFractionDigits: 0 })} YTD</span>
                    <span>RM {artistryLashTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })} target</span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-xl bg-gray-50 border border-gray-150 p-4 text-center text-xs text-gray-500 font-medium">
              Click &quot;Configure Target&quot; above to set department yearly targets and unlock progress tracking.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Monthly Sales Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Monthly Performance Card */}
        <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-gray-600" />
              Monthly Sales ({currentMonthName})
            </CardTitle>
            <CardDescription className="text-xs text-gray-400">
              Total monthly Nett revenue and target progress
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Nett Sales</span>
                <div className="text-2xl font-extrabold text-emerald-600">
                  RM {monthSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
                <span className="text-[10px] text-gray-400 font-medium block">
                  {monthTxCount} transactions
                </span>
              </div>
              {annualTarget > 0 && (
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Milestone Target</span>
                  <div className="text-xl font-extrabold text-gray-700">
                    RM {monthlyMilestone.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                  </div>
                  <span className="text-[10px] text-gray-400 font-semibold block">
                    {monthlyProgressPercent.toFixed(1)}% of milestone
                  </span>
                </div>
              )}
            </div>

            {annualTarget > 0 && (
              <div className="space-y-1.5 pt-2">
                <div
                  role="progressbar"
                  aria-valuenow={Math.min(100, monthlyProgressPercent)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Monthly Sales Milestone Progress"
                  className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"
                >
                  <div
                    className="h-full bg-emerald-600 transition-all duration-550"
                    style={{ width: `${Math.min(100, monthlyProgressPercent)}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Branch Sales Breakdown Card */}
        <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-gray-900 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-gray-600" />
              Branch Contributions
            </CardTitle>
            <CardDescription className="text-xs text-gray-400">
              Contribution breakdown for {currentMonthName}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {['Bangsar', 'SS2', 'KLGCC'].map((branchName) => {
              const sales = branchMap[branchName as keyof typeof branchMap] || 0;
              const percent = branchTotal > 0 ? (sales / branchTotal) * 100 : 0;
              return (
                <div key={branchName} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-gray-700">
                    <span>{branchName}</span>
                    <span>RM {sales.toLocaleString('en-US', { minimumFractionDigits: 2 })} ({percent.toFixed(1)}%)</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Branch contribution percentage for ${branchName}`}
                    className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"
                  >
                    <div
                      className={`h-full transition-all duration-550 ${branchName === 'Bangsar' ? 'bg-slate-800' : branchName === 'SS2' ? 'bg-slate-500' : 'bg-slate-350'
                        }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Category Mix and Stylist Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Sales Mix Card */}
        <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden md:col-span-1">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-bold text-gray-900">Sales Category Mix</CardTitle>
            <CardDescription className="text-xs text-gray-400">
              Revenue distribution (Excl. Deductions)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: 'Ala Carte', value: alacarteSum },
              { label: 'Packages', value: packageSum },
              { label: 'Products', value: productSum }
            ].map((item) => {
              const percent = mixTotal > 0 ? (item.value / mixTotal) * 100 : 0;
              return (
                <div key={item.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold text-gray-700">
                    <span>{item.label}</span>
                    <span className="font-bold text-gray-900">RM {item.value.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-gray-400 font-bold select-none">
                    <span>{percent.toFixed(1)}% of sales</span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`Sales contribution percentage for category ${item.label}`}
                    className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-black"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Stylist Leaderboard Card */}
        <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden md:col-span-2">
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
          <CardContent className="p-0">
            {leaderboard.length > 0 ? (
              <div className="max-h-[350px] overflow-y-auto scrollbar-thin">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50 select-none">
                      <th className="py-2.5 px-4 text-center w-12">Rank</th>
                      <th className="py-2.5 px-4">Stylist Name</th>
                      <th className="py-2.5 px-4">Branch</th>
                      <th className="py-2.5 px-4 text-center">Qty</th>
                      <th className="py-2.5 px-4 text-right pr-6">Nett Sales</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 text-xs">
                    {leaderboard.map((stylist, index) => {
                      const isTopThree = index < 3;
                      return (
                        <tr key={stylist.employee_name} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-gray-400">
                            {isTopThree ? (
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${index === 0 ? 'bg-amber-100 text-amber-800' :
                                index === 1 ? 'bg-slate-200 text-slate-800' :
                                  'bg-orange-100 text-orange-850'
                                }`}>
                                {index + 1}
                              </span>
                            ) : (
                              index + 1
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-gray-900">
                            {stylist.employee_name}
                          </td>
                          <td className="py-3 px-4 text-gray-500 font-medium">
                            {stylist.branch}
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
              <div className="p-8 text-center text-xs text-gray-500 font-medium">
                No transaction data available for {currentMonthName}.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
