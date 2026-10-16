import { LISTING_STATUS_LABELS } from "@/lib/listings/format";

const tones: Record<string, string> = {
  draft: "bg-surface-muted text-muted",
  submitted: "bg-verified/10 text-verified",
  changes_requested: "bg-warning-soft text-warning",
  approved: "bg-gold-soft text-gold-strong",
  published: "bg-success-soft text-success",
  paused: "bg-surface-muted text-muted",
  rejected: "bg-danger-soft text-danger",
  expired: "bg-surface-muted text-muted",
  sold: "bg-primary text-primary-contrast",
  rented: "bg-primary text-primary-contrast",
  archived: "bg-surface-muted text-muted",
};

export function StatusChip({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${tones[status] ?? tones.draft}`}>
      {status === "published" && <span className="size-1.5 animate-pulse rounded-full bg-success motion-reduce:animate-none" aria-hidden="true" />}
      {LISTING_STATUS_LABELS[status] ?? status}
    </span>
  );
}
