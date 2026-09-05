'use client';

export function MatchCardSkeleton() {
  return (
    <div className="card p-4 flex flex-col gap-3 animate-pulse">
      <div className="flex gap-3">
        <div className="w-11 h-11 rounded-xl" style={{ background: 'var(--color-surface-hover)' }} />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded-lg" style={{ background: 'var(--color-surface-hover)' }} />
          <div className="h-3 w-1/2 rounded-lg" style={{ background: 'var(--color-surface-hover)' }} />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-5 w-16 rounded-full" style={{ background: 'var(--color-surface-hover)' }} />
        <div className="h-5 w-12 rounded-full" style={{ background: 'var(--color-surface-hover)' }} />
        <div className="h-5 w-14 rounded-full" style={{ background: 'var(--color-surface-hover)' }} />
      </div>
      <div className="h-1 w-full rounded-full" style={{ background: 'var(--color-surface-hover)' }} />
    </div>
  );
}

export function MatchListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <MatchCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="card p-5">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-2xl" style={{ background: 'var(--color-surface-hover)' }} />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-40 rounded-lg" style={{ background: 'var(--color-surface-hover)' }} />
            <div className="h-4 w-32 rounded-lg" style={{ background: 'var(--color-surface-hover)' }} />
            <div className="flex gap-2">
              <div className="h-5 w-16 rounded-full" style={{ background: 'var(--color-surface-hover)' }} />
              <div className="h-5 w-10 rounded-full" style={{ background: 'var(--color-surface-hover)' }} />
            </div>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="card p-4 text-center">
            <div className="h-8 w-12 mx-auto rounded-lg" style={{ background: 'var(--color-surface-hover)' }} />
            <div className="h-3 w-16 mx-auto mt-2 rounded-lg" style={{ background: 'var(--color-surface-hover)' }} />
          </div>
          <div className="card p-4 text-center">
            <div className="h-8 w-12 mx-auto rounded-lg" style={{ background: 'var(--color-surface-hover)' }} />
            <div className="h-3 w-16 mx-auto mt-2 rounded-lg" style={{ background: 'var(--color-surface-hover)' }} />
          </div>
        </div>
      </div>
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--color-divider)]">
          <div className="h-4 w-24 rounded-lg" style={{ background: 'var(--color-surface-hover)' }} />
        </div>
        <div className="divide-y divide-[var(--color-divider)]">
          {[1, 2, 3].map(i => (
            <div key={i} className="px-4 py-3">
              <div className="h-4 w-3/4 rounded-lg" style={{ background: 'var(--color-surface-hover)' }} />
              <div className="h-3 w-1/2 rounded-lg mt-2" style={{ background: 'var(--color-surface-hover)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TournamentsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4 flex flex-col gap-3 animate-pulse">
          <div className="flex gap-3">
            <div className="w-11 h-11 rounded-xl" style={{ background: 'var(--color-surface-hover)' }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded-lg" style={{ background: 'var(--color-surface-hover)' }} />
              <div className="h-3 w-1/2 rounded-lg" style={{ background: 'var(--color-surface-hover)' }} />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-5 w-20 rounded-full" style={{ background: 'var(--color-surface-hover)' }} />
            <div className="h-5 w-14 rounded-full" style={{ background: 'var(--color-surface-hover)' }} />
          </div>
          <div className="h-1 w-full rounded-full" style={{ background: 'var(--color-surface-hover)' }} />
        </div>
      ))}
    </div>
  );
}

export function FormSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className="card p-4 space-y-3">
          <div className="h-4 w-32 rounded-lg" style={{ background: 'var(--color-surface-hover)' }} />
          <div className="h-10 w-full rounded-xl" style={{ background: 'var(--color-surface-hover)' }} />
        </div>
      ))}
    </div>
  );
}
