"use client";

import { useRef } from "react";
import { PROPERTY_TYPE_LABELS, PROPERTY_TYPES, PURPOSE_LABELS, PURPOSES } from "@/lib/listings/format";
import type { SearchFilters } from "@/lib/listings/search";

// Mobile bottom sheet (native <dialog>) with all search filters; a plain GET form, so it works without JS too.
export function FilterSheet({ filters, count }: { filters: SearchFilters; count: number }) {
  const dialog = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => dialog.current?.showModal()}
        aria-label={`Filters${count ? ` (${count} active)` : ""}`}
        className="relative grid size-13 flex-none place-items-center rounded-full bg-primary text-primary-contrast shadow-md"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
          <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 4v4M8 10v4M16 16v4" />
        </svg>
        {count > 0 && (
          <span className="bg-gold-gradient absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full text-[0.65rem] font-bold text-[#25272c]">
            {count}
          </span>
        )}
      </button>

      <dialog
        ref={dialog}
        aria-labelledby="filter-title"
        className="m-0 mt-auto max-h-[90dvh] w-full max-w-none rounded-t-3xl bg-surface p-0 text-text backdrop:bg-black/50 sm:m-auto sm:max-w-lg sm:rounded-3xl"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <form action="/explore" method="get" className="grid gap-6 p-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
          <div className="mx-auto h-1.5 w-12 rounded-full bg-border sm:hidden" aria-hidden="true" />
          <div className="flex items-center justify-between">
            <h2 id="filter-title" className="text-xl font-extrabold">Filters</h2>
            <button type="button" onClick={() => dialog.current?.close()} className="min-h-11 px-2 text-sm font-semibold text-muted">
              Close
            </button>
          </div>
          {filters.q && <input type="hidden" name="q" value={filters.q} />}

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-bold">Looking to</legend>
            <div className="flex flex-wrap gap-2">
              <Chip name="purpose" value="" label="Any" checked={!filters.purpose} />
              {PURPOSES.map((p) => (
                <Chip key={p} name="purpose" value={p} label={PURPOSE_LABELS[p]} checked={filters.purpose === p} />
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-bold">Property type</legend>
            <div className="flex flex-wrap gap-2">
              <Chip name="type" value="" label="Any" checked={!filters.type} />
              {PROPERTY_TYPES.map((t) => (
                <Chip key={t} name="type" value={t} label={PROPERTY_TYPE_LABELS[t]} checked={filters.type === t} />
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-bold">Price</legend>
            <div className="grid grid-cols-[auto_1fr_1fr] gap-2">
              <select name="currency" defaultValue={filters.currency ?? "GHS"} aria-label="Currency" className="min-h-12 rounded-xl border border-border bg-surface px-2">
                <option>GHS</option>
                <option>USD</option>
              </select>
              <input name="min" inputMode="numeric" placeholder="Min" defaultValue={filters.min ?? ""} aria-label="Minimum price" className="min-h-12 w-full rounded-xl border border-border bg-surface px-3" />
              <input name="max" inputMode="numeric" placeholder="Max" defaultValue={filters.max ?? ""} aria-label="Maximum price" className="min-h-12 w-full rounded-xl border border-border bg-surface px-3" />
            </div>
            <p className="text-xs text-muted">Prices are matched in the listing&apos;s own currency — we never convert them.</p>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-bold">Bedrooms</legend>
            <div className="flex flex-wrap gap-2">
              <Chip name="beds" value="" label="Any" checked={!filters.beds} />
              {[1, 2, 3, 4, 5].map((b) => (
                <Chip key={b} name="beds" value={String(b)} label={`${b}+`} checked={filters.beds === b} />
              ))}
            </div>
          </fieldset>

          <fieldset className="grid gap-2">
            <legend className="mb-2 text-sm font-bold">Sort by</legend>
            <div className="flex flex-wrap gap-2">
              <Chip name="sort" value="newest" label="Newest" checked={!filters.sort || filters.sort === "newest"} />
              <Chip name="sort" value="price_asc" label="Price: low to high" checked={filters.sort === "price_asc"} />
              <Chip name="sort" value="price_desc" label="Price: high to low" checked={filters.sort === "price_desc"} />
            </div>
          </fieldset>

          <div className="sticky bottom-0 -mx-5 grid grid-cols-[auto_1fr] gap-3 border-t border-border bg-surface px-5 pt-4">
            <a href={`/explore${filters.q ? `?q=${encodeURIComponent(filters.q)}` : ""}`} className="inline-flex min-h-12 items-center px-3 font-semibold underline decoration-gold decoration-2 underline-offset-4">
              Clear all
            </a>
            <button type="submit" className="min-h-12 rounded-full bg-primary font-semibold text-primary-contrast">
              Show results
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}

function Chip({ name, value, label, checked }: { name: string; value: string; label: string; checked: boolean }) {
  return (
    <label className="cursor-pointer">
      <input type="radio" name={name} value={value} defaultChecked={checked} className="peer sr-only" />
      <span className="inline-flex min-h-10 items-center rounded-full border border-border bg-surface px-4 text-sm transition-colors peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-contrast peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-gold">
        {label}
      </span>
    </label>
  );
}
