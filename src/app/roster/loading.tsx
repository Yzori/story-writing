export default function Loading() {
  return (
    <div className="min-h-screen bg-void pt-14">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-8">
          {/* Heading */}
          <div className="h-8 w-40 bg-surface rounded" />

          {/* Member cards */}
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-20 w-full bg-surface rounded border border-border" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
