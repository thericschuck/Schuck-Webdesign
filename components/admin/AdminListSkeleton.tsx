export function AdminListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 bg-gray-200 rounded-lg" />
          <div className="h-4 w-56 bg-gray-100 rounded mt-2" />
        </div>
        <div className="h-9 w-32 bg-gray-200 rounded-xl" />
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-7 w-20 bg-gray-100 rounded-full" />
        ))}
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {[...Array(rows)].map((_, i) => (
          <div key={i} className="px-6 py-4 flex items-center gap-3 border-b border-gray-50 last:border-0">
            <div className="w-8 h-8 bg-gray-100 rounded-lg shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-1/3 bg-gray-100 rounded" />
              <div className="h-3 w-1/5 bg-gray-50 rounded" />
            </div>
            <div className="h-5 w-16 bg-gray-100 rounded-full shrink-0" />
          </div>
        ))}
      </div>
    </div>
  )
}
