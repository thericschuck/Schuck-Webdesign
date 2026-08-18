export default function BewertungLoading() {
  return (
    <div className="max-w-lg space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-52 bg-gray-200 rounded-lg" />
        <div className="h-4 w-full max-w-sm bg-gray-100 rounded mt-2" />
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="h-4 w-40 bg-gray-100 rounded" />
          <div className="h-3 w-52 bg-gray-100 rounded mt-2" />
        </div>
        <div className="px-6 py-5 flex flex-col gap-5">
          <div className="flex gap-1.5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-7 h-7 rounded-full bg-gray-100" />
            ))}
          </div>
          <div className="h-24 bg-gray-100 rounded-xl" />
          <div className="h-10 w-40 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
