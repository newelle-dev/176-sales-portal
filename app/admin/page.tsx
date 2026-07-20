import { createAdminClient } from '@/lib/supabase/admin';
import { getCachedSession } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { Calendar, AlertTriangle } from 'lucide-react';
import EditTargetDialog from './EditTargetDialog';
import PopoverDateFilter from '@/components/dashboard/PopoverDateFilter';
import { Suspense } from 'react';
import YearlyTargetCard from './components/YearlyTargetCard';
import MonthlySalesCard from './components/MonthlySalesCard';
import BranchContributionsCard from './components/BranchContributionsCard';
import SalesCategoryMixCard from './components/SalesCategoryMixCard';
import StylistLeaderboardCard from './components/StylistLeaderboardCard';
import {
  YearlyTargetSkeleton,
  MonthlySalesSkeleton,
  BranchContributionsSkeleton,
  SalesCategoryMixSkeleton,
  StylistLeaderboardSkeleton
} from './components/DashboardSkeletons';

// Always fetch fresh data — this is a live analytics dashboard
export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AdminDashboardPage({ searchParams }: PageProps) {
  const { user, profile } = await getCachedSession();

  if (!user || !profile || profile.role !== 'admin') {
    redirect('/login');
  }

  const resolvedParams = await searchParams;

  // Generate list of available months (from Jan 2026 to current calendar month)
  const now = new Date();
  
  // Get date components in Asia/Kuala_Lumpur timezone to handle server-local timezone mismatch (e.g. UTC server)
  const klParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kuala_Lumpur',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now);
  const currentYear = Number(klParts.find(p => p.type === 'year')?.value);
  const currentMonth = Number(klParts.find(p => p.type === 'month')?.value) - 1; // 0-indexed

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

  const currentMonthStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}`;
  
  // Calculate Last Month
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const lastMonthVal = currentMonth === 0 ? 12 : currentMonth;
  const lastMonthStr = `${lastMonthYear}-${lastMonthVal.toString().padStart(2, '0')}`;

  let resolvedMonthType: 'this-month' | 'last-month' | 'range' = 'this-month';
  let selStartMonthStr = currentMonthStr;
  let selEndMonthStr = currentMonthStr;

  const paramMonthType = resolvedParams?.monthType;
  const paramStartMonth = resolvedParams?.startMonth;
  const paramEndMonth = resolvedParams?.endMonth;
  const paramLegacyMonth = resolvedParams?.month;

  if (paramMonthType === 'last-month') {
    resolvedMonthType = 'last-month';
    selStartMonthStr = lastMonthStr;
    selEndMonthStr = lastMonthStr;
  } else if (paramMonthType === 'range') {
    resolvedMonthType = 'range';
    const isValidStart = typeof paramStartMonth === 'string' && /^\d{4}-\d{2}$/.test(paramStartMonth);
    const isValidEnd = typeof paramEndMonth === 'string' && /^\d{4}-\d{2}$/.test(paramEndMonth);
    selStartMonthStr = isValidStart ? paramStartMonth : currentMonthStr;
    selEndMonthStr = isValidEnd ? paramEndMonth : currentMonthStr;
  } else if (typeof paramLegacyMonth === 'string' && /^\d{4}-\d{2}$/.test(paramLegacyMonth)) {
    resolvedMonthType = 'range';
    selStartMonthStr = paramLegacyMonth;
    selEndMonthStr = paramLegacyMonth;
  }

  const [startYearVal, startMonthVal] = selStartMonthStr.split('-').map(Number);
  const [endYear, endMonthVal] = selEndMonthStr.split('-').map(Number);
  const selYear = endYear; // Use the end month's year for target tracking

  const startOfYear = `${selYear}-01-01T00:00:00+08:00`;
  const startOfNextYear = `${selYear + 1}-01-01T00:00:00+08:00`;

  const startOfMonth = `${startYearVal}-${startMonthVal.toString().padStart(2, '0')}-01T00:00:00+08:00`;
  const nextMonthYear = endMonthVal === 12 ? endYear + 1 : endYear;
  const nextMonthVal = endMonthVal === 12 ? 1 : endMonthVal + 1;
  const startOfNextMonth = `${nextMonthYear}-${nextMonthVal.toString().padStart(2, '0')}-01T00:00:00+08:00`;

  const supabase = createAdminClient();

  // Fetch targets (lightweight configuration query)
  const targetRes = await supabase
    .from('targets')
    .select('department, target_amount')
    .eq('year', selYear);

  let hasTargetFetchError = false;
  if (targetRes.error) {
    console.error('[AdminDashboardPage] Failed to fetch annual targets:', targetRes.error.message);
    hasTargetFetchError = true;
  }

  const targetsList = targetRes.data || [];
  const hairTarget = Number(targetsList.find(t => t.department === 'HAIR')?.target_amount || 0);
  const nailsTarget = Number(targetsList.find(t => t.department === 'NAILS')?.target_amount || 0);
  const artistryLashTarget = Number(targetsList.find(t => t.department === 'ARTISTRY_LASH')?.target_amount || 0);
  
  const totalTargetStored = Number(targetsList.find(t => t.department === 'TOTAL')?.target_amount || 0);
  const annualTarget = totalTargetStored > 0 ? totalTargetStored : (hairTarget + nailsTarget + artistryLashTarget);

  // Time calculations
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
    }).formatToParts(now);
    const klYear = Number(klPartsDay.find(p => p.type === 'year')?.value);
    const klMonth = Number(klPartsDay.find(p => p.type === 'month')?.value) - 1;
    const klDay = Number(klPartsDay.find(p => p.type === 'day')?.value);
    
    const today = new Date(klYear, klMonth, klDay);
    const diffTime = today.getTime() - startOfYearDate.getTime();
    daysElapsed = Math.max(1, Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1);
  }

  const timePassedPercent = isFutureYear ? 0 : (daysElapsed / totalDays) * 100;

  const getMonthLabel = (monthStr: string) => {
    const [y, m] = monthStr.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleString('en-US', { month: 'long', year: 'numeric' });
  };

  let dateRangeLabel = '';
  if (resolvedMonthType === 'this-month') {
    dateRangeLabel = getMonthLabel(currentMonthStr);
  } else if (resolvedMonthType === 'last-month') {
    dateRangeLabel = getMonthLabel(lastMonthStr);
  } else {
    if (selStartMonthStr === selEndMonthStr) {
      dateRangeLabel = getMonthLabel(selStartMonthStr);
    } else {
      dateRangeLabel = `${getMonthLabel(selStartMonthStr)} - ${getMonthLabel(selEndMonthStr)}`;
    }
  }

  // Fallback for monthly cards that expect string labels
  const currentMonthName = dateRangeLabel;

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
          <PopoverDateFilter
            months={availableMonths}
            currentMonthType={resolvedMonthType}
            startMonth={selStartMonthStr}
            endMonth={selEndMonthStr}
            basePath="/admin"
          />
          <EditTargetDialog
            key={`${selYear}-${hairTarget}-${nailsTarget}-${artistryLashTarget}`}
            year={selYear}
            initialHair={hairTarget}
            initialNails={nailsTarget}
            initialArtistryLash={artistryLashTarget}
          />
        </div>
      </div>

      {/* Fetch Error Warning Banner for Targets */}
      {hasTargetFetchError && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-xs flex flex-col gap-2 shadow-sm font-medium">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4.5 h-4.5 text-red-650 shrink-0" />
            <span>We encountered an issue fetching yearly target configurations. Targets and pace metrics might be inaccurate or incomplete.</span>
          </div>
        </div>
      )}

      {/* Yearly Target Progress Card */}
      <Suspense fallback={<YearlyTargetSkeleton />}>
        <YearlyTargetCard
          selYear={selYear}
          annualTarget={annualTarget}
          hairTarget={hairTarget}
          nailsTarget={nailsTarget}
          artistryLashTarget={artistryLashTarget}
          timePassedPercent={timePassedPercent}
          isCurrentYear={isCurrentYear}
          isFutureYear={isFutureYear}
          daysElapsed={daysElapsed}
          totalDays={totalDays}
          startOfYear={startOfYear}
          startOfNextYear={startOfNextYear}
        />
      </Suspense>

      {/* Monthly Sales & Branch Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Suspense fallback={<MonthlySalesSkeleton />}>
          <MonthlySalesCard
            currentMonthName={currentMonthName}
            annualTarget={annualTarget}
            startOfMonth={startOfMonth}
            startOfNextMonth={startOfNextMonth}
          />
        </Suspense>

        <Suspense fallback={<BranchContributionsSkeleton />}>
          <BranchContributionsCard
            currentMonthName={currentMonthName}
            startOfMonth={startOfMonth}
            startOfNextMonth={startOfNextMonth}
          />
        </Suspense>
      </div>

      {/* Category Mix and Stylist Leaderboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Suspense fallback={<SalesCategoryMixSkeleton />}>
          <SalesCategoryMixCard
            startOfMonth={startOfMonth}
            startOfNextMonth={startOfNextMonth}
          />
        </Suspense>

        <Suspense fallback={<StylistLeaderboardSkeleton />}>
          <StylistLeaderboardCard
            currentMonthName={currentMonthName}
            startOfMonth={startOfMonth}
            startOfNextMonth={startOfNextMonth}
          />
        </Suspense>
      </div>
    </main>
  );
}
