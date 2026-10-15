import Link from "next/link";
import type { ReactNode } from "react";
import { BottomNav, DesktopNav } from "@/components/nav";
import { Logo } from "@/components/logo";

export function AppShell({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-border bg-surface/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" className="flex min-h-11 items-center" aria-label="BAID Atlas home">
            <Logo variant="horizontal" height={42} priority />
          </Link>
          <DesktopNav signedIn={signedIn} />
          {!signedIn && (
            <Link href="/sign-in" className="flex min-h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-contrast lg:hidden">
              Sign in
            </Link>
          )}
        </div>
      </header>
      <main id="main" className="mx-auto w-full min-w-0 max-w-5xl flex-1 px-4 pb-28 pt-5 sm:px-6 lg:pb-12">
        {children}
      </main>
      <BottomNav signedIn={signedIn} />
    </div>
  );
}
