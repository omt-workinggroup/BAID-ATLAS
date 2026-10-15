import { useId } from "react";

// BAID Atlas mark, redrawn as vector from the brand logo: a "B" whose spine rises into a roof,
// gold towers inside, an orbit and a guiding star. Ink and cut-out colours follow the theme.
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const g = `g${useId().replace(/:/g, "")}`;
  const gold = `url(#${g})`;
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={g} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F6D27A" />
          <stop offset="0.5" stopColor="#D9A12E" />
          <stop offset="1" stopColor="#A8741A" />
        </linearGradient>
      </defs>
      <path
        d="M12 56 30 11.6c.4-1 1.4-1.6 2.4-1.6H39c7.6 0 12.2 3.9 12.2 9.8 0 5.2-3.4 9.3-8.2 11.2 6.8.9 11 5 11 11.4C54 50.6 48 56 38.6 56z"
        fill="var(--logo-ink)"
        stroke={gold}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path d="M20.5 56 33 23.5 45.5 56z" fill="var(--logo-cut)" />
      <path d="M24.6 56 33 34l8.4 22" fill="none" stroke="var(--logo-ink)" strokeWidth="2.2" strokeLinejoin="round" />
      <rect x="28.2" y="44" width="3.6" height="12" rx="0.7" fill={gold} />
      <rect x="32.6" y="35.5" width="4" height="20.5" rx="0.7" fill={gold} />
      <rect x="37.4" y="46" width="3.6" height="10" rx="0.7" fill={gold} />
      <path d="M4.5 44.5C4 41 16 36 31 32.5c13-3 24.5-4 27.5-2.3" fill="none" stroke={gold} strokeWidth="3" strokeLinecap="round" />
      <path d="M4.5 44.5c.6 1.6 4.4 2.2 10 1.6" fill="none" stroke={gold} strokeWidth="1.8" strokeLinecap="round" />
      <path d="M55 4c.6 3.4 1.7 4.5 5 5-3.3.6-4.4 1.7-5 5-.6-3.3-1.7-4.4-5-5 3.3-.5 4.4-1.6 5-5z" fill={gold} />
    </svg>
  );
}

export function Logo({ size = 36, wordmark = false }: { size?: number; wordmark?: boolean }) {
  if (!wordmark) return <LogoMark size={size} />;
  return (
    <span className="flex items-center gap-2">
      <LogoMark size={size} />
      <span className="grid leading-none">
        <span className="text-[1.15rem] font-extrabold tracking-[0.14em]">BAID</span>
        <span className="text-gold mt-1 text-[0.58rem] font-bold tracking-[0.5em]">ATLAS</span>
      </span>
    </span>
  );
}
