'use client';

export function PostSkeleton() {
  return (
    <div className="bg-[#121212] border border-white/5 rounded-xl flex overflow-hidden animate-pulse">
      {/* Vote Sidebar Skeleton */}
      <div className="w-12 bg-white/[0.02] flex flex-col items-center py-4 gap-2 shrink-0">
        <div className="w-6 h-6 rounded bg-white/5" />
        <div className="w-4 h-4 rounded bg-white/5" />
        <div className="w-6 h-6 rounded bg-white/5" />
      </div>

      {/* Content Skeleton */}
      <div className="flex-1 p-4 min-w-0 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded-full bg-white/10" />
          <div className="h-3 w-24 bg-white/10 rounded" />
          <div className="h-3 w-16 bg-white/5 rounded" />
          <div className="ml-auto h-4 w-20 bg-white/5 rounded" />
        </div>

        {/* Text Lines */}
        <div className="space-y-2">
          <div className="h-4 w-3/4 bg-white/10 rounded" />
          <div className="h-4 w-full bg-white/5 rounded" />
          <div className="h-4 w-5/6 bg-white/5 rounded" />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center gap-4 pt-2">
          <div className="h-3 w-20 bg-white/5 rounded" />
          <div className="h-3 w-24 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}
