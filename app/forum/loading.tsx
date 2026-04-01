export default function Loading() {
  return (
    <div className="min-h-screen bg-[var(--background)] text-white p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="h-6 w-56 bg-white/10 rounded" />
        <div className="h-24 bg-white/5 rounded-2xl border border-white/10 animate-pulse" />
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-40 bg-white/5 rounded-2xl border border-white/10 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
}
