export default function Loading() {
  return (
    <div className="mx-auto grid max-w-2xl gap-4" aria-busy="true" aria-label="Loading">
      <div className="h-8 w-2/3 animate-pulse rounded-md bg-surface-muted" />
      <div className="h-32 animate-pulse rounded-lg bg-surface-muted" />
      <div className="h-32 animate-pulse rounded-lg bg-surface-muted" />
    </div>
  );
}
