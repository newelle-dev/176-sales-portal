import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function YearlyTargetSkeleton() {
  return (
    <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden animate-pulse">
      <CardHeader className="pb-4 space-y-2">
        <div className="h-5 bg-gray-100 rounded w-1/3" />
        <div className="h-3 bg-gray-50 rounded w-1/2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 pb-5 border-b border-gray-100">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="h-3 bg-gray-100 rounded w-1/4" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </div>
            <div className="space-y-1 sm:text-right flex flex-col sm:items-end">
              <div className="h-3 bg-gray-100 rounded w-1/4" />
              <div className="h-6 bg-gray-250 rounded w-1/3" />
            </div>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <div className="h-4 bg-gray-100 rounded w-1/3" />
                <div className="h-4 bg-gray-100 rounded w-1/6" />
              </div>
              <div className="h-2 bg-gray-100 rounded-full w-full" />
              <div className="flex justify-between">
                <div className="h-3 bg-gray-50 rounded w-1/3" />
                <div className="h-3 bg-gray-50 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function MonthlySalesSkeleton() {
  return (
    <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden flex flex-col justify-between animate-pulse">
      <CardHeader className="pb-4 space-y-2">
        <div className="h-5 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-50 rounded w-2/3" />
      </CardHeader>
      <CardContent className="space-y-6 flex-1 flex flex-col justify-between">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded w-1/3" />
            <div className="h-6 bg-gray-200 rounded w-3/4" />
            <div className="h-3 bg-gray-50 rounded w-1/2" />
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-gray-100 rounded w-1/3" />
            <div className="h-5 bg-gray-200 rounded w-2/3" />
            <div className="h-3 bg-gray-50 rounded w-1/2" />
          </div>
        </div>
        <div className="h-2 bg-gray-100 rounded-full w-full pt-2" />
      </CardContent>
    </Card>
  );
}

export function BranchContributionsSkeleton() {
  return (
    <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden animate-pulse">
      <CardHeader className="pb-4 space-y-2">
        <div className="h-5 bg-gray-100 rounded w-1/2" />
        <div className="h-3 bg-gray-50 rounded w-2/3" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1.5">
            <div className="flex justify-between">
              <div className="h-4 bg-gray-100 rounded w-1/4" />
              <div className="h-4 bg-gray-150 rounded w-1/3" />
            </div>
            <div className="h-2 bg-gray-100 rounded-full w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SalesCategoryMixSkeleton() {
  return (
    <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden md:col-span-1 animate-pulse">
      <CardHeader className="pb-4 space-y-2">
        <div className="h-5 bg-gray-100 rounded w-2/3" />
        <div className="h-3 bg-gray-50 rounded w-3/4" />
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="flex justify-between">
              <div className="h-4 bg-gray-100 rounded w-1/3" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
            </div>
            <div className="h-3 bg-gray-50 rounded w-1/4" />
            <div className="h-1.5 bg-gray-100 rounded-full w-full" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function StylistLeaderboardSkeleton() {
  return (
    <Card className="border-gray-200 bg-white shadow-sm rounded-2xl overflow-hidden md:col-span-2 animate-pulse">
      <CardHeader className="pb-4 space-y-2">
        <div className="h-5 bg-gray-100 rounded w-1/3" />
        <div className="h-3 bg-gray-50 rounded w-1/2" />
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-8 bg-gray-50 border-b border-gray-100 w-full" />
        <div className="p-4 space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50">
              <div className="h-4 bg-gray-100 rounded w-8" />
              <div className="h-4 bg-gray-200 rounded w-1/3" />
              <div className="h-4 bg-gray-100 rounded w-16" />
              <div className="h-4 bg-gray-100 rounded w-8" />
              <div className="h-4 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
