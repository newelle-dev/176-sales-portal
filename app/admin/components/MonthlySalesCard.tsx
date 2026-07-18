import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';

interface MonthlySalesCardProps {
  currentMonthName: string;
  annualTarget: number;
  startOfMonth: string;
  startOfNextMonth: string;
}

export default async function MonthlySalesCard({
  currentMonthName,
  annualTarget,
  startOfMonth,
  startOfNextMonth,
}: MonthlySalesCardProps) {
  const supabase = createAdminClient();

  let monthSales = 0;
  let monthTxCount = 0;
  let hasError = false;

  try {
    const { data, error } = await supabase.rpc('get_monthly_sales_summary', {
      start_date: startOfMonth,
      end_date: startOfNextMonth
    });

    if (error) {
      console.error('[MonthlySalesCard] Failed to fetch monthly sales summary:', error.message);
      hasError = true;
    } else {
      monthSales = Number(data?.[0]?.sales_sum || 0);
      monthTxCount = Number(data?.[0]?.tx_count || 0);
    }
  } catch (error) {
    console.error('[MonthlySalesCard] Failed to fetch monthly sales summary:', error);
    hasError = true;
  }

  const monthlyMilestone = annualTarget / 12;
  const monthlyProgressPercent = monthlyMilestone > 0 ? (monthSales / monthlyMilestone) * 100 : 0;

  return (
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
        {hasError ? (
          <div className="text-xs text-red-500 font-semibold p-4 bg-red-50/50 rounded-xl border border-red-100">
            Error loading monthly sales metrics.
          </div>
        ) : (
          <>
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
          </>
        )}
      </CardContent>
    </Card>
  );
}
