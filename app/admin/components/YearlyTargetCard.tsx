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

  const hairPct = hairTarget > 0 ? (hairYTDSales / hairTarget * 100) : 0;
  const hairPaceDiff = hairPct - timePassedPercent;

  const nailsPct = nailsTarget > 0 ? (nailsYTDSales / nailsTarget * 100) : 0;
  const nailsPaceDiff = nailsPct - timePassedPercent;

  const artistryLashPct = artistryLashTarget > 0 ? (artistryLashYTDSales / artistryLashTarget * 100) : 0;
  const artistryLashPaceDiff = artistryLashPct - timePassedPercent;

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
                  <div className="text-2xl sm:text-3xl font-extrabold tracking-tight text-gray-900">
                    RM {ytdSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="space-y-1 sm:text-right">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Overall Salon Target</span>
                  <div className="text-xl sm:text-2xl font-extrabold text-gray-700">
                    RM {annualTarget.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </div>
                  {annualTarget > 0 && (
                    <span className="text-[10px] sm:text-xs font-semibold text-gray-400 block select-none">
                      (RM {(annualTarget / 312).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / day)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                {/* Visual Legend */}
                {isCurrentYear && (
                  <div className="flex items-center justify-end gap-3 text-[10px] text-gray-400 font-bold select-none pb-0.5">
                    <div className="flex items-center gap-1">
                      <div className="w-2.5 h-2 bg-black rounded-sm" />
                      <span>YTD Sales</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-0.5 h-2.5 bg-slate-400 animate-pulse" />
                      <span>Pace Target ({timePassedPercent.toFixed(1)}%)</span>
                    </div>
                  </div>
                )}

                <div className="relative py-1">
                  {/* Progress bar container */}
                  <div
                    role="progressbar"
                    aria-valuenow={Math.min(100, ytdProgressPercent)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Yearly Target Progress"
                    className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-black transition-all duration-550"
                      style={{ width: `${Math.min(100, ytdProgressPercent)}%` }}
                    />
                  </div>
                  {/* Time elapsed marker (Today indicator) extending above and below */}
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
                  <span>{ytdProgressPercent.toFixed(1)}% Achieved</span>
                  {isCurrentYear ? (
                    <span>Day {daysElapsed} of {totalDays}</span>
                  ) : isFutureYear ? (
                    <span>Year Not Started</span>
                  ) : (
                    <span>Year Ended</span>
                  )}
                </div>
              </div>
            </div>

            {/* Department Breakdown Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
              {/* HAIR Progress Card */}
              <div className="bg-gray-50/35 border border-gray-100 rounded-2xl p-4 md:p-5 space-y-4 hover:bg-gray-50/70 hover:border-gray-200 transition-all duration-300 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">Hair (HS)</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900">{hairPct.toFixed(1)}%</span>
                      {isCurrentYear && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          hairPaceDiff >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-650'
                        }`}>
                          {hairPaceDiff >= 0 ? `+${hairPaceDiff.toFixed(1)}%` : `${hairPaceDiff.toFixed(1)}%`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">YTD Nett Sales</span>
                    <div className="text-xl font-extrabold text-gray-900 tracking-tight">
                      RM {hairYTDSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div
                    role="progressbar"
                    aria-valuenow={Math.min(100, hairPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Hair department YTD target progress"
                    className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-slate-900 transition-all duration-550 rounded-full"
                      style={{ width: `${Math.min(100, hairPct)}%` }}
                    />
                  </div>
                  
                  <div className="border-t border-gray-100/70 pt-2.5 flex justify-between items-center text-[10px] text-gray-400 font-bold tracking-wider select-none">
                    <div>
                      <span className="block text-[9px] text-gray-400">ANNUAL TARGET</span>
                      <span className="text-gray-700 font-extrabold text-xs">RM {hairTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] text-gray-400">DAILY TARGET</span>
                      <span className="text-gray-700 font-extrabold text-xs">RM {(hairTarget / 312).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* NAILS Progress Card */}
              <div className="bg-gray-50/35 border border-gray-100 rounded-2xl p-4 md:p-5 space-y-4 hover:bg-gray-50/70 hover:border-gray-200 transition-all duration-300 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">Nails</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900">{nailsPct.toFixed(1)}%</span>
                      {isCurrentYear && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          nailsPaceDiff >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-650'
                        }`}>
                          {nailsPaceDiff >= 0 ? `+${nailsPaceDiff.toFixed(1)}%` : `${nailsPaceDiff.toFixed(1)}%`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">YTD Nett Sales</span>
                    <div className="text-xl font-extrabold text-gray-900 tracking-tight">
                      RM {nailsYTDSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div
                    role="progressbar"
                    aria-valuenow={Math.min(100, nailsPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Nails department YTD target progress"
                    className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-slate-900 transition-all duration-550 rounded-full"
                      style={{ width: `${Math.min(100, nailsPct)}%` }}
                    />
                  </div>
                  
                  <div className="border-t border-gray-100/70 pt-2.5 flex justify-between items-center text-[10px] text-gray-400 font-bold tracking-wider select-none">
                    <div>
                      <span className="block text-[9px] text-gray-400">ANNUAL TARGET</span>
                      <span className="text-gray-700 font-extrabold text-xs">RM {nailsTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] text-gray-400">DAILY TARGET</span>
                      <span className="text-gray-700 font-extrabold text-xs">RM {(nailsTarget / 312).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* ARTISTRY & LASH Progress Card */}
              <div className="bg-gray-50/35 border border-gray-100 rounded-2xl p-4 md:p-5 space-y-4 hover:bg-gray-50/70 hover:border-gray-200 transition-all duration-300 shadow-[0_1px_2px_rgba(0,0,0,0.01)] flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">Artistry & Lash</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-gray-900">{artistryLashPct.toFixed(1)}%</span>
                      {isCurrentYear && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                          artistryLashPaceDiff >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-650'
                        }`}>
                          {artistryLashPaceDiff >= 0 ? `+${artistryLashPaceDiff.toFixed(1)}%` : `${artistryLashPaceDiff.toFixed(1)}%`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">YTD Nett Sales</span>
                    <div className="text-xl font-extrabold text-gray-900 tracking-tight">
                      RM {artistryLashYTDSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-1">
                  <div
                    role="progressbar"
                    aria-valuenow={Math.min(100, artistryLashPct)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Artistry and Lash department YTD target progress"
                    className="w-full h-2 bg-gray-100 rounded-full overflow-hidden"
                  >
                    <div
                      className="h-full bg-slate-900 transition-all duration-550 rounded-full"
                      style={{ width: `${Math.min(100, artistryLashPct)}%` }}
                    />
                  </div>
                  
                  <div className="border-t border-gray-100/70 pt-2.5 flex justify-between items-center text-[10px] text-gray-400 font-bold tracking-wider select-none">
                    <div>
                      <span className="block text-[9px] text-gray-400">ANNUAL TARGET</span>
                      <span className="text-gray-700 font-extrabold text-xs">RM {artistryLashTarget.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-[9px] text-gray-400">DAILY TARGET</span>
                      <span className="text-gray-700 font-extrabold text-xs">RM {(artistryLashTarget / 312).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                  </div>
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
