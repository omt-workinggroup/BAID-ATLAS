export function Steps({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Details", "Photos", "Review"];
  return (
    <ol className="grid grid-cols-3 gap-2" aria-label="Listing progress">
      {steps.map((s, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={s} aria-current={active ? "step" : undefined} className="grid gap-1.5">
            <span className={`h-1.5 rounded-full ${done || active ? "bg-gold" : "bg-border"}`} />
            <span className={`text-xs ${active ? "font-bold" : "text-muted"}`}>
              {done ? "✓ " : `${n}. `}
              {s}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
