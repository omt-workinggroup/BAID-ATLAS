// Shown when a listing has no photo yet. Deliberately plain: no stand-in imagery that could pass for the property.
export function NoPhoto({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid size-full place-items-center bg-surface-muted text-muted">
      <div className="grid justify-items-center gap-1.5">
        <svg width={compact ? 22 : 30} height={compact ? 22 : 30} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 10.5 12 3l9 7.5M5 9v11h14V9M10 20v-5h4v5" />
        </svg>
        {!compact && <span className="text-xs">Photos coming soon</span>}
      </div>
    </div>
  );
}
