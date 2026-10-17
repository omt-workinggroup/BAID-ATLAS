"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { SceneArt } from "@/components/illustrations";
import type { MediaItem } from "@/lib/listings/types";

// Swipeable, keyboard-accessible photo gallery with honest media labels.
export function Gallery({ media, title }: { media: MediaItem[]; title: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const onScroll = () => setIndex(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const go = (i: number) => {
    const el = track.current;
    if (!el) return;
    const next = Math.max(0, Math.min(media.length - 1, i));
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
  };

  if (media.length === 0) {
    return (
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl sm:aspect-[16/9]">
        <SceneArt scene="villa" className="size-full" />
        <span className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white">Illustration</span>
      </div>
    );
  }

  const current = media[index];
  return (
    <section aria-roledescription="carousel" aria-label={`Photos of ${title}`} className="relative">
      <div
        ref={track}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") go(index + 1);
          if (e.key === "ArrowLeft") go(index - 1);
        }}
        className="flex aspect-[4/3] snap-x snap-mandatory overflow-x-auto rounded-3xl bg-surface-muted [scrollbar-width:none] sm:aspect-[16/9] [&::-webkit-scrollbar]:hidden"
      >
        {media.map((m, i) => (
          <div
            key={m.id}
            className="relative h-full w-full flex-none snap-center"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${media.length}`}
          >
            {m.url ? (
              <Image
                src={m.url}
                alt={m.alt_text ?? `${title}, photo ${i + 1}`}
                fill
                sizes="(min-width: 1024px) 960px, 100vw"
                className="object-cover"
                priority={i === 0}
                unoptimized
              />
            ) : (
              <SceneArt scene="villa" className="size-full" />
            )}
          </div>
        ))}
      </div>

      <div className="pointer-events-none absolute inset-x-3 top-3 flex justify-between">
        <div className="flex gap-1.5">
          {current?.is_render && (
            <span className="rounded-full bg-warning px-3 py-1 text-xs font-semibold text-white">Render — not a photo</span>
          )}
          {current?.is_virtually_staged && (
            <span className="rounded-full bg-warning px-3 py-1 text-xs font-semibold text-white">Virtually staged</span>
          )}
        </div>
        <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white backdrop-blur" aria-live="polite">
          {index + 1} / {media.length}
        </span>
      </div>

      {media.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            disabled={index === 0}
            aria-label="Previous photo"
            className="absolute left-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#25272c] shadow disabled:opacity-0 sm:grid"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            disabled={index === media.length - 1}
            aria-label="Next photo"
            className="absolute right-3 top-1/2 hidden size-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-[#25272c] shadow disabled:opacity-0 sm:grid"
          >
            ›
          </button>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {media.map((m, i) => (
              <button
                key={m.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index}
                className={`relative h-14 w-20 flex-none overflow-hidden rounded-xl border-2 transition ${
                  i === index ? "border-gold" : "border-transparent opacity-70"
                }`}
              >
                {m.url ? <Image src={m.url} alt="" fill sizes="80px" className="object-cover" unoptimized /> : null}
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
