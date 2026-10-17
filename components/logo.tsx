import Image from "next/image";

// Official BAID Atlas logo artwork (public/brand), extracted from the supplied brand file.
// The site theme is always white, the background the charcoal-and-gold logo was drawn for.
const assets = {
  horizontal: { src: "/brand/logo-horizontal.webp", w: 757, h: 220 },
  mark: { src: "/brand/logo-mark.webp", w: 480, h: 350 },
  full: { src: "/brand/logo-full.webp", w: 760, h: 727 },
} as const;

export function Logo({
  variant = "horizontal",
  height = 40,
  priority = false,
  className = "",
}: {
  variant?: keyof typeof assets;
  height?: number;
  priority?: boolean;
  className?: string;
}) {
  const a = assets[variant];
  const width = Math.round((a.w / a.h) * height);
  return (
    <span className={`brand-logo inline-flex ${className}`}>
      <Image src={a.src} alt="BAID Atlas" width={width} height={height} priority={priority} unoptimized />
    </span>
  );
}

export const TAGLINE = "Discover more. Go further.";
