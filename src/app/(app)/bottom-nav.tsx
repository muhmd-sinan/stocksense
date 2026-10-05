"use client";

import {
  BellIcon,
  ChartBarIcon,
  PackageIcon,
  PencilSimpleLineIcon,
  TagIcon,
  type Icon,
} from "@phosphor-icons/react";
import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string; icon: Icon }[] = [
  { href: "/", label: "Entry", icon: PencilSimpleLineIcon },
  { href: "/items", label: "Items", icon: PackageIcon },
  { href: "/alerts", label: "Alerts", icon: BellIcon },
  { href: "/insights", label: "Insights", icon: ChartBarIcon },
  { href: "/categories", label: "Categories", icon: TagIcon },
];

const isActive = (href: string, pathname: string) =>
  href === "/" ? pathname === "/" : pathname.startsWith(href);

export function BottomNav({ alertCount }: { alertCount: number }) {
  const pathname = usePathname();
  const current = LINKS.findIndex((l) => isActive(l.href, pathname));

  return (
    <nav
      aria-label="Main"
      style={{ viewTransitionName: "app-nav" }}
      className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-transparent bg-bar pb-[env(safe-area-inset-bottom)] dark:border-line"
    >
      <div className="relative mx-auto max-w-2xl px-1.5 py-1.5">
        {/* One yellow key glides to the active tab (transform only) */}
        <span
          aria-hidden
          className="absolute inset-y-1.5 left-1.5 w-[calc((100%_-_0.75rem)/5)] rounded-xl bg-accent transition-[translate,opacity] duration-300 ease-out-expo motion-reduce:transition-none"
          style={{
            translate: `${Math.max(current, 0) * 100}% 0`,
            opacity: current < 0 ? 0 : 1,
          }}
        />
        <ul className="relative grid grid-cols-5">
          {LINKS.map((l, i) => {
            const active = i === current;
            const badge = l.href === "/alerts" && alertCount > 0;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  transitionTypes={
                    active ? undefined : [current >= 0 && i < current ? "nav-back" : "nav-forward"]
                  }
                  className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-xs font-bold transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-on-bar active:scale-95 motion-reduce:active:scale-100 ${
                    active ? "text-on-accent" : "text-on-bar-muted hover:text-on-bar"
                  }`}
                >
                  <span className="relative">
                    <TabIcon icon={l.icon} active={active} />
                    {badge && (
                      <span
                        aria-hidden
                        key={alertCount}
                        className="bump absolute -top-1.5 left-4 min-w-5 rounded-full bg-danger px-1 text-center text-[0.7rem] leading-5 font-extrabold text-on-solid tabular-nums ring-2 ring-bar"
                      >
                        {alertCount}
                      </span>
                    )}
                  </span>
                  {l.label}
                  {/* Spoken after the label: "Alerts, 9 items low on stock" */}
                  {badge && (
                    <span className="sr-only">
                      , {alertCount} {alertCount === 1 ? "item" : "items"} low on stock
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

/** Fills and dips while its link is loading, so a slow tap still answers immediately */
function TabIcon({ icon: I, active }: { icon: Icon; active: boolean }) {
  const { pending } = useLinkStatus();
  return (
    <I
      aria-hidden
      weight={active || pending ? "fill" : "bold"}
      className={`size-6 transition-transform duration-200 ease-out-expo motion-reduce:transition-none ${
        pending ? "scale-90" : ""
      }`}
    />
  );
}
