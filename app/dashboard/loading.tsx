/**
 * Dashboard loading skeleton — shown by Next.js App Router while the
 * server component fetches transaction data (e.g. during month changes).
 */
export default function DashboardLoading() {
  return (
    <main className="max-w-md md:max-w-4xl w-full mx-auto px-4 py-6 md:py-10 space-y-6 sm:space-y-8 animate-pulse">
      {/* Welcome Banner skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-gray-150 p-4 rounded-2xl shadow-sm">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-gray-200 rounded-lg" />
          <div className="h-4 w-36 bg-gray-100 rounded-lg" />
        </div>
        <div className="h-9 w-40 bg-gray-100 rounded-xl" />
      </div>

      {/* Main KPI Card skeleton */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 sm:p-6 flex items-center justify-between gap-4 shadow-sm">
        <div className="space-y-2">
          <div className="h-3 w-28 bg-gray-100 rounded" />
          <div className="h-8 w-40 bg-gray-200 rounded-lg" />
          <div className="h-3 w-32 bg-gray-100 rounded" />
        </div>
        <div className="w-12 h-12 rounded-xl bg-gray-100" />
      </div>

      {/* Category Cards skeleton */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-3.5 sm:p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="h-2.5 w-16 bg-gray-100 rounded" />
              <div className="w-4 h-4 bg-gray-100 rounded" />
            </div>
            <div className="space-y-1.5">
              <div className="h-5 w-24 bg-gray-200 rounded-lg" />
              <div className="h-2.5 w-14 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Transactions skeleton */}
      <div className="space-y-4">
        <div className="space-y-1">
          <div className="h-5 w-40 bg-gray-200 rounded-lg" />
          <div className="h-3 w-64 bg-gray-100 rounded" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 h-16 shadow-sm" />
          ))}
        </div>
      </div>
    </main>
  );
}
