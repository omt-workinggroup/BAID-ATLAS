// Provisional mark until brand assets are supplied.
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--primary)" />
      <path d="M8 22 16 8l8 14z" fill="none" stroke="var(--primary-contrast)" strokeWidth="2.4" strokeLinejoin="round" />
      <circle cx="16" cy="18" r="2.4" fill="var(--accent)" />
    </svg>
  );
}
