"use client";

import { PlusIcon, TagIcon } from "@phosphor-icons/react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { useState, useTransition } from "react";
import {
  Dots,
  FormError,
  inputClass,
  key,
  primaryButton,
  tagClass,
  textLink,
} from "@/components/field";
import type { AppliedLine } from "@/lib/data/entries";
import {
  MAX_ROWS,
  NEW_ITEM_UNIT,
  checkBought,
  emptyBought,
  filledCount,
  nextKey,
  parseNum,
  toBoughtEntries,
  withName,
  type BoughtCheck,
  type BoughtRow,
  type CategoryOption,
  type EntryItem,
} from "@/lib/entry-rows";
import { formatINR, formatQty } from "@/lib/format";
import { saveBoughtAction } from "./entry-actions";
import { Cell, RemoveButton, SavedNote, a11y, rowMotion, useFocusRequest } from "./entry-parts";
import { NameCombobox } from "./name-combobox";

/** Bought tab: name, category, price, quantity per line. Known names restock, new names are added. */
export function BoughtPanel({
  items,
  categories,
}: {
  items: EntryItem[];
  categories: CategoryOption[];
}) {
  const [rows, setRows] = useState<BoughtRow[]>([emptyBought("b0")]);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<AppliedLine[]>([]);
  const [pending, startTransition] = useTransition();
  const [scope, focus] = useFocusRequest<HTMLFormElement>();

  const checks = checkBought(rows, items);
  const count = filledCount(checks);
  const categoryNames = new Map(categories.map((c) => [c.id, c.name]));

  function edit(rowKey: string, patch: Partial<BoughtRow>) {
    setRows((rs) => rs.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)));
    setSaved([]);
    setError(undefined);
  }
  function add() {
    const k = nextKey();
    setRows((rs) => [...rs, emptyBought(k)]);
    focus(`#${k}-name`);
  }
  function remove(rowKey: string) {
    const i = rows.findIndex((r) => r.key === rowKey);
    const next = rows[i + 1] ?? rows[i - 1];
    setRows((rs) => rs.filter((r) => r.key !== rowKey));
    if (next) focus(`#${next.key}-name`);
  }

  function save() {
    const entries = toBoughtEntries(rows, items);
    if (!entries) {
      setShowErrors(true);
      setError(count ? "Fix the lines marked in red." : "Enter a name, price and quantity first.");
      focus('[aria-invalid="true"]', 'input[id$="-name"]');
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const res = await saveBoughtAction(entries);
      if (!res.ok) return setError(res.error);
      const k = nextKey();
      setRows([emptyBought(k)]);
      setShowErrors(false);
      setSaved(res.lines);
      focus(`#${k}-name`);
    });
  }

  if (!categories.length)
    return (
      <div className="flex flex-col items-start gap-2 rounded-xl border-2 border-dashed border-line p-6">
        <TagIcon aria-hidden weight="duotone" className="size-10 text-ink-2" />
        <p className="text-lg font-extrabold">Add a category first.</p>
        <p className="text-ink-2">
          Every item belongs to one.{" "}
          <Link href="/categories" transitionTypes={["nav-forward"]} className={textLink}>
            Go to Categories
          </Link>
        </p>
      </div>
    );

  return (
    <form
      ref={scope}
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="flex flex-col gap-4"
    >
      <div>
        <SavedNote lines={saved} />
        <ul
          aria-label="Bought lines"
          className="divide-y-2 divide-line rounded-xl border-2 border-line bg-surface"
        >
          <AnimatePresence initial={false}>
            {rows.map((r, i) => (
              <BoughtLine
                key={r.key}
                index={i}
                row={r}
                check={checks[i]}
                showErrors={showErrors}
                items={items}
                categories={categories}
                categoryNames={categoryNames}
                removable={rows.length > 1}
                onChange={(p) => edit(r.key, p)}
                onRemove={() => remove(r.key)}
              />
            ))}
          </AnimatePresence>
        </ul>
      </div>

      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          onClick={add}
          disabled={rows.length >= MAX_ROWS}
          className={key("secondary", "sm")}
        >
          <PlusIcon aria-hidden weight="bold" className="size-5" />
          Add row
        </button>
        <p className="text-sm text-ink-2">
          Price is the selling price, per unit. New items are counted in {NEW_ITEM_UNIT}; change the
          unit or alert level on the item page.
        </p>
      </div>

      <FormError message={error} />
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? (
          <>
            Saving <Dots />
          </>
        ) : count > 1 ? (
          `Save ${count} purchases`
        ) : (
          "Save purchase"
        )}
      </button>
      <p className="text-center text-sm text-ink-2">The date and time are saved automatically.</p>
    </form>
  );
}

