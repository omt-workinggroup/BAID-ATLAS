import Link from "next/link";
import type { ReactNode } from "react";
import { BottomNav, DesktopNav } from "@/components/nav";
import { Logo } from "@/components/logo";

const footerLinks = [
  {
    title: "Find property",
    links: [
      { href: "/explore?purpose=sale", label: "For sale" },
      { href: "/rentals", label: "To rent" },
      { href: "/short-stays", label: "Short stays" },
      { href: "/land", label: "Land" },
      { href: "/commercial", label: "Commercial" },
    ],
  },
  {
    title: "Providers",
    links: [
      { href: "/portal", label: "Provider portal" },
      { href: "/sign-up", label: "List a property" },
    ],
  },
  {
    title: "Your account",
    links: [
      { href: "/account/saved", label: "Saved properties" },
      { href: "/account", label: "Account settings" },
    ],
  },
];

export function AppShell({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-h-11 items-center" aria-label="BAID Atlas home">
            <Logo variant="horizontal" height={38} priority />
          </Link>
          <DesktopNav signedIn={signedIn} />
          {!signedIn && (
            <Link
              href="/sign-in"
              className="flex min-h-10 items-center rounded-xl border border-border px-4 text-sm font-semibold transition-colors hover:border-text lg:hidden"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main id="main" className="mx-auto w-full min-w-0 max-w-6xl flex-1 px-4 pb-12 pt-6 sm:px-6">
        {children}
      </main>
      <footer className="border-t border-border bg-surface-muted pb-28 lg:pb-0">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.2fr_2fr]">
          <div className="grid content-start gap-4">
            <Logo variant="horizontal" height={34} />
            <p className="max-w-xs text-sm leading-relaxed text-muted">
              Property listings for Ghana, reviewed before they go live, with verification you can read in full.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3">
            {footerLinks.map((col) => (
              <nav key={col.title} aria-label={col.title} className="grid content-start gap-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-text">{col.title}</p>
                <ul className="grid gap-2.5 text-sm">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="text-muted transition-colors hover:text-text">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="border-t border-border">
          <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-muted sm:px-6">
            © {new Date().getFullYear()} BAID Atlas. Always view a property and check its documents before you pay.
          </p>
        </div>
      </footer>
      <BottomNav signedIn={signedIn} />
    </div>
  );
}
