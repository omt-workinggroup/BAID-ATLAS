"use client";

import { useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleSaved } from "@/app/properties/actions";

export function SaveButton({
  listingId,
  initialSaved,
  signedIn,
  slug,
  variant = "overlay",
}: {
  listingId: string;
  initialSaved: boolean;
  signedIn: boolean;
  slug: string;
  variant?: "overlay" | "pill";
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useOptimistic(initialSaved);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!signedIn) {
      router.push(`/sign-in?next=${encodeURIComponent(`/properties/${slug}`)}`);
      return;
    }
    start(async () => {
      setSaved(!saved);
      const res = await toggleSaved(listingId, !saved);
      if (!res.ok) router.refresh();
    });
  };

  const heart = (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill={saved ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
      className={saved ? "animate-[pop_.3s_ease-out] motion-reduce:animate-none" : ""}
    >
      <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" strokeLinejoin="round" />
    </svg>
  );

  if (variant === "pill") {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={saved}
        disabled={pending}
        className={`relative z-10 inline-flex min-h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors ${
          saved ? "border-danger/30 bg-danger-soft text-danger" : "border-border bg-surface text-text"
        }`}
      >
        {heart}
        {saved ? "Saved" : "Save"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={saved}
      aria-label={saved ? "Remove from saved" : "Save property"}
      disabled={pending}
      className={`relative z-10 grid size-10 place-items-center rounded-full shadow-sm backdrop-blur transition-colors ${
        saved ? "bg-white text-danger" : "bg-white/90 text-[#25272c] hover:text-danger"
      }`}
    >
      {heart}
    </button>
  );
}
