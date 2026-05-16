export default function PortalLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div>
        <div className="h-7 w-36 bg-gray-200 rounded-lg" />
        <div className="h-4 w-48 bg-gray-100 rounded mt-2" />
      </div>
      <div className="rounded-2xl border border-gray-100 bg-white overflow-hidden">
        <div className="h-12 border-b border-gray-100 px-4 flex items-center gap-3">
          <div className="h-6 w-6 bg-gray-100 rounded-lg" />
          <div className="h-4 w-24 bg-gray-100 rounded" />
        </div>
        {[...Array(5)].map((_, i) => (
          <div key={i} className="px-4 py-3.5 flex items-center gap-3 border-b border-gray-50 last:border-0">
            <div className="w-7 h-7 bg-gray-100 rounded" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-36 bg-gray-100 rounded" />
              <div className="h-3 w-20 bg-gray-50 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
