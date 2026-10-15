"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function OrgTabs({ slug }: { slug: string }) {
  const pathname = usePathname();
  const tabs = [
    { href: `/portal/${slug}`, label: "Overview" },
    { href: `/portal/${slug}/team`, label: "Team" },
    { href: `/portal/${slug}/organisation`, label: "Profile" },
  ];
  return (
    <nav aria-label="Organisation" className="-mx-4 overflow-x-auto border-b border-border px-4">
      <ul className="flex gap-1">
        {tabs.map((t) => {
          const active = pathname === t.href;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center border-b-2 px-3 text-sm ${
                  active ? "border-gold font-bold text-text" : "border-transparent text-muted"
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
