"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Entry" },
  { href: "/items", label: "Items" },
  { href: "/alerts", label: "Alerts" },
  { href: "/insights", label: "Insights" },
  { href: "/categories", label: "Categories" },
];

export function BottomNav({ alertCount }: { alertCount: number }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-10 border-t-2 border-slate-200 bg-white pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-2xl grid-cols-5">
        {LINKS.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname.startsWith(l.href);
          return (
            <li key={l.href}>
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-sm font-semibold ${
                  active ? "text-emerald-900" : "text-slate-700"
                }`}
              >
                <span className="relative">
                  {l.label}
                  {l.href === "/alerts" && alertCount > 0 && (
                    <span className="absolute -top-2 -right-5 min-w-5 rounded-full bg-red-700 px-1.5 text-center text-xs leading-5 font-bold text-white">
                      {alertCount}
                      <span className="sr-only"> items low on stock</span>
                    </span>
                  )}
                </span>
                <span
                  aria-hidden
                  className={`h-1 w-8 rounded-full ${active ? "bg-emerald-800" : "bg-transparent"}`}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
