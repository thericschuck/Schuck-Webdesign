export default function ProjectLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div>
        <div className="h-3 w-24 bg-gray-100 rounded mb-3" />
        <div className="h-8 w-72 max-w-full bg-gray-200 rounded-lg" />
        <div className="h-4 w-96 max-w-full bg-gray-100 rounded mt-3" />
      </div>

      {/* Status card */}
      <div className="rounded-[26px] border border-black/[0.06] bg-[#F7F5F0] p-6 space-y-5">
        <div className="flex flex-wrap gap-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-3 w-16 bg-black/5 rounded" />
              <div className="h-4 w-24 bg-black/10 rounded" />
            </div>
          ))}
        </div>
        <div className="h-2 w-full bg-black/5 rounded-full" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-100">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-9 w-24 bg-gray-100 rounded-t-lg -mb-px" />
        ))}
      </div>

      {/* Content blocks */}
      <div className="space-y-3">
        <div className="h-20 bg-white border border-gray-100 rounded-2xl" />
        <div className="h-20 bg-white border border-gray-100 rounded-2xl" />
        <div className="h-20 bg-white border border-gray-100 rounded-2xl" />
      </div>
    </div>
  )
}
