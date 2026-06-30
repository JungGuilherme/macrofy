import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('skeleton', className)} />;
}

export function MarketCardSkeleton() {
  return (
    <div className="market-card">
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-12" />
      </div>
      <Skeleton className="h-6 w-24 mb-1" />
      <Skeleton className="h-4 w-16" />
    </div>
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="kpi-card">
      <Skeleton className="h-4 w-24 mb-3" />
      <Skeleton className="h-8 w-20 mb-2" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}

export function ContentCardSkeleton() {
  return (
    <div className="content-card p-4">
      <div className="flex gap-2 mb-3">
        <Skeleton className="h-5 w-16 rounded-full" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>
      <Skeleton className="h-5 w-full mb-2" />
      <Skeleton className="h-4 w-3/4 mb-3" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  );
}

export function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
  return (
    <tr>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  );
}

export function HomeSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Market cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <MarketCardSkeleton key={i} />
        ))}
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Agenda */}
          <div className="bg-card rounded-xl border p-5">
            <Skeleton className="h-6 w-40 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-4">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-4 flex-1" />
                </div>
              ))}
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-card rounded-xl border p-5">
            <Skeleton className="h-6 w-48 mb-4" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <ContentCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl border p-5">
            <Skeleton className="h-6 w-32 mb-4" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
