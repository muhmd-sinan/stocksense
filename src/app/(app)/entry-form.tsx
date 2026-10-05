"use client";

import {
  ArrowCounterClockwiseIcon,
  ArrowRightIcon,
  BellIcon,
  CheckIcon,
  PencilSimpleIcon,
  PlusIcon,
  QuestionIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";
import { AnimatePresence, type MotionProps } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import { useCallback, useRef, useState, useTransition } from "react";
import {
  Dots,
  FormError,
  inputClass,
  key,
  labelClass,
  primaryButton,
  secondaryButton,
  tagClass,
} from "@/components/field";
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

const EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Steps swap one at a time: the old one leaves quickly, the new one rises in */
const phaseMotion: MotionProps = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EXPO } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15, ease: "easeIn" } },
};

const EXAMPLES = [
  "got 10 sugar",
  "randu coke vittu",
  "set alert for rice to 5",
  "new item Maggi 70g price 14 stock 20",
];

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
  const returning = useRef(false);

  // Each step's heading takes focus when it appears, so keyboard and screen reader users
  // land on the new content. The textarea only takes it back on return, not on first load.
  const focusOnMount = useCallback((el: HTMLElement | null) => el?.focus(), []);
  const textareaRef = useCallback((el: HTMLTextAreaElement | null) => {
    if (el && returning.current) {
      returning.current = false;
      el.focus();
    }
  }, []);

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
    returning.current = true;
    setPhase("input");
  }

  const update = (key: string, patch: Partial<Draft>) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? ({ ...d, ...patch } as Draft) : d)));
  const remove = (key: string) => setDrafts((ds) => ds.filter((d) => d.key !== key));

  return (
    <AnimatePresence mode="wait" initial={false}>
      {phase === "input" && (
        <m.form
          key="input"
          {...phaseMotion}
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault();
            read();
          }}
        >
          <FormError message={error} />
          <div className="flex flex-col gap-2">
            <label htmlFor="entry" className="text-xl font-extrabold text-ink">
              What did you sell or receive?
            </label>
            <textarea
              ref={textareaRef}
              id="entry"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={MAX_ENTRY_CHARS}
              rows={4}
              aria-describedby="entry-hint"
              placeholder="sold 2 matta rice, 1 sugar"
              className={`${inputClass} min-h-36 py-3 text-xl leading-snug`}
            />
            <p id="entry-hint" className="text-sm text-ink-2">
              Type it the way you&apos;d say it, in English or Manglish. Nothing is saved until you
              confirm.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <p id="examples-label" className="text-sm font-bold text-ink-2">
              Examples
            </p>
            <ul aria-labelledby="examples-label" className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => (
                <li key={ex}>
                  <button
                    type="button"
                    onClick={() => setText(ex)}
                    className="min-h-11 rounded-full border-2 border-line bg-surface px-4 text-base font-semibold text-ink transition-[scale,border-color] duration-100 hover:border-edge focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus active:scale-95 motion-reduce:active:scale-100"
                  >
                    {ex}
                  </button>
                </li>
              ))}
            </ul>
          </div>

          <button type="submit" className={primaryButton} disabled={pending || !text.trim()}>
            {pending ? (
              <>
                Reading <Dots />
              </>
            ) : (
              <>
                Read entry <ArrowRightIcon aria-hidden weight="bold" className="size-5" />
              </>
            )}
          </button>
          {pending && <ReadingSkeleton />}
        </m.form>
      )}

      {phase === "review" && (
        <m.section
          key="review"
          {...phaseMotion}
          aria-labelledby="review-heading"
          className="flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1">
            <h2
              id="review-heading"
              ref={focusOnMount}
              tabIndex={-1}
              className="headline text-2xl outline-none"
            >
              Check before saving
            </h2>
            <p className="font-semibold text-ink-2">&ldquo;{text.trim()}&rdquo;</p>
          </div>
          {notice && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-xl border-2 border-key-primary-edge bg-accent-soft p-3 font-semibold text-ink"
            >
              <WarningIcon aria-hidden weight="bold" className="mt-0.5 size-5 shrink-0" />
              <span>{notice}</span>
            </p>
          )}
          <FormError message={error} />

          {drafts.length ? (
            <ul className="flex flex-col">
              <AnimatePresence>
                {drafts.map((d, i) => (
                  <DraftCard
                    key={d.key}
                    index={i}
                    draft={d}
                    check={checks[i]}
                    items={items}
                    categories={categories}
                    editing={editing}
                    onChange={(p) => update(d.key, p)}
                    onRemove={() => remove(d.key)}
                  />
                ))}
              </AnimatePresence>
            </ul>
          ) : (
            <p className="enter rounded-xl border-2 border-dashed border-line p-5 text-lg font-semibold text-ink-2">
              All lines removed. Cancel to start again.
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              type="button"
              className={primaryButton}
              disabled={pending || !entries}
              aria-describedby={openCount ? "open-count" : undefined}
              onClick={confirm}
            >
              {pending ? (
                <>
                  Saving <Dots />
                </>
              ) : (
                <>
                  <CheckIcon aria-hidden weight="bold" className="size-5" />
                  {`Confirm ${drafts.length} ${drafts.length === 1 ? "line" : "lines"}`}
                </>
              )}
            </button>
            {openCount > 0 && (
              <p id="open-count" className="text-center font-bold text-ink">
                Answer the {openCount === 1 ? "question" : `${openCount} questions`} above first
              </p>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className={`${secondaryButton} aria-pressed:translate-y-1 aria-pressed:bg-sunken aria-pressed:shadow-none`}
                aria-pressed={editing}
                onClick={() => setEditing((e) => !e)}
              >
                <PencilSimpleIcon aria-hidden weight="bold" className="size-5" />
                {editing ? "Done editing" : "Edit"}
              </button>
              <button type="button" className={secondaryButton} onClick={() => reset(true)}>
                <ArrowCounterClockwiseIcon aria-hidden weight="bold" className="size-5" />
                Cancel
              </button>
            </div>
          </div>
        </m.section>
      )}

      {phase === "saved" && (
        <m.section
          key="saved"
          {...phaseMotion}
          aria-labelledby="saved-heading"
          className="flex flex-col gap-4"
        >
          <div
            role="status"
            className="flex flex-col gap-4 rounded-xl border-2 border-ok bg-ok-soft p-5"
          >
            {/* The stamp: lands slightly tilted, like a rubber stamp on a bill */}
            <m.h2
              id="saved-heading"
              ref={focusOnMount}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 1.6, rotate: -2 }}
              animate={{ opacity: 1, scale: 1, rotate: -2 }}
              transition={{ duration: 0.45, ease: EXPO, delay: 0.1 }}
              className="headline inline-flex items-center gap-2 self-start rounded-lg border-[3px] border-ok px-3 py-1 text-3xl text-ok uppercase outline-none"
            >
              <CheckIcon aria-hidden weight="bold" className="size-7" />
              Saved
            </m.h2>
            <ul className="flex flex-col gap-1.5 text-lg font-semibold text-ink">
              {saved.map((l, i) => (
                <m.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.35, ease: EXPO, delay: 0.3 + Math.min(i, 8) * 0.06 }}
                  className="flex items-start gap-2"
                >
                  <CheckIcon aria-hidden weight="bold" className="mt-1 size-5 shrink-0 text-ok" />
                  <span>{savedText(l)}</span>
                </m.li>
              ))}
            </ul>
          </div>
          <button type="button" className={primaryButton} onClick={() => reset(false)}>
            <PlusIcon aria-hidden weight="bold" className="size-5" />
            New entry
          </button>
        </m.section>
      )}
    </AnimatePresence>
  );
}

