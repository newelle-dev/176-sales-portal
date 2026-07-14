import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Scissors, Package, ShoppingBag, Percent, Calendar, Sparkles, TrendingUp } from 'lucide-react';
import TransactionsList from './TransactionsList';
import MonthSelector from './MonthSelector';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch the stylist's profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

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

  // Parse month query parameter (e.g. "2026-07")
  const resolvedParams = await searchParams;
  const defaultMonthStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  const selectedMonthStr =
    typeof resolvedParams?.month === 'string' && /^\d{4}-\d{2}$/.test(resolvedParams.month)
      ? resolvedParams.month
      : defaultMonthStr;

  const [selYear, selMonth] = selectedMonthStr.split('-').map(Number);

  // Date bounds for the selected month (timezone aware ISO boundaries)
  const startOfMonth = new Date(selYear, selMonth - 1, 1).toISOString();
  const startOfNextMonth = new Date(selYear, selMonth, 1).toISOString();

  // Fetch transactions for the selected month
  const { data: transactions } = await supabase
    .from('transactions')
    .select('*')
    .eq('profile_id', user.id)
    .gte('transaction_date', startOfMonth)
    .lt('transaction_date', startOfNextMonth)
    .order('transaction_date', { ascending: false });

  const txList = transactions || [];

  // Aggregations
  let alacarteSum = 0;
  let packageSum = 0;
  let productSum = 0;
  let deductionSum = 0;

  let alacarteCount = 0;
  let packageCount = 0;
  let productCount = 0;
  let deductionCount = 0;

  txList.forEach((tx) => {
    const amt = Number(tx.amount) || 0;
    const ded = Number(tx.deduction) || 0;

    deductionSum += ded;
    if (ded > 0) {
      deductionCount++;
    }

    if (tx.type === 'S') {
      alacarteSum += amt;
      if (amt !== 0) alacarteCount++;
    } else if (tx.type === 'G' || tx.type === 'C') {
      packageSum += amt;
      if (amt !== 0) packageCount++;
    } else if (tx.type === 'P') {
      productSum += amt;
      if (amt !== 0) productCount++;
    }
  });

  // Deduction sales are also sales, not literally deducted from the total sales (per feedback)
  const totalSales = alacarteSum + packageSum + productSum + deductionSum;

  const currentMonthName = new Date(selYear, selMonth - 1, 1).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  });

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
          <MonthSelector months={availableMonths} defaultValue={selectedMonthStr} />
        </div>
      </div>

      {/* Main KPI Card - Total Sales */}
      <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden">
        <CardContent className="p-5 sm:p-6 flex items-center justify-between gap-4">
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-gray-450 uppercase tracking-wider block select-none">
              Total Monthly Sales
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

      {/* Grid of Category Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Ala Carte Card */}
        <Card className="border-gray-200 bg-white shadow-sm rounded-xl overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-3.5 sm:p-4 pb-0 flex flex-row items-center justify-between space-y-0 select-none">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Ala Carte</span>
            <Scissors className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent className="p-3.5 sm:p-4 pt-2.5 sm:pt-3">
            <div className="text-base sm:text-lg font-bold text-gray-900 truncate">
              RM {alacarteSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
              {alacarteCount} services
            </p>
          </CardContent>
        </Card>

        {/* Packages Card */}
        <Card className="border-gray-200 bg-white shadow-sm rounded-xl overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-3.5 sm:p-4 pb-0 flex flex-row items-center justify-between space-y-0 select-none">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Packages</span>
            <Package className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent className="p-3.5 sm:p-4 pt-2.5 sm:pt-3">
            <div className="text-base sm:text-lg font-bold text-gray-900 truncate">
              RM {packageSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
              {packageCount} items
            </p>
          </CardContent>
        </Card>

        {/* Product Card */}
        <Card className="border-gray-200 bg-white shadow-sm rounded-xl overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-3.5 sm:p-4 pb-0 flex flex-row items-center justify-between space-y-0 select-none">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Products</span>
            <ShoppingBag className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent className="p-3.5 sm:p-4 pt-2.5 sm:pt-3">
            <div className="text-base sm:text-lg font-bold text-gray-900 truncate">
              RM {productSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
              {productCount} retail items
            </p>
          </CardContent>
        </Card>

        {/* Deduction Sales Card */}
        <Card className="border-gray-200 bg-white shadow-sm rounded-xl overflow-hidden flex flex-col justify-between">
          <CardHeader className="p-3.5 sm:p-4 pb-0 flex flex-row items-center justify-between space-y-0 select-none">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Deductions</span>
            <Percent className="w-4 h-4 text-gray-400" />
          </CardHeader>
          <CardContent className="p-3.5 sm:p-4 pt-2.5 sm:pt-3">
            <div className="text-base sm:text-lg font-bold text-gray-900 truncate">
              RM {deductionSum.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-[10px] text-gray-400 font-medium mt-0.5">
              {deductionCount} items
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History Section */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base sm:text-lg font-bold text-gray-900">Recent Transactions</h2>
          <p className="text-xs text-gray-500">List of all your transaction and deduction records for this month.</p>
        </div>
        <TransactionsList transactions={txList} />
      </div>
    </main>
  );
}
