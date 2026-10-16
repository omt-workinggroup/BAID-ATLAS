"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/browser";
import { prepareImage, randomName } from "@/lib/media/compress";
import { addMedia } from "@/app/portal/[orgSlug]/listings/actions";

type Item = { name: string; preview: string; state: "working" | "done" | "error"; message?: string };

export function PhotoUploader({ slug, orgId, listingId, remaining }: { slug: string; orgId: string; listingId: string; remaining: number }) {
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [isRender, setIsRender] = useState(false);
  const [isStaged, setIsStaged] = useState(false);
  const [rights, setRights] = useState(false);
  const busy = items.some((i) => i.state === "working");

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const list = Array.from(files).slice(0, Math.max(0, remaining));
    const supabase = getBrowserClient();
    setItems(list.map((f) => ({ name: f.name, preview: URL.createObjectURL(f), state: "working" })));

    await Promise.all(
      list.map(async (file, i) => {
        const update = (patch: Partial<Item>) => setItems((prev) => prev.map((it, j) => (j === i ? { ...it, ...patch } : it)));
        try {
          const { blob, width, height } = await prepareImage(file);
          const path = `${orgId}/${listingId}/${randomName()}`;
          const { error } = await supabase.storage.from("listing-media").upload(path, blob, { contentType: "image/webp", upsert: false });
          if (error) throw new Error("Upload failed. Check your connection and try again.");
          const alt = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 120);
          const res = await addMedia(slug, listingId, { path, alt, isRender, isStaged, width, height });
          if (!res.ok) throw new Error(res.message ?? "Couldn't attach that photo.");
          update({ state: "done" });
        } catch (err) {
          update({ state: "error", message: err instanceof Error ? err.message : "Something went wrong." });
        }
      }),
    );
    router.refresh();
  };

  return (
    <div className="grid gap-4">
      <div className="grid gap-2 rounded-2xl bg-surface-muted p-4 text-sm">
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} className="mt-1 size-5 accent-[var(--primary)]" />
          <span>I own these photos or have permission to use them, and they show this property.</span>
        </label>
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" checked={isRender} onChange={(e) => setIsRender(e.target.checked)} className="mt-1 size-5 accent-[var(--primary)]" />
          <span>These are <strong>renders</strong> (computer-generated), not photos.</span>
        </label>
        <label className="flex min-h-11 items-start gap-3">
          <input type="checkbox" checked={isStaged} onChange={(e) => setIsStaged(e.target.checked)} className="mt-1 size-5 accent-[var(--primary)]" />
          <span>These photos are <strong>virtually staged</strong> (furniture added digitally).</span>
        </label>
      </div>

      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/heic,image/heif"
        multiple
        className="sr-only"
        onChange={(e) => {
          void onFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={!rights || busy || remaining <= 0}
        onClick={() => input.current?.click()}
        className="grid min-h-32 place-items-center gap-1 rounded-3xl border-2 border-dashed border-gold/60 bg-gold-soft/40 px-4 py-6 text-center transition hover:bg-gold-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true" className="text-gold-strong">
          <path d="M4 16l4-4 3 3 5-5 4 4M4 4h16v16H4zM9 9h.01" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="font-bold">{busy ? "Uploading…" : "Add photos"}</span>
        <span className="text-xs text-muted">
          {remaining > 0 ? `Up to ${remaining} more · resized and location data removed on your phone` : "Photo limit reached"}
        </span>
      </button>

      {items.length > 0 && (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5" aria-live="polite">
          {items.map((it) => (
            <li key={it.preview} className="relative aspect-square overflow-hidden rounded-2xl bg-surface-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={it.preview} alt="" className={`size-full object-cover ${it.state === "working" ? "opacity-60" : ""}`} />
              <span
                className={`absolute inset-x-1 bottom-1 truncate rounded-full px-2 py-0.5 text-center text-[0.65rem] font-semibold ${
                  it.state === "done" ? "bg-success text-white" : it.state === "error" ? "bg-danger text-white" : "bg-black/60 text-white"
                }`}
                title={it.message}
              >
                {it.state === "done" ? "Added" : it.state === "error" ? (it.message ?? "Failed") : "Processing…"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
