"use client";

import { PackageIcon, PlusIcon, WarningIcon } from "@phosphor-icons/react";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import { useState, useTransition } from "react";
import { Dots, FormError, inputClass, key, primaryButton } from "@/components/field";
import type { AppliedLine } from "@/lib/data/entries";
import {
  MAX_ROWS,
  checkSold,
  emptySold,
  filledCount,
  nextKey,
  soldTotal,
  toSoldEntries,
  type CategoryOption,
  type EntryItem,
  type SoldCheck,
  type SoldRow,
} from "@/lib/entry-rows";
import { formatINR, formatQty } from "@/lib/format";
import { saveSoldAction } from "./entry-actions";
import { Cell, RemoveButton, SavedNote, a11y, rowMotion, useFocusRequest } from "./entry-parts";

/** Sold tab: category → product → quantity per line, saved together */
export function SoldPanel({
  items,
  categories,
  onSaved,
  onGoToBought,
}: {
  items: EntryItem[];
  categories: CategoryOption[];
  onSaved: (lines: AppliedLine[]) => void;
  onGoToBought: () => void;
}) {
  const [rows, setRows] = useState<SoldRow[]>([emptySold("s0")]);
  const [showErrors, setShowErrors] = useState(false);
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<AppliedLine[]>([]);
  const [pending, startTransition] = useTransition();
  const [scope, focus] = useFocusRequest<HTMLFormElement>();

  const checks = checkSold(rows, items);
  const count = filledCount(checks);
  const total = soldTotal(checks);

  function edit(rowKey: string, patch: Partial<SoldRow>) {
    setRows((rs) => rs.map((r) => (r.key === rowKey ? { ...r, ...patch } : r)));
    setSaved([]);
    setError(undefined);
  }
  function add() {
    const k = nextKey();
    setRows((rs) => [...rs, emptySold(k)]);
    focus(`#${k}-category`);
  }
  function remove(rowKey: string) {
    const i = rows.findIndex((r) => r.key === rowKey);
    const next = rows[i + 1] ?? rows[i - 1];
    setRows((rs) => rs.filter((r) => r.key !== rowKey));
    if (next) focus(`#${next.key}-category`);
  }

  function save() {
    const entries = toSoldEntries(rows, items);
    if (!entries) {
      setShowErrors(true);
      setError(count ? "Fix the lines marked in red." : "Choose a product and quantity first.");
      focus('[aria-invalid="true"]', 'select[id$="-item"]');
      return;
    }
    setError(undefined);
    startTransition(async () => {
      const res = await saveSoldAction(entries);
      if (!res.ok) return setError(res.error);
      const k = nextKey();
      setRows([emptySold(k)]);
      setShowErrors(false);
      setSaved(res.lines);
      onSaved(res.lines);
      focus(`#${k}-category`);
    });
  }

  if (!items.length)
    return (
      <div className="flex flex-col items-start gap-2 rounded-xl border-2 border-dashed border-line p-6">
        <PackageIcon aria-hidden weight="duotone" className="size-10 text-ink-2" />
        <p className="text-lg font-extrabold">Nothing to sell yet.</p>
        <p className="text-ink-2">Add what you bought first, then sell it from here.</p>
        <button type="button" onClick={onGoToBought} className={`${key("secondary", "sm")} mt-2`}>
          Go to Bought
        </button>
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
          aria-label="Sold lines"
          className="divide-y-2 divide-line rounded-xl border-2 border-line bg-surface"
        >
          <AnimatePresence initial={false}>
            {rows.map((r, i) => (
              <SoldLine
                key={r.key}
                index={i}
                row={r}
                check={checks[i]}
                showErrors={showErrors}
                items={items}
                categories={categories}
                removable={rows.length > 1}
                onChange={(p) => edit(r.key, p)}
                onRemove={() => remove(r.key)}
              />
            ))}
          </AnimatePresence>
        </ul>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={add}
          disabled={rows.length >= MAX_ROWS}
          className={key("secondary", "sm")}
        >
          <PlusIcon aria-hidden weight="bold" className="size-5" />
          Add row
        </button>
        <p className="flex items-baseline gap-2 font-bold text-ink-2">
          Total
          <span className="headline text-2xl text-ink tabular-nums">{formatINR(total)}</span>
        </p>
      </div>

      <FormError message={error} />
      <button type="submit" disabled={pending} className={primaryButton}>
        {pending ? (
          <>
            Saving <Dots />
          </>
        ) : count > 1 ? (
          `Save ${count} sales`
        ) : (
          "Save sale"
        )}
      </button>
      <p className="text-center text-sm text-ink-2">The date and time are saved automatically.</p>
    </form>
  );
}

