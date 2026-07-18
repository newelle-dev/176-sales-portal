import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface SalesCategoryMixCardProps {
  startOfMonth: string;
  startOfNextMonth: string;
}

export default async function SalesCategoryMixCard({
  startOfMonth,
  startOfNextMonth,
}: SalesCategoryMixCardProps) {
  const supabase = createAdminClient();

  let alacarteSum = 0;
  let packageSum = 0;
  let productSum = 0;
  let hasError = false;

  try {
    const { data, error } = await supabase.rpc('get_monthly_sales_mix', {
      start_date: startOfMonth,
      end_date: startOfNextMonth
    });

    if (error) {
      console.error('[SalesCategoryMixCard] Failed to fetch sales mix:', error.message);
      hasError = true;
    } else {
      data?.forEach(row => {
        if (row.category === 'alacarte') alacarteSum = Number(row.sales_sum);
        else if (row.category === 'packages') packageSum = Number(row.sales_sum);
        else if (row.category === 'products') productSum = Number(row.sales_sum);
      });
    }
  } catch (error) {
    console.error('[SalesCategoryMixCard] Failed to fetch sales mix:', error);
    hasError = true;
  }

  const mixTotal = alacarteSum + packageSum + productSum;

  return (
    <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden md:col-span-1">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-bold text-gray-900">Sales Category Mix</CardTitle>
        <CardDescription className="text-xs text-gray-400">
          Revenue distribution (Excl. Deductions)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasError ? (
          <div className="text-xs text-red-500 font-semibold p-4 bg-red-50/50 rounded-xl border border-red-100">
            Error loading sales category mix.
          </div>
        ) : (
          [
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
          })
        )}
      </CardContent>
    </Card>
  );
}
