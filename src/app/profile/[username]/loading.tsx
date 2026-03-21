export default function Loading() {
  return (
    <div className="min-h-screen bg-void pt-14">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-8">
          {/* Avatar and name */}
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 bg-surface rounded-full" />
            <div className="space-y-3">
              <div className="h-8 w-48 bg-surface rounded" />
              <div className="h-4 w-32 bg-surface rounded" />
            </div>
          </div>

          {/* Bio lines */}
          <div className="space-y-3">
            <div className="h-4 w-full max-w-lg bg-surface rounded" />
            <div className="h-4 w-3/4 max-w-md bg-surface rounded" />
          </div>

          {/* Story grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
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
