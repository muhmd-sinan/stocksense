"use client";

import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { inputClass } from "@/components/field";
import { suggestItems, type EntryItem } from "@/lib/entry-rows";
import { formatINR, formatQty } from "@/lib/format";
import { a11y } from "./entry-parts";

/**
 * Name box on a Bought line that suggests items already in the shop (ARIA combobox + listbox).
 * Focus stays in the box; the highlighted option is announced via aria-activedescendant.
 * Opens on typing, ↓ or a tap, not when the page moves focus here (e.g. after Add row).
 */
export function NameCombobox({
  id,
  value,
  error,
  items,
  categoryNames,
  onType,
  onPick,
}: {
  id: string;
  value: string;
  error?: string;
  items: EntryItem[];
  categoryNames: Map<string, string>;
  onType: (name: string) => void;
  onPick: (item: EntryItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const suggestions = suggestItems(items, value);
  const shown = open && suggestions.length > 0;
  const current = active < suggestions.length ? active : -1;
  const listId = `${id}-suggestions`;
  const optionId = (i: number) => `${id}-option-${i}`;

  function close() {
    setOpen(false);
    setActive(-1);
  }
  function pick(item: EntryItem) {
    onPick(item);
    close();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    const n = suggestions.length;
    if ((e.key === "ArrowDown" || e.key === "ArrowUp") && n > 0) {
      e.preventDefault();
      const down = e.key === "ArrowDown";
      if (!shown) {
        setOpen(true);
        setActive(down ? 0 : n - 1);
      } else setActive((a) => (down ? (a + 1) % n : (a - 1 + n) % n));
    } else if (e.key === "Enter" && shown && current >= 0) {
      e.preventDefault(); // pick, don't submit the form
      pick(suggestions[current]);
    } else if (e.key === "Escape" && shown) {
      e.preventDefault();
      close();
    }
  }

  return (
    <>
      <input
        {...a11y(id, error)}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={shown}
        aria-controls={listId}
        aria-activedescendant={shown && current >= 0 ? optionId(current) : undefined}
        autoComplete="off"
        maxLength={80}
        value={value}
        onChange={(e) => {
          onType(e.target.value);
          setOpen(true);
          setActive(-1);
        }}
        onClick={() => setOpen(true)}
        onKeyDown={onKeyDown}
        onFocus={() => clearTimeout(closeTimer.current)}
        // Options keep focus in the box (mousedown is prevented); the delay is a safety net
        onBlur={() => {
          closeTimer.current = setTimeout(close, 150);
        }}
        className={inputClass}
      />

      {/* Always in the DOM so aria-controls points at something; hidden replays the entrance */}
      <div
        hidden={!shown}
        className="enter overflow-hidden rounded-xl border-2 border-edge bg-surface"
      >
        <p
          id={`${listId}-label`}
          className="stamp flex items-center gap-1.5 border-b-2 border-line px-3 py-2 text-ink-2"
        >
          {value.trim() === "" ? (
            <>
              <ClockCounterClockwiseIcon aria-hidden weight="bold" className="size-4" />
              Bought recently
            </>
          ) : (
            "In your shop"
          )}
        </p>
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={`${listId}-label`}
          className="divide-y-2 divide-line"
        >
          {suggestions.map((item, i) => (
            <li
              key={item.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === current}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pick(item)}
              onMouseMove={() => setActive(i)}
              className={`flex min-h-12 cursor-pointer flex-col justify-center px-3 py-2 ${
                i === current ? "bg-accent-soft" : ""
              }`}
            >
              <span className="font-bold break-words text-ink">{item.name}</span>
              <span className="text-sm text-ink-2 tabular-nums">
                {categoryNames.get(item.categoryId)} · {formatQty(item.stock)} {item.unit} ·{" "}
                {formatINR(item.price)}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p aria-live="polite" className="sr-only">
        {shown
          ? `${suggestions.length} ${suggestions.length === 1 ? "suggestion" : "suggestions"}`
          : ""}
      </p>
    </>
  );
}
