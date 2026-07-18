import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin } from 'lucide-react';

interface BranchContributionsCardProps {
  currentMonthName: string;
  startOfMonth: string;
  startOfNextMonth: string;
}

export default async function BranchContributionsCard({
  currentMonthName,
  startOfMonth,
  startOfNextMonth,
}: BranchContributionsCardProps) {
  const supabase = createAdminClient();

  const branchMap = {
    Bangsar: 0,
    SS2: 0,
    KLGCC: 0
  };
  let hasError = false;

  try {
    const { data, error } = await supabase.rpc('get_monthly_branch_sales', {
      start_date: startOfMonth,
      end_date: startOfNextMonth
    });

    if (error) {
      console.error('[BranchContributionsCard] Failed to fetch branch sales:', error.message);
      hasError = true;
    } else {
      data?.forEach(row => {
        if (row.branch in branchMap) {
          branchMap[row.branch as keyof typeof branchMap] = Number(row.sales_sum);
        }
      });
    }
  } catch (error) {
    console.error('[BranchContributionsCard] Failed to fetch branch sales:', error);
    hasError = true;
  }

  const branchTotal = branchMap.Bangsar + branchMap.SS2 + branchMap.KLGCC;

  return (
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
        {hasError ? (
          <div className="text-xs text-red-500 font-semibold p-4 bg-red-50/50 rounded-xl border border-red-100">
            Error loading branch contributions.
          </div>
        ) : (
          ['Bangsar', 'SS2', 'KLGCC'].map((branchName) => {
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
                    className={`h-full transition-all duration-550 ${
                      branchName === 'Bangsar' ? 'bg-slate-800' : branchName === 'SS2' ? 'bg-slate-500' : 'bg-slate-350'
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
