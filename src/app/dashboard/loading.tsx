export default function Loading() {
  return (
    <div className="min-h-screen bg-void pt-14">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-8">
          {/* Greeting bar */}
          <div className="h-8 w-64 bg-surface rounded" />

          {/* Stat cards row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 bg-surface rounded border border-border" />
            ))}
          </div>

          {/* Story grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
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
