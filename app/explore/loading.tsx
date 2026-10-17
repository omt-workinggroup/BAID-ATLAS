export default function ExploreLoading() {
  return (
    <div className="grid gap-5" aria-busy="true" aria-label="Loading properties">
      <div className="h-11 w-2/3 animate-pulse rounded-lg bg-surface-muted" />
      <div className="h-13 animate-pulse rounded-xl bg-surface-muted" />
      <ul className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="grid gap-3">
            <div className="aspect-[4/3] animate-pulse rounded-xl bg-surface-muted" />
            <div className="grid gap-2 px-0.5">
              <div className="h-5 w-1/3 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-surface-muted" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
