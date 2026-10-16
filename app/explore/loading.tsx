export default function ExploreLoading() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Loading properties">
      <div className="h-9 w-2/3 animate-pulse rounded-xl bg-surface-muted" />
      <div className="h-13 animate-pulse rounded-full bg-surface-muted" />
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="overflow-hidden rounded-3xl border border-border bg-surface p-2">
            <div className="aspect-[16/11] animate-pulse rounded-[1.25rem] bg-surface-muted" />
            <div className="grid gap-2 p-3">
              <div className="h-4 w-1/3 animate-pulse rounded bg-surface-muted" />
              <div className="h-5 w-3/4 animate-pulse rounded bg-surface-muted" />
              <div className="h-6 w-1/2 animate-pulse rounded bg-surface-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