/** Slip-shaped placeholders while the entry is read. Delayed so quick replies never flash them. */
function ReadingSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <p role="status" className="sr-only">
        Reading your entry
      </p>
      {[0, 1].map((i) => (
        <div
          key={i}
          aria-hidden
          style={{ animationDelay: `${180 + i * 70}ms` }}
          className="enter flex flex-col gap-3 rounded-xl border-2 border-line bg-surface p-4"
        >
          <div className="skeleton h-6 w-16 rounded-full" />
          <div className="skeleton h-6 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

type Tone = "sale" | "restock" | "alert" | "create";

function describe(
  d: Draft,
  item?: ItemOption,
): { tag: string; tone: Tone; title: string; detail?: string } {
  const what = item?.name ?? `"${d.text}"`;
  const q = (n: number | null) => (n == null || !Number.isFinite(n) ? "?" : formatQty(n));
  const unit = item ? ` ${item.unit}` : "";
  switch (d.type) {
    case "sale":
      return {
        tag: "Sold",
        tone: "sale",
        title: what,
        detail: `${q(d.quantity)}${unit}${item ? ` at ${formatINR(item.price)} each` : ""}`,
      };
    case "restock":
      return { tag: "Received", tone: "restock", title: what, detail: `${q(d.quantity)}${unit}` };
    case "update_threshold":
      return {
        tag: "Alert level",
        tone: "alert",
        title: what,
        detail: `Alert at ${q(d.threshold)}${unit}`,
      };
    case "create_item": {
      const parts = [
        d.price != null && Number.isFinite(d.price) ? formatINR(d.price) : "",
        d.quantity ? `${formatQty(d.quantity)} in stock` : "",
      ].filter(Boolean);
      return {
        tag: "New item",
        tone: "create",
        title: d.name || "?",
        detail: parts.join(", ") || undefined,
      };
    }
  }
}

function DraftCard({
  index,
  draft: d,
  check,
  items,
  categories,
  editing,
  onChange,
  onRemove,
}: {
  index: number;
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
  const needsAnswer = check.questions.length > 0;
  const open = editing || pinned || needsAnswer;
  const item = "itemId" in d ? items.find((i) => i.id === d.itemId) : undefined;
  const id = (f: string) => `${d.key}-${f}`;
  const meta = describe(d, item);

  return (
    // Removing a line fades it, then collapses its height so the rest close the gap
    <m.li
      initial={{ opacity: 0, y: 14 }}
      animate={{
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: EXPO, delay: Math.min(index, 8) * 0.06 },
      }}
      exit={{
        opacity: 0,
        height: 0,
        marginBottom: 0,
        transition: {
          opacity: { duration: 0.12 },
          height: { duration: 0.25, ease: EXPO, delay: 0.08 },
          marginBottom: { duration: 0.25, ease: EXPO, delay: 0.08 },
        },
      }}
      className="mb-3 overflow-hidden"
    >
      <div
        className={`rounded-xl border-2 bg-surface p-4 ${needsAnswer ? "border-key-primary-edge" : "border-line"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-col items-start gap-1.5">
            <span className={`${tagClass.base} ${tagClass[meta.tone]}`}>{meta.tag}</span>
            <p className="text-xl font-extrabold text-balance break-words">{meta.title}</p>
            {meta.detail && <p className="font-semibold text-ink-2 tabular-nums">{meta.detail}</p>}
          </div>
          <button
            type="button"
            onClick={onRemove}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-ink-2 transition-colors hover:bg-sunken hover:text-danger focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
          >
            <XIcon aria-hidden weight="bold" className="size-5" />
            <span className="sr-only">Remove this line</span>
          </button>
        </div>

        {check.stockBefore != null && check.stockAfter != null && (
          <p className="mt-3 rounded-lg bg-sunken px-3 py-2 font-semibold text-ink-2 tabular-nums">
            Stock <span className="line-through decoration-2">{formatQty(check.stockBefore)}</span>{" "}
            →{" "}
            <span
              key={check.stockAfter}
              className={`bump inline-block text-xl font-extrabold ${check.stockAfter < 0 ? "text-danger" : "text-ink"}`}
            >
              {formatQty(check.stockAfter)}
            </span>
            {item ? ` ${item.unit}` : ""}
          </p>
        )}
        {check.warning && (
          <p className="mt-2 flex items-start gap-2 font-bold text-danger">
            <WarningIcon aria-hidden weight="bold" className="mt-0.5 size-5 shrink-0" />
            <span>{check.warning}</span>
          </p>
        )}
        {needsAnswer && (
          <ul className="mt-3 flex flex-col gap-1 rounded-lg bg-accent-soft px-3 py-2 font-bold text-ink">
            {check.questions.map((q) => (
              <li key={q} className="flex items-start gap-2">
                <QuestionIcon aria-hidden weight="bold" className="mt-0.5 size-5 shrink-0" />
                <span>{q}</span>
              </li>
            ))}
          </ul>
        )}

        <AnimatePresence initial={false}>
          {open && (
            <m.div
              key="fields"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: EXPO }}
              className="-mx-2 overflow-hidden px-2"
            >
              <div className="flex flex-col gap-3 pt-3 pb-2">
                {d.type !== "create_item" && (
                  <div className="flex flex-col gap-1.5">
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
                    <div className="flex flex-col gap-1.5">
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
                      <div className="flex flex-col gap-1.5">
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
            </m.div>
          )}
        </AnimatePresence>

        {d.type === "sale" && check.oversell && (
          <label className="mt-3 flex min-h-12 items-center gap-3 rounded-xl border-2 border-danger bg-danger-soft px-3 font-bold text-ink">
            <input
              type="checkbox"
              className="size-6 shrink-0 accent-danger"
              checked={d.allowOversell}
              onChange={(e) => onChange({ allowOversell: e.target.checked })}
            />
            Yes, I sold this many. Correct the stock.
          </label>
        )}
      </div>
    </m.li>
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
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {/* Uncontrolled so partial input like "1." isn't rewritten while typing */}
      <input
        id={id}
        inputMode="decimal"
        defaultValue={value == null ? "" : String(value)}
        onChange={(e) => onChange(num(e.target.value))}
        className={`${inputClass} tabular-nums`}
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
    <div className="flex flex-col gap-1.5">
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
  return (
    <AnimatePresence>
      {lines.length > 0 && (
        <m.div
          key="toast"
          role="alert"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EXPO } }}
          exit={{ opacity: 0, y: 16, transition: { duration: 0.18 } }}
          className="fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-30 mx-auto w-[calc(100%-2rem)] max-w-2xl rounded-xl border-2 border-danger bg-surface p-4 shadow-[0_6px_0_0_var(--danger)]"
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
