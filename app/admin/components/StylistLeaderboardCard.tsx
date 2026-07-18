import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react';

interface StylistLeaderboardCardProps {
  currentMonthName: string;
  startOfMonth: string;
  startOfNextMonth: string;
}

export default async function StylistLeaderboardCard({
  currentMonthName,
  startOfMonth,
  startOfNextMonth,
}: StylistLeaderboardCardProps) {
  const supabase = createAdminClient();

  let leaderboard: {
    employee_name: string;
    amount: number;
    count: number;
    branch: string;
  }[] = [];
  let hasError = false;

  try {
    const { data, error } = await supabase.rpc('get_monthly_stylist_leaderboard', {
      start_date: startOfMonth,
      end_date: startOfNextMonth
    });

    if (error) {
      console.error('[StylistLeaderboardCard] Failed to fetch stylist leaderboard:', error.message);
      hasError = true;
    } else {
      leaderboard = (data || []).map(row => ({
        employee_name: row.employee_name,
        amount: Number(row.amount),
        count: Number(row.count),
        branch: row.branch
      }));
    }
  } catch (error) {
    console.error('[StylistLeaderboardCard] Failed to fetch stylist leaderboard:', error);
    hasError = true;
  }

  return (
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
        {hasError ? (
          <div className="text-xs text-red-500 font-semibold p-6 bg-red-50/50 rounded-xl border border-red-100 m-4">
            Error loading stylist performance leaderboard.
          </div>
        ) : leaderboard.length > 0 ? (
          <div 
            className="max-h-[350px] overflow-y-auto scrollbar-thin focus:outline-none focus:ring-1 focus:ring-black rounded-lg"
            tabIndex={0}
            role="region"
            aria-label="Stylist performance leaderboard table"
          >
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
                          <span 
                            className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                              index === 0 ? 'bg-amber-100 text-amber-800' :
                              index === 1 ? 'bg-slate-200 text-slate-800' :
                              'bg-orange-100 text-orange-850'
                            }`}
                            aria-label={`Rank ${index + 1} (${index === 0 ? 'Gold' : index === 1 ? 'Silver' : 'Bronze'} Medal)`}
                          >
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
  );
}
