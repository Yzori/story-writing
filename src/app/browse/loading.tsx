export default function Loading() {
  return (
    <div className="min-h-screen bg-void pt-14">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-8">
          {/* Search bar */}
          <div className="h-10 w-full max-w-md bg-surface rounded" />

          {/* Genre pills row */}
          <div className="flex gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-7 w-20 bg-surface rounded-full" />
            ))}
          </div>

          {/* Story grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-surface rounded border border-border p-4 space-y-3">
                <div className="h-36 bg-elevated rounded" />
                <div className="h-4 w-3/4 bg-elevated rounded" />
                <div className="h-4 w-1/2 bg-elevated rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