function SoldLine({
  index,
  row: r,
  check: c,
  showErrors,
  items,
  categories,
  removable,
  onChange,
  onRemove,
}: {
  index: number;
  row: SoldRow;
  check: SoldCheck;
  showErrors: boolean;
  items: EntryItem[];
  categories: CategoryOption[];
  removable: boolean;
  onChange: (p: Partial<SoldRow>) => void;
  onRemove: () => void;
}) {
  const err = showErrors ? c.errors : {};
  const id = (f: string) => `${r.key}-${f}`;
  const option = (i: EntryItem) => (
    <option key={i.id} value={i.id}>
      {i.name} ({formatQty(i.stock)} {i.unit})
    </option>
  );

  return (
    <m.li {...rowMotion} className="overflow-hidden">
      <div className="p-4">
        {/* Phone: category + remove, product, quantity beside its stock. Wider: one table row. */}
        <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3rem] gap-3 [grid-template-areas:'cat_cat_x'_'item_item_item'_'qty_info_info'] @min-[36rem]:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_6.5rem_3rem] @min-[36rem]:[grid-template-areas:'cat_item_qty_x'_'info_info_info_info']">
          <Cell id={id("category")} label="Category" className="[grid-area:cat]">
            <select
              {...a11y(id("category"))}
              value={r.categoryId}
              onChange={(e) => {
                const categoryId = e.target.value;
                const keep = !categoryId || c.item?.categoryId === categoryId;
                onChange(keep ? { categoryId } : { categoryId, itemId: "", allowOversell: false });
              }}
              className={inputClass}
            >
              <option value="">All categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </Cell>

          {removable && (
            <div className="[grid-area:x]">
              <RemoveButton label={`Remove line ${index + 1}`} onClick={onRemove} />
            </div>
          )}

          <Cell id={id("item")} label="Product" error={err.itemId} className="[grid-area:item]">
            <select
              {...a11y(id("item"), err.itemId)}
              value={r.itemId}
              onChange={(e) => {
                const item = items.find((i) => i.id === e.target.value);
                onChange({
                  itemId: e.target.value,
                  allowOversell: false,
                  ...(item && { categoryId: item.categoryId }),
                });
              }}
              className={inputClass}
            >
              <option value="">Choose a product</option>
              {r.categoryId
                ? items.filter((i) => i.categoryId === r.categoryId).map(option)
                : categories.map((cat) => {
                    const group = items.filter((i) => i.categoryId === cat.id);
                    return (
                      group.length > 0 && (
                        <optgroup key={cat.id} label={cat.name}>
                          {group.map(option)}
                        </optgroup>
                      )
                    );
                  })}
            </select>
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

          <p className="mt-7.5 flex min-h-12 items-center self-start font-semibold text-ink-2 tabular-nums [grid-area:info] @min-[36rem]:mt-0 @min-[36rem]:min-h-0">
            {c.item && c.stockBefore != null && c.stockAfter != null ? (
              <span>
                Stock <span className="line-through decoration-2">{formatQty(c.stockBefore)}</span>{" "}
                →{" "}
                <span
                  key={c.stockAfter}
                  className={`bump inline-block font-extrabold ${c.oversell ? "text-danger" : "text-ink"}`}
                >
                  {formatQty(c.stockAfter)}
                </span>{" "}
                {c.item.unit}
                <span className="text-ink">, {formatINR(c.amount)}</span>
              </span>
            ) : c.item ? (
              `${formatQty(c.item.stock)} ${c.item.unit} in stock, ${formatINR(c.item.price)} each`
            ) : (
              "Pick a product to see its stock"
            )}
          </p>
        </div>

        {c.oversell && c.item && (
          <div className="mt-3 flex flex-col gap-2 rounded-xl border-2 border-danger bg-danger-soft p-3">
            <p className="flex items-start gap-2 font-bold text-ink">
              <WarningIcon
                aria-hidden
                weight="bold"
                className="mt-0.5 size-5 shrink-0 text-danger"
              />
              <span>
                Only {formatQty(c.stockBefore)} {c.item.unit} in stock. Saving corrects the count
                and leaves 0.
              </span>
            </p>
            <label className="flex min-h-11 items-center gap-3 font-bold text-ink">
              <input
                type="checkbox"
                {...a11y(id("oversell"), err.oversell)}
                checked={r.allowOversell}
                onChange={(e) => onChange({ allowOversell: e.target.checked })}
                className="size-6 shrink-0 accent-danger"
              />
              Yes, I sold this many
            </label>
            {err.oversell && (
              <p id={`${id("oversell")}-error`} className="text-sm font-extrabold text-ink">
                {err.oversell}
              </p>
            )}
          </div>
        )}
      </div>
    </m.li>
  );
}
