import { Skeleton } from "@/components/ui/skeleton";

/**
 * Page-level skeleton screens that mirror the actual layout of each page.
 * They give users an immediate sense of structure instead of a blank spinner.
 */

export const QuizSkeleton = () => (
  <div className="page-bg min-h-screen px-5 pb-10 pt-6">
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      {/* Header: eyebrow + progress */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-12" />
      </div>
      <Skeleton className="h-2 w-full rounded-full" />

      {/* Language switcher */}
      <Skeleton className="h-14 w-full rounded-[22px]" />

      {/* Question card */}
      <div className="surface-panel flex flex-col gap-5 p-6">
        <Skeleton className="h-3 w-32" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-4/5" />
        </div>

        <div className="mt-2 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-[18px]" />
          ))}
        </div>
      </div>

      {/* Footer buttons */}
      <div className="flex gap-3">
        <Skeleton className="h-12 w-12 rounded-2xl" />
        <Skeleton className="h-12 flex-1 rounded-2xl" />
      </div>
    </div>
  </div>
);

export const AnalyticsSkeleton = () => (
  <div className="page-bg min-h-screen px-5 pb-10 pt-6">
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-5">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-56" />
      </div>

      {/* Stat cards row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="surface-panel flex flex-col gap-2 p-4">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-7 w-20" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="surface-panel p-5">
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>

      {/* List rows */}
      <div className="surface-panel space-y-3 p-5">
        <Skeleton className="h-4 w-40" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-full" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-4 w-12" />
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const DailyViewSkeleton = () => (
  <div className="page-bg min-h-screen px-4 pb-10 pt-6">
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>

      <Skeleton className="h-2 w-full rounded-full" />

      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="surface-panel flex items-center gap-3 p-4">
          <Skeleton className="h-10 w-10 rounded-2xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
      ))}
    </div>
  </div>
);

export const StudySkeleton = () => (
  <div className="page-bg min-h-screen px-5 pb-10 pt-6">
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-56" />

      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-[20px]" />
        ))}
      </div>

      <div className="surface-panel space-y-3 p-5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-5/6" />
        <Skeleton className="h-3 w-3/4" />
      </div>
    </div>
  </div>
);

export const RouteSkeleton = () => (
  <div className="page-bg min-h-screen px-5 pb-10 pt-6">
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="grid grid-cols-2 gap-3 pt-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  </div>
);
