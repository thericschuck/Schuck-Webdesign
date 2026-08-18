function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="h-4 w-32 bg-gray-200 rounded mb-4" />
      <div className="space-y-2.5">
        {[...Array(lines)].map((_, i) => (
          <div key={i} className="h-3 bg-gray-100 rounded" style={{ width: `${85 - i * 12}%` }} />
        ))}
      </div>
    </div>
  )
}

export default function LeadDetailLoading() {
  return (
    <div className="flex flex-col gap-6 animate-pulse">
      {/* Breadcrumb */}
      <div className="h-3.5 w-40 bg-gray-100 rounded" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-3 w-10 bg-gray-100 rounded" />
          <div className="h-7 w-56 bg-gray-200 rounded-lg" />
        </div>
        <div className="h-7 w-24 bg-gray-100 rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="md:col-span-1 flex flex-col gap-4">
          <CardSkeleton lines={5} />
          <CardSkeleton lines={2} />
        </div>
        <div className="md:col-span-2 flex flex-col gap-4">
          <CardSkeleton lines={2} />
          <CardSkeleton lines={4} />
          <CardSkeleton lines={3} />
        </div>
      </div>
    </div>
  )
}
