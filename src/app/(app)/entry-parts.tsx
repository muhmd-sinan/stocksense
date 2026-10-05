"use client";

import { BellIcon, CheckIcon, XIcon } from "@phosphor-icons/react";
import { AnimatePresence, type MotionProps } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { key, labelClass } from "@/components/field";
import type { AppliedLine } from "@/lib/data/entries";
import { formatINR, formatQty } from "@/lib/format";

// Pieces shared by the Sold and Bought tabs

export const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** A line rises in when added. Removing one fades it, then collapses its height to close the gap. */
export const rowMotion: MotionProps = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EXPO } },
  exit: {
    opacity: 0,
    height: 0,
    transition: {
      opacity: { duration: 0.12 },
      height: { duration: 0.25, ease: EXPO, delay: 0.08 },
    },
  },
};

/**
 * Moves focus once React has rendered (a new line, the first error). Selectors are tried in
 * order inside the returned scope, so a fallback can follow the preferred target.
 */
export function useFocusRequest<T extends HTMLElement>() {
  const scope = useRef<T>(null);
  const [request, setRequest] = useState<{ selectors: string[] } | null>(null);
  useEffect(() => {
    if (!request) return;
    for (const s of request.selectors) {
      const el = scope.current?.querySelector<HTMLElement>(s);
      if (el) return el.focus();
    }
  }, [request]);
  const focus = useCallback((...selectors: string[]) => setRequest({ selectors }), []);
  return [scope, focus] as const;
}

/** id + error wiring for an input inside a Cell */
export function a11y(id: string, error?: string) {
  return {
    id,
    "aria-invalid": error ? true : undefined,
    "aria-describedby": error ? `${id}-error` : undefined,
  } as const;
}

/** One labelled input in a line; the error sits under it */
export function Cell({
  id,
  label,
  error,
  className = "",
  children,
}: {
  id: string;
  label: string;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm font-bold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Sits level with the inputs (label row is 1.5rem + 0.375rem gap) */
export function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-7.5 grid size-12 place-items-center rounded-xl text-ink-2 transition-colors hover:bg-sunken hover:text-danger focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
    >
      <XIcon aria-hidden weight="bold" className="size-5" />
      <span className="sr-only">{label}</span>
    </button>
  );
}

export function savedText(l: AppliedLine): string {
  const q = `${formatQty(l.quantity)} ${l.unit}`;
  switch (l.type) {
    case "sale":
      return `Sold ${q} ${l.name} for ${formatINR(l.quantity * l.price)}. ${formatQty(l.stockAfter)} left.`;
    case "restock":
      return `Bought ${q} ${l.name}. Now ${formatQty(l.stockAfter)}.`;
    case "create_item":
      return `Added ${l.name}: ${q} at ${formatINR(l.price)} each.`;
    case "update_threshold":
      return `Alert for ${l.name} set to ${formatQty(l.quantity)}.`;
  }
}

/** The live region is always mounted so the confirmation is announced when it appears */
export function SavedNote({ lines }: { lines: AppliedLine[] }) {
  return (
    <div role="status">
      <AnimatePresence initial={false}>
        {lines.length > 0 && (
          <m.div
            key="saved"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: EXPO }}
            className="overflow-hidden"
          >
            <div className="mb-4 flex flex-col gap-2 rounded-xl border-2 border-ok bg-ok-soft p-4">
              {/* Lands slightly tilted, like a rubber stamp on a bill */}
              <m.p
                initial={{ opacity: 0, scale: 1.3, rotate: -2 }}
                animate={{ opacity: 1, scale: 1, rotate: -2 }}
                transition={{ duration: 0.4, ease: EXPO, delay: 0.1 }}
                className="headline inline-flex items-center gap-1.5 self-start rounded-md border-[3px] border-ok px-2 py-0.5 text-xl text-ok uppercase"
              >
                <CheckIcon aria-hidden weight="bold" className="size-5" />
                Saved
              </m.p>
              <ul className="flex flex-col gap-1 font-semibold text-ink">
                {lines.map((l, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckIcon aria-hidden weight="bold" className="mt-1 size-4 shrink-0 text-ok" />
                    <span>{savedText(l)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Stays until dismissed (no auto-hide, so it can't vanish before it's read). */
export function LowStockToast({
  lines,
  onDismiss,
}: {
  lines: AppliedLine[];
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {lines.length > 0 && (
        <m.div
          key="toast"
          role="alert"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EXPO } }}
          exit={{ opacity: 0, y: 16, transition: { duration: 0.18 } }}
          className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 mx-auto w-[calc(100%-2rem)] max-w-2xl rounded-xl border-2 border-danger bg-surface p-4 shadow-[0_6px_0_0_var(--danger)] short:bottom-[calc(4rem+env(safe-area-inset-bottom))] lg:inset-x-auto lg:right-8 lg:bottom-8 lg:mx-0 lg:w-96"
        >
          <p className="flex items-center gap-2 font-extrabold text-ink">
            <BellIcon aria-hidden weight="fill" className="size-5 shrink-0 text-danger" />
            {lines.length === 1 ? "Now low on stock:" : `${lines.length} items now low on stock:`}
          </p>
          <ul className="mt-1 font-semibold text-ink">
            {lines.map((l) => (
              <li key={l.itemId}>
                {l.name}: {formatQty(l.stockAfter)} {l.unit} left (alert at {formatQty(l.threshold)}
                )
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link
              href="/alerts"
              transitionTypes={["nav-forward"]}
              className={`${key("danger", "sm")} w-full`}
            >
              See alerts
            </Link>
            <button
              type="button"
              onClick={onDismiss}
              className={`${key("secondary", "sm")} w-full`}
            >
              Dismiss
            </button>
          </div>
        </m.div>
      )}
    </AnimatePresence>
  );
}
