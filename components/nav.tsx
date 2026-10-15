"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type Tab = { href: string; label: string; icon: (active: boolean) => React.ReactNode; match: (p: string) => boolean };

const stroke = (active: boolean) => (active ? "var(--primary)" : "currentColor");

const HomeIcon = (a: boolean) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke(a)} strokeWidth="2" aria-hidden="true">
    <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" strokeLinejoin="round" />
  </svg>
);
const PortalIcon = (a: boolean) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke(a)} strokeWidth="2" aria-hidden="true">
    <rect x="3" y="7" width="18" height="13" rx="2" />
    <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </svg>
);
const AccountIcon = (a: boolean) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke(a)} strokeWidth="2" aria-hidden="true">
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" strokeLinecap="round" />
  </svg>
);

function tabs(signedIn: boolean): Tab[] {
  return [
    { href: "/", label: "Home", icon: HomeIcon, match: (p) => p === "/" },
    { href: "/portal", label: "Provider", icon: PortalIcon, match: (p) => p.startsWith("/portal") },
    {
      href: signedIn ? "/account" : "/sign-in",
      label: signedIn ? "Account" : "Sign in",
      icon: AccountIcon,
      match: (p) => p.startsWith("/account") || p.startsWith("/sign-") || p.startsWith("/onboarding"),
    },
  ];
}

export function BottomNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {tabs(signedIn).map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.label}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-16 flex-col items-center justify-center gap-1 text-xs ${
                  active ? "font-semibold text-primary" : "text-muted"
                }`}
              >
                {t.icon(active)}
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function DesktopNav({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Primary" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {tabs(signedIn).map((t) => {
          const active = t.match(pathname);
          return (
            <li key={t.label}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center rounded-md px-3 text-sm ${
                  active ? "bg-primary-soft font-semibold text-primary" : "text-muted hover:text-text"
                }`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
