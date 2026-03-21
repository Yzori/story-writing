export default function Loading() {
  return (
    <div className="min-h-screen bg-void pt-14">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-8">
          {/* Hero cover */}
          <div className="h-64 w-full bg-surface rounded" />

          {/* Title bar */}
          <div className="h-8 w-96 bg-surface rounded" />

          {/* Synopsis lines */}
          <div className="space-y-3">
            <div className="h-4 w-full bg-surface rounded" />
            <div className="h-4 w-5/6 bg-surface rounded" />
            <div className="h-4 w-2/3 bg-surface rounded" />
          </div>

          {/* Chapter list */}
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 w-full bg-surface rounded border border-border" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
