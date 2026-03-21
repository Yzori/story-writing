export default function Loading() {
  return (
    <div className="min-h-screen bg-void pt-14">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="animate-pulse space-y-8">
          {/* Heading */}
          <div className="h-8 w-32 bg-surface rounded" />

          {/* Form sections */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="h-4 w-24 bg-surface rounded" />
              <div className="h-10 w-full bg-surface rounded border border-border" />
              <div className="h-10 w-full bg-surface rounded border border-border" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
