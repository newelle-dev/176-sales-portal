import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react';
import StylistLeaderboardClient from './StylistLeaderboardClient';

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

  let leaderboardData = [] as any[];
  let hasError = false;

  try {
    console.log('[StylistLeaderboardCard] Fetching with:', { startOfMonth, startOfNextMonth });
    const { data, error } = await supabase.rpc('get_monthly_stylist_leaderboard', {
      start_date: startOfMonth,
      end_date: startOfNextMonth
    });

    console.log('[StylistLeaderboardCard] Fetch result:', { dataLength: data?.length, error });

    if (error) {
      console.error('[StylistLeaderboardCard] Failed to fetch stylist leaderboard:', error.message);
      hasError = true;
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
  } catch (error) {
    console.error('[StylistLeaderboardCard] Failed to fetch stylist leaderboard:', error);
    hasError = true;
  }

  return (
    <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden md:col-span-2 flex flex-col">
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
      
      {hasError ? (
        <CardContent className="p-0">
          <div className="text-xs text-red-500 font-semibold p-6 bg-red-50/50 rounded-xl border border-red-100 m-4">
            Error loading stylist performance leaderboard.
          </div>
        </CardContent>
      ) : (
        <StylistLeaderboardClient currentMonthName={currentMonthName} data={leaderboardData} />
      )}
    </Card>
  );
}
