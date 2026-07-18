import { createAdminClient } from '@/lib/supabase/admin';
import { createClient, getCachedSession } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  TrendingUp,
  Target,
  DollarSign,
  Users,
  MapPin,
  Calendar,
  Sparkles,
  Award,
  CircleCheck,
  TrendingDown
} from 'lucide-react';
import EditTargetDialog from './EditTargetDialog';
import AdminMonthSelector from './AdminMonthSelector';
import { getTransactionCategory } from '@/lib/transaction-utils';

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
  const [targetRes, ytdTxRes, monthTxRes] = await Promise.all([
    supabase
      .from('targets')
      .select('target_amount')
      .eq('year', selYear)
      .maybeSingle(),
    supabase
      .from('transactions')
      .select('amount')
      .gte('transaction_date', startOfYear)
      .lt('transaction_date', startOfNextYear)
      .gt('amount', 0),
    supabase
      .from('transactions')
      .select('amount, branch, type, employee_name, profile_id')
      .gte('transaction_date', startOfMonth)
      .lt('transaction_date', startOfNextMonth)
      .gt('amount', 0)
      .limit(5000)
  ]);

  if (targetRes.error) {
    console.error('[AdminDashboardPage] Failed to fetch annual target:', targetRes.error.message);
  }
  if (ytdTxRes.error) {
    console.error('[AdminDashboardPage] Failed to fetch YTD transactions:', ytdTxRes.error.message);
  }
  if (monthTxRes.error) {
    console.error('[AdminDashboardPage] Failed to fetch monthly transactions:', monthTxRes.error.message);
  }

  const annualTarget = targetRes.data?.target_amount ? Number(targetRes.data.target_amount) : 0;
  const ytdSales = ytdTxRes.data?.reduce((acc, tx) => acc + Number(tx.amount || 0), 0) || 0;
  const monthTxRaw = (monthTxRes.data || []) as unknown as MonthTxRow[];

  // 1. Monthly stats — amount > 0 already filtered at DB level, so monthTxRaw
  //    contains only positive-amount (sales) rows.
  const monthSales = monthTxRaw.reduce((acc, tx) => acc + Number(tx.amount), 0);
  const monthTxCount = monthTxRaw.length;

  // 2. Branch Breakdown
  const branchMap = {
    Bangsar: 0,
    SS2: 0,
    KLGCC: 0
  };
  monthTxRaw.forEach((tx) => {
    const amt = Number(tx.amount);
    const br = tx.branch as keyof typeof branchMap;
    if (br && branchMap[br] !== undefined) {
      branchMap[br] += amt;
    } else {
      branchMap['Bangsar'] += amt; // fallback for null/unknown branch
    }
  });

  const branchTotal = branchMap.Bangsar + branchMap.SS2 + branchMap.KLGCC;

  // 3. Sales Mix
  let alacarteSum = 0;
  let packageSum = 0;
  let productSum = 0;

  monthTxRaw.forEach((tx) => {
    const amt = Number(tx.amount);
    const cat = getTransactionCategory({ type: tx.type, amount: amt });
    if (cat === 'alacarte') alacarteSum += amt;
    else if (cat === 'packages') packageSum += amt;
    else if (cat === 'products') productSum += amt;
  });

  const mixTotal = alacarteSum + packageSum + productSum;

  // 4. Stylist Leaderboard
  const stylistMap = new Map<string, { name: string; amount: number; count: number; branch: string }>();
  monthTxRaw.forEach((tx) => {
    const name = tx.employee_name;
    const amt = Number(tx.amount);
    const br = tx.branch || 'Bangsar';

    const existing = stylistMap.get(name);
    if (existing) {
      existing.amount += amt;
      existing.count += 1;
    } else {
      stylistMap.set(name, { name, amount: amt, count: 1, branch: br });
    }
  });

  const leaderboard = Array.from(stylistMap.values())
    .sort((a, b) => b.amount - a.amount);

  // 5. Progress calculations
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
          <EditTargetDialog year={selYear} initialTarget={annualTarget} />
        </div>
      </div>

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
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">YTD Nett Sales</span>
              <div className="text-3xl font-extrabold tracking-tight text-gray-900">
                RM {ytdSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="space-y-1 sm:text-right">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Yearly Target</span>
              <div className="text-2xl font-extrabold text-gray-700">
                {annualTarget > 0 ? `RM ${annualTarget.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : 'No Target Configured'}
              </div>
            </div>
          </div>

          {annualTarget > 0 ? (
            <div className="space-y-1.5">
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                {/* Time elapsed marker (dashed indicator overlay) */}
                {isCurrentYear && (
                  <div 
                    className="absolute top-0 bottom-0 border-r-2 border-dashed border-gray-400/80 z-10"
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
          ) : (
            <div className="rounded-xl bg-gray-50 border border-gray-150 p-4 text-center text-xs text-gray-500 font-medium">
              Click &quot;Configure Target&quot; above to set an annual target and unlock progress tracking.
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
                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
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
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-550 ${
                        branchName === 'Bangsar' ? 'bg-slate-800' : branchName === 'SS2' ? 'bg-slate-500' : 'bg-slate-350'
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
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
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
                        <tr key={stylist.name} className="hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4 text-center font-bold text-gray-400">
                            {isTopThree ? (
                              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                                index === 0 ? 'bg-amber-100 text-amber-800' :
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
                            {stylist.name}
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
