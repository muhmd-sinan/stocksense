"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { FormError, primaryButton, secondaryButton } from "@/components/field";
import type { AppliedLine } from "@/lib/data/entries";
import { crossedThreshold } from "@/lib/forecast";
import { formatINR, formatQty } from "@/lib/format";
import {
  checkDrafts,
  toEntries,
  type CategoryOption,
  type Draft,
  type ItemOption,
  type LineCheck,
} from "@/lib/parser/draft";
import { MAX_ENTRY_CHARS } from "@/lib/parser/prompt";
import { applyEntryAction, parseEntryAction } from "./entry-actions";

type Phase = "input" | "review" | "saved";

const inputClass =
  "min-h-12 w-full rounded-lg border-2 border-slate-400 bg-white px-3 text-lg text-slate-950 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/30";
const labelClass = "text-base font-semibold text-slate-900";

/** "" → null, "abc" → NaN (caught by checks), "2" → 2 */
const num = (v: string) => (v.trim() === "" ? null : Number(v.trim()));

export function EntryForm({ categories }: { categories: CategoryOption[] }) {
  const [crossed, setCrossed] = useState<AppliedLine[]>([]);
  return (
    <>
      <EntryFlow categories={categories} onCrossed={setCrossed} />
      <LowStockToast lines={crossed} onDismiss={() => setCrossed([])} />
    </>
  );
}