function BoughtLine({
  index,
  row: r,
  check: c,
  showErrors,
  items,
  categories,
  categoryNames,
  removable,
  onChange,
  onRemove,
}: {
  index: number;
  row: BoughtRow;
  check: BoughtCheck;
  showErrors: boolean;
  items: EntryItem[];
  categories: CategoryOption[];
  categoryNames: Map<string, string>;
  removable: boolean;
  onChange: (p: Partial<BoughtRow>) => void;
  onRemove: () => void;
}) {
  const err = showErrors ? c.errors : {};
  const id = (f: string) => `${r.key}-${f}`;
  const newPrice = parseNum(r.price);
  const priceNote =
    c.match && newPrice != null && Number.isFinite(newPrice) && newPrice !== c.match.price
      ? `, price ${formatINR(c.match.price)} → ${formatINR(newPrice)}`
      : "";

  return (
    <m.li {...rowMotion} className="overflow-hidden">
      <div className="p-4">
        {/* Phone: name + remove, category, price beside quantity. Wider: one table row. */}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3rem] gap-3 [grid-template-areas:'name_name_x'_'cat_cat_cat'_'price_qty_qty'_'info_info_info'] @min-[40rem]:grid-cols-[minmax(0,1fr)_8.5rem_6.5rem_5.5rem_3rem] @min-[40rem]:[grid-template-areas:'name_cat_price_qty_x'_'info_info_info_info_info']">
          <Cell id={id("name")} label="Name" error={err.name} className="[grid-area:name]">
            {/* Suggests items already in the shop; a known name brings its category and price */}
            <NameCombobox
              id={id("name")}
              value={r.name}
              error={err.name}
              items={items}
              categoryNames={categoryNames}
              onType={(name) => onChange(withName(r, name, items))}
              onPick={(item) => onChange(withName(r, item.name, items))}
            />
          </Cell>

          {removable && (
            <div className="[grid-area:x]">
              <RemoveButton label={`Remove line ${index + 1}`} onClick={onRemove} />
            </div>
          )}

          <Cell
            id={id("category")}
            label="Category"
            error={err.categoryId}
            className="[grid-area:cat]"
          >
            {/* A restock keeps the item's category */}
            <select
              {...a11y(id("category"), err.categoryId)}
              value={c.match ? c.match.categoryId : r.categoryId}
              disabled={Boolean(c.match)}
              onChange={(e) => onChange({ categoryId: e.target.value })}
              className={`${inputClass} disabled:border-line disabled:bg-sunken`}
            >
              <option value="">Choose</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </Cell>

          <Cell id={id("price")} label="Price (₹)" error={err.price} className="[grid-area:price]">
            <input
              {...a11y(id("price"), err.price)}
              inputMode="decimal"
              autoComplete="off"
              value={r.price}
              onChange={(e) => onChange({ price: e.target.value, priceFrom: undefined })}
              className={`${inputClass} tabular-nums`}
            />
          </Cell>

          <Cell id={id("qty")} label="Quantity" error={err.quantity} className="[grid-area:qty]">
            <input
              {...a11y(id("qty"), err.quantity)}
              inputMode="decimal"
              autoComplete="off"
              value={r.quantity}
              onChange={(e) => onChange({ quantity: e.target.value })}
              className={`${inputClass} tabular-nums`}
            />
          </Cell>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-semibold text-ink-2 tabular-nums [grid-area:info]">
            {!r.name.trim() ? (
              <p>Start typing: items you&apos;ve bought before are suggested.</p>
            ) : c.match ? (
              <>
                <span className={`${tagClass.base} ${tagClass.restock}`}>Restock</span>
                <p>
                  {c.stockBefore != null && c.stockAfter != null ? (
                    <>
                      Stock {formatQty(c.stockBefore)} →{" "}
                      <span
                        key={c.stockAfter}
                        className="bump inline-block font-extrabold text-ink"
                      >
                        {formatQty(c.stockAfter)}
                      </span>{" "}
                      {c.match.unit}
                    </>
                  ) : (
                    `${formatQty(c.match.stock)} ${c.match.unit} in stock`
                  )}
                  {priceNote}
                </p>
              </>
            ) : (
              <>
                <span className={`${tagClass.base} ${tagClass.create}`}>New item</span>
                <p>
                  Counted in {NEW_ITEM_UNIT}
                  {c.stockAfter != null && `, starts at ${formatQty(c.stockAfter)}`}
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </m.li>
  );
}
