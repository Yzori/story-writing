export default function Loading() {
  return (
    <div className="min-h-screen bg-void pt-14">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-8">
          {/* Heading */}
          <div className="h-8 w-48 bg-surface rounded" />

          {/* Notification rows */}
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-16 w-full bg-surface rounded border border-border" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
