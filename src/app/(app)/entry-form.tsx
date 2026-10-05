"use client";

import { CashRegisterIcon, TruckIcon, type Icon } from "@phosphor-icons/react";
import { useRef, useState } from "react";
import type { AppliedLine } from "@/lib/data/entries";
import type { CategoryOption, EntryItem } from "@/lib/entry-rows";
import { crossedThreshold } from "@/lib/forecast";
import { BoughtPanel } from "./bought-panel";
import { LowStockToast } from "./entry-parts";
import { SoldPanel } from "./sold-panel";

export type EntryTab = "sold" | "bought";

const TABS: { id: EntryTab; label: string; icon: Icon }[] = [
  { id: "sold", label: "Sold", icon: CashRegisterIcon },
  { id: "bought", label: "Bought", icon: TruckIcon },
];

/**
 * Sold / Bought tabs. Both panels stay mounted, so switching never loses typed lines.
 * The tab is mirrored in the URL (?tab=bought) without a navigation, so a refresh keeps it.
 */
export function EntryTabs({
  initialTab,
  items,
  categories,
}: {
  initialTab: EntryTab;
  items: EntryItem[];
  categories: CategoryOption[];
}) {
  const [tab, setTab] = useState<EntryTab>(initialTab);
  const [crossed, setCrossed] = useState<AppliedLine[]>([]);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = TABS.findIndex((t) => t.id === tab);

  function select(next: EntryTab, moveFocus = false) {
    setTab(next);
    if (moveFocus) tabRefs.current[TABS.findIndex((t) => t.id === next)]?.focus();
    const url = new URL(window.location.href);
    if (next === "sold") url.searchParams.delete("tab");
    else url.searchParams.set("tab", next);
    window.history.replaceState(null, "", url);
  }

  // Arrow keys move between tabs (roving tabindex), as in the ARIA tabs pattern
  function onKeyDown(e: React.KeyboardEvent) {
    const last = TABS.length - 1;
    const to =
      e.key === "ArrowRight"
        ? (current + 1) % TABS.length
        : e.key === "ArrowLeft"
          ? (current + last) % TABS.length
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : -1;
    if (to < 0) return;
    e.preventDefault();
    select(TABS[to].id, true);
  }

  return (
    <>
      <div
        role="tablist"
        aria-label="Entry type"
        onKeyDown={onKeyDown}
        className="relative grid grid-cols-2 rounded-xl border-2 border-line bg-sunken p-1"
      >
        {/* One yellow key slides under the selected tab (transform only) */}
        <span
          aria-hidden
          className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/2)] rounded-lg bg-accent transition-[translate] duration-300 ease-out-expo motion-reduce:transition-none"
          style={{ translate: `${current * 100}% 0` }}
        />
        {TABS.map((t, i) => {
          const selected = t.id === tab;
          const I = t.icon;
          return (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[i] = el;
              }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={selected}
              aria-controls={`panel-${t.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => select(t.id)}
              className={`relative flex min-h-12 items-center justify-center gap-2 rounded-lg text-lg font-extrabold transition-colors duration-150 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus ${
                selected ? "text-on-accent" : "text-ink-2 hover:text-ink"
              }`}
            >
              <I aria-hidden weight={selected ? "fill" : "bold"} className="size-6" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Lines lay out by the panel's width (container queries), not the viewport's.
          The toast stays outside: a container would become its fixed-position box. */}
      <div className="@container">
        {/* hidden = display:none, so the enter animation replays each time a panel is shown */}
        <div
          role="tabpanel"
          id="panel-sold"
          aria-labelledby="tab-sold"
          hidden={tab !== "sold"}
          className="enter"
        >
          <SoldPanel
            items={items}
            categories={categories}
            onSaved={(lines) => setCrossed(crossedThreshold(lines))}
            onGoToBought={() => select("bought", true)}
          />
        </div>
        <div
          role="tabpanel"
          id="panel-bought"
          aria-labelledby="tab-bought"
          hidden={tab !== "bought"}
          className="enter"
        >
          <BoughtPanel items={items} categories={categories} />
        </div>
      </div>

      <LowStockToast lines={crossed} onDismiss={() => setCrossed([])} />
    </>
  );
}
