import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Target, TrendingUp, TrendingDown } from 'lucide-react';

interface YearlyTargetCardProps {
  selYear: number;
  annualTarget: number;
  hairTarget: number;
  nailsTarget: number;
  artistryLashTarget: number;
  timePassedPercent: number;
  isCurrentYear: boolean;
  isFutureYear: boolean;
  daysElapsed: number;
  totalDays: number;
  startOfYear: string;
  startOfNextYear: string;
}

export default async function YearlyTargetCard({
  selYear,
  annualTarget,
  hairTarget,
  nailsTarget,
  artistryLashTarget,
  timePassedPercent,
  isCurrentYear,
  isFutureYear,
  daysElapsed,
  totalDays,
  startOfYear,
  startOfNextYear,
}: YearlyTargetCardProps) {
  const supabase = createAdminClient();

  let ytdSales = 0;
  let ytdDeptSalesList: { department: string; sales_sum: number }[] = [];
  let hasError = false;

  try {
    const [ytdSalesRes, ytdDeptSalesRes] = await Promise.all([
      supabase.rpc('get_sales_sum', {
        start_date: startOfYear,
        end_date: startOfNextYear
      }),
      supabase.rpc('get_sales_by_department', {
        start_date: startOfYear,
        end_date: startOfNextYear
      })
    ]);

    if (ytdSalesRes.error) {
      console.error('[YearlyTargetCard] Failed to fetch YTD sales sum:', ytdSalesRes.error.message);
      hasError = true;
    } else {
      ytdSales = Number(ytdSalesRes.data || 0);
    }

    if (ytdDeptSalesRes.error) {
      console.error('[YearlyTargetCard] Failed to fetch YTD department sales sum:', ytdDeptSalesRes.error.message);
      hasError = true;
    } else {
      ytdDeptSalesList = ytdDeptSalesRes.data || [];
    }
  } catch (error) {
    console.error('[YearlyTargetCard] Failed to fetch target card data:', error);
    hasError = true;
  }

  const hairYTDSales = Number(ytdDeptSalesList.find(d => d.department === 'HAIR')?.sales_sum || 0);
  const nailsYTDSales = Number(ytdDeptSalesList.find(d => d.department === 'NAILS')?.sales_sum || 0);
  const artistryLashYTDSales = Number(ytdDeptSalesList.find(d => d.department === 'ARTISTRY_LASH')?.sales_sum || 0);

  const ytdProgressPercent = annualTarget > 0 ? (ytdSales / annualTarget) * 100 : 0;
  const paceDifference = ytdProgressPercent - timePassedPercent;

  return (
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
          {annualTarget > 0 && isCurrentYear && !hasError && (
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
      <CardContent className="space-y-6">
        {hasError ? (
          <div className="text-xs text-red-500 font-semibold p-4 bg-red-50/50 rounded-xl border border-red-100">
            Error loading target metrics.
          </div>
        ) : annualTarget > 0 ? (
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
                  <span className="text-gray-555">{(hairTarget > 0 ? (hairYTDSales / hairTarget * 100) : 0).toFixed(1)}%</span>
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
                    className="h-full bg-slate-800 transition-all duration-550"
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
                    className="h-full bg-slate-800 transition-all duration-550"
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
                    className="h-full bg-slate-800 transition-all duration-550"
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
  );
}
