export default function SettingsLoading() {
  return (
    <div className="max-w-lg space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-40 bg-gray-200 rounded-lg" />
        <div className="h-4 w-56 bg-gray-100 rounded mt-2" />
      </div>

      {/* Meine Daten */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="h-4 w-28 bg-gray-100 rounded" />
        </div>
        <div className="px-6 py-4 flex flex-col gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex justify-between gap-4">
              <div className="h-3.5 w-16 bg-gray-100 rounded" />
              <div className="h-3.5 w-32 bg-gray-100 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* Passwort ändern */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="h-4 w-32 bg-gray-100 rounded" />
        </div>
        <div className="px-6 py-5 flex flex-col gap-4">
          <div className="h-10 bg-gray-100 rounded-xl" />
          <div className="h-10 bg-gray-100 rounded-xl" />
          <div className="h-10 w-32 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  )
}