function EntryFlow({
  categories,
  onCrossed,
}: {
  categories: CategoryOption[];
  onCrossed: (lines: AppliedLine[]) => void;
}) {
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("input");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState<string>();
  const [error, setError] = useState<string>();
  const [saved, setSaved] = useState<AppliedLine[]>([]);
  const [pending, startTransition] = useTransition();

  const checks = checkDrafts(drafts, items);
  const entries = toEntries(drafts, items);
  const openCount = checks.filter((c) => c.questions.length).length;

  function read() {
    setError(undefined);
    startTransition(async () => {
      const res = await parseEntryAction(text);
      if (!res.ok) return setError(res.error);
      setDrafts(res.drafts);
      setItems(res.items);
      setNotice(res.notice);
      setEditing(false);
      setPhase("review");
    });
  }

  function confirm() {
    if (!entries) return;
    setError(undefined);
    startTransition(async () => {
      const res = await applyEntryAction(entries, text);
      if (!res.ok) return setError(res.error);
      setSaved(res.lines);
      onCrossed(crossedThreshold(res.lines));
      setPhase("saved");
    });
  }

  function reset(keepText: boolean) {
    if (!keepText) setText("");
    setDrafts([]);
    setError(undefined);
    setNotice(undefined);
    setPhase("input");
  }

  const update = (key: string, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? ({ ...d, ...patch } as Draft) : d)));
  const remove = (key: string) => setDrafts((ds) => ds.filter((d) => d.key !== key));

  if (phase === "saved")
    return (
      <section aria-labelledby="saved-heading" className="flex flex-col gap-4">
        <div role="status" className="rounded-lg border-2 border-emerald-700 bg-emerald-50 p-4">
          <h2 id="saved-heading" className="text-xl font-bold text-emerald-950">
            Saved
          </h2>
          <ul className="mt-2 flex flex-col gap-1 text-lg text-slate-900">
            {saved.map((l, i) => (
              <li key={i}>{savedText(l)}</li>
            ))}
          </ul>
        </div>
        <button type="button" className={primaryButton} onClick={() => reset(false)}>
          New entry
        </button>
      </section>
    );

  if (phase === "input")
    return (
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          read();
        }}
      >
        <FormError message={error} />
        <div className="flex flex-col gap-1">
          <label htmlFor="entry" className={labelClass}>
            What did you sell or receive?
          </label>
          <textarea
            id="entry"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={MAX_ENTRY_CHARS}
            rows={4}
            aria-describedby="entry-hint"
            placeholder="sold 2 matta rice, 1 sugar"
            className={`${inputClass} py-2`}
          />
          <p id="entry-hint" className="text-sm text-slate-700">
            e.g. &ldquo;got 10 sugar&rdquo;, &ldquo;randu coke vittu&rdquo;, &ldquo;set alert for
            rice to 5&rdquo;, &ldquo;new item Maggi 70g price 14 stock 20&rdquo;. Nothing is saved
            until you confirm.
          </p>
        </div>
        <button type="submit" className={primaryButton} disabled={pending || !text.trim()}>
          {pending ? "Reading…" : "Read entry"}
        </button>
      </form>
    );

  return (
    <section aria-labelledby="review-heading" className="flex flex-col gap-4">
      <div>
        <h2 id="review-heading" className="text-xl font-bold text-slate-950">
          Check before saving
        </h2>
        <p className="text-slate-800">&ldquo;{text.trim()}&rdquo;</p>
      </div>
      {notice && (
        <p
          role="status"
          className="rounded-lg border-2 border-amber-600 bg-amber-50 p-3 text-amber-950"
        >
          {notice}
        </p>
      )}
      <FormError message={error} />

      {drafts.length ? (
        <ul className="flex flex-col gap-3">
          {drafts.map((d, i) => (
            <DraftCard
              key={d.key}
              draft={d}
              check={checks[i]}
              items={items}
              categories={categories}
              editing={editing}
              onChange={(p) => update(d.key, p)}
              onRemove={() => remove(d.key)}
            />
          ))}
        </ul>
      ) : (
        <p className="text-lg text-slate-800">All lines removed. Cancel to start again.</p>
      )}

      <div className="flex flex-col gap-2">
        <button
          type="button"
          className={primaryButton}
          disabled={pending || !entries}
          aria-describedby={openCount ? "open-count" : undefined}
          onClick={confirm}
        >
          {pending
            ? "Saving…"
            : `Confirm ${drafts.length} ${drafts.length === 1 ? "line" : "lines"}`}
        </button>
        {openCount > 0 && (
          <p id="open-count" className="text-center font-medium text-amber-900">
            Answer the {openCount === 1 ? "question" : `${openCount} questions`} above first
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            className={secondaryButton}
            aria-pressed={editing}
            onClick={() => setEditing((e) => !e)}
          >
            {editing ? "Done editing" : "Edit"}
          </button>
          <button type="button" className={secondaryButton} onClick={() => reset(true)}>
            Cancel
          </button>
        </div>
      </div>
    </section>
  );
}

function DraftCard({
  draft: d,
  check,
  items,
  categories,
  editing,
  onChange,
  onRemove,
}: {
  draft: Draft;
  check: LineCheck;
  items: ItemOption[];
  categories: CategoryOption[];
  editing: boolean;
  onChange: (p: Partial<Draft>) => void;
  onRemove: () => void;
}) {
  // Stays open once it needed an answer, so fields don't vanish mid-typing
  const [pinned] = useState(check.questions.length > 0);
  const open = editing || pinned || check.questions.length > 0;
  const item = "itemId" in d ? items.find((i) => i.id === d.itemId) : undefined;
  const id = (f: string) => `${d.key}-${f}`;

  return (
    <li className="rounded-lg border-2 border-slate-300 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-lg font-semibold text-slate-950">{summary(d, item)}</p>
        <button
          type="button"
          onClick={onRemove}
          className="min-h-11 shrink-0 rounded-lg px-2 font-semibold text-red-800 underline underline-offset-2 hover:bg-red-50"
        >
          Remove<span className="sr-only"> this line</span>
        </button>
      </div>
      {check.stockBefore != null && check.stockAfter != null && (
        <p className="text-slate-800">
          Stock {formatQty(check.stockBefore)} → {formatQty(check.stockAfter)}
          {item ? ` ${item.unit}` : ""}
        </p>
      )}
      {check.warning && <p className="mt-1 font-medium text-red-800">{check.warning}</p>}
      {check.questions.length > 0 && (
        <ul className="mt-2 list-disc pl-5 font-medium text-amber-900">
          {check.questions.map((q) => (
            <li key={q}>{q}</li>
          ))}
        </ul>
      )}

      {open && (
        <div className="mt-3 flex flex-col gap-3">
          {d.type !== "create_item" && (
            <div className="flex flex-col gap-1">
              <label htmlFor={id("item")} className={labelClass}>
                Item
              </label>
              <select
                id={id("item")}
                value={d.itemId ?? ""}
                onChange={(e) => onChange({ itemId: e.target.value || null })}
                className={inputClass}
              >
                <option value="">Choose an item</option>
                {d.candidates.length > 0 && (
                  <optgroup label="Best matches">
                    {d.candidates.map((cid) => {
                      const c = items.find((i) => i.id === cid);
                      return (
                        c && (
                          <option key={cid} value={cid}>
                            {c.name}
                          </option>
                        )
                      );
                    })}
                  </optgroup>
                )}
                <optgroup label="All items">
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>
          )}

          {(d.type === "sale" || d.type === "restock") && (
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label htmlFor={id("type")} className={labelClass}>
                  Type
                </label>
                <select
                  id={id("type")}
                  value={d.type}
                  onChange={(e) => onChange({ type: e.target.value as "sale" | "restock" })}
                  className={inputClass}
                >
                  <option value="sale">Sold</option>
                  <option value="restock">Received</option>
                </select>
              </div>
              <NumberInput
                id={id("qty")}
                label={`Quantity${item ? ` (${item.unit})` : ""}`}
                value={d.quantity}
                onChange={(quantity) => onChange({ quantity })}
              />
            </div>
          )}

          {d.type === "update_threshold" && (
            <NumberInput
              id={id("threshold")}
              label="Alert when stock is at or below"
              value={d.threshold}
              onChange={(threshold) => onChange({ threshold })}
            />
          )}

          {d.type === "create_item" && (
            <>
              <TextInput
                id={id("name")}
                label="Name"
                value={d.name}
                onChange={(name) => onChange({ name })}
              />
              <div className="grid grid-cols-2 gap-3">
                <TextInput
                  id={id("unit")}
                  label="Unit"
                  value={d.unit}
                  onChange={(unit) => onChange({ unit })}
                />
                <NumberInput
                  id={id("price")}
                  label="Price (₹)"
                  value={d.price}
                  onChange={(price) => onChange({ price })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumberInput
                  id={id("stock")}
                  label="Opening stock"
                  value={d.quantity}
                  onChange={(q) => onChange({ quantity: q ?? 0 })}
                />
                <div className="flex flex-col gap-1">
                  <label htmlFor={id("cat")} className={labelClass}>
                    Category
                  </label>
                  <select
                    id={id("cat")}
                    value={d.categoryId ?? ""}
                    onChange={(e) => onChange({ categoryId: e.target.value || null })}
                    className={inputClass}
                  >
                    <option value="">Choose</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {d.type === "sale" && check.oversell && (
        <label className="mt-3 flex min-h-12 items-center gap-3 rounded-lg bg-red-50 px-3 font-semibold text-red-950">
          <input
            type="checkbox"
            className="size-6 accent-red-800"
            checked={d.allowOversell}
            onChange={(e) => onChange({ allowOversell: e.target.checked })}
          />
          Yes, I sold this many. Correct the stock.
        </label>
      )}
    </li>
  );
}

function NumberInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {/* Uncontrolled so partial input like "1." isn't rewritten while typing */}
      <input
        id={id}
        inputMode="decimal"
        defaultValue={value == null ? "" : String(value)}
        onChange={(e) => onChange(num(e.target.value))}
        className={inputClass}
      />
    </div>
  );
}

function TextInput({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputClass}
      />
    </div>
  );
}

function summary(d: Draft, item?: ItemOption): string {
  const what = item?.name ?? `"${d.text}"`;
  const q = (n: number | null) => (n == null || !Number.isFinite(n) ? "?" : formatQty(n));
  switch (d.type) {
    case "sale":
      return `Sold ${q(d.quantity)} × ${what}${item ? ` (${formatINR(item.price)} each)` : ""}`;
    case "restock":
      return `Received ${q(d.quantity)} × ${what}`;
    case "update_threshold":
      return `Alert for ${what} at ${q(d.threshold)}`;
    case "create_item":
      return `New item: ${d.name || "?"}${d.price != null && Number.isFinite(d.price) ? `, ${formatINR(d.price)}` : ""}${d.quantity ? `, ${formatQty(d.quantity)} in stock` : ""}`;
  }
}

function savedText(l: AppliedLine): string {
  const q = formatQty(l.quantity);
  switch (l.type) {
    case "sale":
      return `Sold ${q} ${l.unit} ${l.name}. ${formatQty(l.stockAfter)} left.`;
    case "restock":
      return `Received ${q} ${l.unit} ${l.name}. Now ${formatQty(l.stockAfter)}.`;
    case "update_threshold":
      return `Alert for ${l.name} set to ${q}.`;
    case "create_item":
      return `Added ${l.name} with ${q} in stock.`;
  }
}

/** Stays until dismissed (no auto-hide, so it can't vanish before it's read). */
function LowStockToast({ lines, onDismiss }: { lines: AppliedLine[]; onDismiss: () => void }) {
  if (!lines.length) return null;
  return (
    <div
      role="alert"
      className="fixed inset-x-0 bottom-20 z-20 mx-auto w-[calc(100%-2rem)] max-w-2xl rounded-lg border-2 border-red-800 bg-red-50 p-4 shadow-lg"
    >
      <p className="font-bold text-red-950">
        {lines.length === 1 ? "Now low on stock:" : `${lines.length} items now low on stock:`}
      </p>
      <ul className="mt-1 text-red-950">
        {lines.map((l) => (
          <li key={l.itemId}>
            {l.name}: {formatQty(l.stockAfter)} {l.unit} left (alert at {formatQty(l.threshold)})
          </li>
        ))}
      </ul>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Link
          href="/alerts"
          className="flex min-h-11 items-center justify-center rounded-lg bg-red-800 font-semibold text-white hover:bg-red-900"
        >
          See alerts
        </Link>
        <button
          type="button"
          onClick={onDismiss}
          className="min-h-11 rounded-lg border-2 border-red-800 bg-white font-semibold text-red-900 hover:bg-red-100"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
