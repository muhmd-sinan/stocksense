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

/**
 * The main navigation in two shapes, both with one yellow key that glides to the active tab
 * (transform only):
 * - "bar": fixed to the bottom below lg, icon over label
 * - "side": a column in the desktop sidebar, icon beside label
 * The layout renders both; CSS shows one, so only one is ever in the accessibility tree.
 */
export function MainNav({ alertCount, variant }: { alertCount: number; variant: "bar" | "side" }) {
  const pathname = usePathname();
  const current = LINKS.findIndex((l) => isActive(l.href, pathname));
  const side = variant === "side";
  const at = Math.max(current, 0) * 100;

  const links = LINKS.map((l, i) => {
    const active = i === current;
    const badge = l.href === "/alerts" && alertCount > 0;
    return (
      <li key={l.href}>
        {/* Full prefetch: the five screens are ready before the tap, so switching is instant.
            Saves call revalidatePath, which drops the cache and re-prefetches visible links. */}
        <Link
          href={l.href}
          prefetch
          aria-current={active ? "page" : undefined}
          transitionTypes={
            active ? undefined : [current >= 0 && i < current ? "nav-back" : "nav-forward"]
          }
          className={`flex rounded-xl font-bold transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-offset-0 focus-visible:outline-on-bar active:scale-95 motion-reduce:active:scale-100 ${
            side
              ? "h-13 items-center gap-3 px-3 text-lg"
              : "min-h-14 flex-col items-center justify-center gap-0.5 text-xs short:min-h-11 short:flex-row short:gap-1.5 short:text-sm"
          } ${active ? "text-on-accent" : "text-on-bar-muted hover:text-on-bar"}`}
        >
          <span className="relative">
            <TabIcon icon={l.icon} active={active} />
            {badge && !side && (
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
          {badge && side && (
            <span
              aria-hidden
              key={alertCount}
              className="bump ml-auto min-w-7 rounded-full bg-danger px-2 text-center text-sm leading-6 font-extrabold text-on-solid tabular-nums"
            >
              {alertCount}
            </span>
          )}
          {/* Spoken after the label: "Alerts, 9 items low on stock" */}
          {badge && (
            <span className="sr-only">
              , {alertCount} {alertCount === 1 ? "item" : "items"} low on stock
            </span>
          )}
        </Link>
      </li>
    );
  });

  const keyClass =
    "absolute rounded-xl bg-accent transition-[translate,opacity] duration-300 ease-out-expo motion-reduce:transition-none";
  const keyStyle = { opacity: current < 0 ? 0 : 1 };

  if (side)
    return (
      <nav aria-label="Main" className="relative">
        <span
          aria-hidden
          className={`${keyClass} inset-x-0 top-0 h-13`}
          style={{ ...keyStyle, translate: `0 ${at}%` }}
        />
        <ul className="relative flex flex-col">{links}</ul>
      </nav>
    );

  return (
    <nav
      aria-label="Main"
      style={{ viewTransitionName: "app-nav" }}
      className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-transparent bg-bar pb-[env(safe-area-inset-bottom)] lg:hidden dark:border-line"
    >
      <div className="relative mx-auto max-w-3xl px-1.5 py-1.5 short:py-1">
        <span
          aria-hidden
          className={`${keyClass} inset-y-1.5 left-1.5 w-[calc((100%_-_0.75rem)/5)] short:inset-y-1`}
          style={{ ...keyStyle, translate: `${at}% 0` }}
        />
        <ul className="relative grid grid-cols-5">{links}</ul>
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
