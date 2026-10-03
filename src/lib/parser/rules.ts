// Deterministic fallback parser, used when no LLM key is set or the LLM fails.
// Handles the common shapes: "sold 2 matta rice", "rice x2, sugar 3", "got 10 sugar",
// "new item Maggi 70g price 14 stock 20", "set alert for rice to 5", plus some Manglish verbs.

import { isSizeToken } from "./match";
import { parseResultSchema, type ParsedAction } from "./schema";

type Kind = "sale" | "restock" | "create" | "threshold";

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, dozen: 12, half: 0.5,
  oru: 1, onnu: 1, randu: 2, rand: 2, moonu: 3, munnu: 3, naalu: 4, nalu: 4, anchu: 5,
  aaru: 6, ezhu: 7, ettu: 8, onpathu: 9, pathu: 10,
}; // prettier-ignore

const SALE = new Set(["sold", "sell", "sells", "sale", "sales", "vittu", "vitu", "koduthu"]);
const RESTOCK = new Set([
  "restock", "restocked", "received", "receive", "got", "bought", "purchased", "arrived",
  "came", "add", "added", "vannu", "vangi", "vaangi", "eduthu",
]); // prettier-ignore
const CREATE = new Set(["new", "puthiya", "create"]);
const THRESHOLD = new Set(["alert", "threshold", "reorder", "minimum", "min", "limit"]);

const FILLER = new Set([
  "of", "x", "the", "pack", "packs", "packet", "packets", "pkt", "pkts", "pcs", "pc", "piece",
  "pieces", "nos", "bottle", "bottles", "bag", "bags", "box", "boxes", "unit", "units", "today",
  "just", "i", "we", "have", "has", "been", "to", "more", "some", "also", "then", "please",
  "pls", "stock", "in", "is", "was", "were", "and", "item", "items", "each", "per", "only",
]); // prettier-ignore
const THRESHOLD_FILLER = new Set([
  "set", "for", "to", "at", "of", "as", "is", "level", "low", "stock", "when", "below", "on",
  "the", "me", "change", "make", "update", "reaches", "goes", "under",
]); // prettier-ignore
const COUNT_UNITS: Record<string, string> = {
  pack: "pack", packs: "pack", packet: "packet", packets: "packet", pkt: "packet",
  pcs: "pcs", pc: "pcs", piece: "pcs", pieces: "pcs", bottle: "bottle", bottles: "bottle",
  bag: "bag", bags: "bag", box: "box", boxes: "box", tin: "tin", tins: "tin", nos: "pcs",
}; // prettier-ignore
const SIZE_UNITS: Record<string, string> = {
  kg: "kg", kgs: "kg", g: "g", gm: "g", gms: "g", gram: "g", grams: "g",
  ml: "ml", l: "l", ltr: "l", litre: "l", liter: "l", litres: "l", liters: "l",
}; // prettier-ignore
const PRICE_WORDS = new Set(["price", "rs", "mrp", "rupees", "rupee"]);
const ATTR_START = new Set([
  "price",
  "rs",
  "mrp",
  "stock",
  "qty",
  "quantity",
  "opening",
  "unit",
  "category",
  "cat",
]);

const NUM_RE = /^\d+(\.\d+)?$/;

export function qtyOf(t: string | undefined): number | null {
  if (!t) return null;
  if (NUM_RE.test(t)) return Number(t);
  const m = /^x(\d+(?:\.\d+)?)$|^(\d+(?:\.\d+)?)x$/.exec(t);
  if (m) return Number(m[1] ?? m[2]);
  return NUMBER_WORDS[t] ?? null;
}

/** Lowercase tokens; "5 kg" and "5kgs" become one size token "5kg" */
function lex(clause: string): string[] {
  const words = clause
    .toLowerCase()
    .replace(/[₹@]/g, " rs ")
    .replace(/×/g, " x ")
    .replace(/[^a-z0-9.\-'\s]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[.\-']+|[.\-']+$/g, "").replace(/'s$/, ""))
    .filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    const joined = /^(\d+(?:\.\d+)?)([a-z]+)$/.exec(w);
    if (joined && SIZE_UNITS[joined[2]]) out.push(joined[1] + SIZE_UNITS[joined[2]]);
    else if (SIZE_UNITS[w] && out.length && NUM_RE.test(out[out.length - 1]))
      out.push(out.pop()! + SIZE_UNITS[w]);
    else out.push(w);
  }
  return out;
}

function detectKind(tokens: string[]): Kind | null {
  if (tokens.some((t) => CREATE.has(t))) return "create";
  if (tokens.some((t) => THRESHOLD.has(t))) return "threshold";
  if (tokens.some((t) => SALE.has(t))) return "sale";
  if (tokens.some((t) => RESTOCK.has(t))) return "restock";
  return null;
}

/** "2 rice 3 sugar" or "rice 2 sugar 3" → [{rice, 2}, {sugar, 3}] */
function pairs(tokens: string[]): { item: string; quantity: number | null }[] {
  const kept: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (SALE.has(t) || RESTOCK.has(t)) continue;
    // Drop prices: "for 500", "rs 40", "at 20"
    if ((t === "for" || t === "at" || PRICE_WORDS.has(t)) && qtyOf(tokens[i + 1]) != null) {
      i++;
      continue;
    }
    if (PRICE_WORDS.has(t) || FILLER.has(t) || t === "for" || t === "at") continue;
    kept.push(t);
  }
  // "a box of tea" → 1 tea
  if ((kept[0] === "a" || kept[0] === "an") && qtyOf(kept[1]) == null) kept[0] = "1";
  const seq = kept.filter((t) => t !== "a" && t !== "an");
  // "2 kg sugar" with no other count: the leading size is the quantity
  if (
    seq.length > 1 &&
    isSizeToken(seq[0]) &&
    !seq.some((t) => !isSizeToken(t) && qtyOf(t) != null)
  )
    seq[0] = String(parseFloat(seq[0]));

  const qtyFirst = qtyOf(seq[0]) != null;
  const groups: { words: string[]; qty: number | null }[] = [];
  let cur: { words: string[]; qty: number | null } = { words: [], qty: null };
  for (const t of seq) {
    const q = isSizeToken(t) ? null : qtyOf(t);
    if (q == null) cur.words.push(t);
    else if (qtyFirst) {
      groups.push(cur);
      cur = { words: [], qty: q };
    } else {
      cur.qty = q;
      groups.push(cur);
      cur = { words: [], qty: null };
    }
  }
  groups.push(cur);
  return groups
    .filter((g) => g.words.length)
    .map((g) => ({ item: g.words.join(" "), quantity: g.qty }));
}

function titleCase(words: string[]): string {
  return words.map((w) => (isSizeToken(w) || !w ? w : w[0].toUpperCase() + w.slice(1))).join(" ");
}

function parseCreate(tokens: string[]): ParsedAction | null {
  let price: number | null = null;
  let quantity: number | null = null;
  let unit: string | null = null;
  let category: string | null = null;
  const name: string[] = [];
  const skip = new Set(["is", "of", "rs", "="]);
  // Value after a keyword, skipping connectors: "price is rs 14" → 14
  const after = (i: number) => {
    let j = i + 1;
    while (skip.has(tokens[j])) j++;
    return j;
  };

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (CREATE.has(t) || ["item", "product", "add", "added", "with", "and", "a", "an"].includes(t))
      continue;
    if (PRICE_WORDS.has(t) || t === "at" || t === "for") {
      const j = after(i);
      if (qtyOf(tokens[j]) != null) {
        price = qtyOf(tokens[j]);
        i = j;
      }
      continue;
    }
    if (["stock", "qty", "quantity", "opening"].includes(t)) {
      const j = after(i);
      if (qtyOf(tokens[j]) != null) {
        quantity = qtyOf(tokens[j]);
        i = j;
      }
      continue;
    }
    if (t === "unit" || t === "per") {
      const j = after(i);
      if (tokens[j] && qtyOf(tokens[j]) == null) {
        unit = COUNT_UNITS[tokens[j]] ?? tokens[j];
        i = j;
      }
      continue;
    }
    if (t === "category" || t === "cat" || t === "under") {
      const j = after(i);
      if (tokens[j]) {
        category = tokens[j];
        i = j;
      }
      continue;
    }
    const q = isSizeToken(t) ? null : qtyOf(t);
    if (q != null) {
      const next = tokens[i + 1];
      if (next === "rupees" || next === "rupee" || next === "rs") price = q;
      else if (next === "stock" || next === "in") quantity = q;
      else if (next && COUNT_UNITS[next]) {
        quantity = q;
        unit = COUNT_UNITS[next];
      }
      if (next && (PRICE_WORDS.has(next) || next === "stock" || next === "in" || COUNT_UNITS[next]))
        i++;
      continue;
    }
    name.push(t);
  }
  if (!name.length) return null;
  return { type: "create_item", item: titleCase(name), quantity, unit, price, category };
}

function parseThreshold(tokens: string[]): ParsedAction | null {
  const rest = tokens.filter((t) => !THRESHOLD.has(t) && !THRESHOLD_FILLER.has(t));
  let threshold: number | null = null;
  for (let i = rest.length - 1; i >= 0; i--) {
    const q = isSizeToken(rest[i]) ? null : qtyOf(rest[i]);
    if (q != null) {
      threshold = q;
      rest.splice(i, 1);
      break;
    }
  }
  if (!rest.length) return null;
  return { type: "update_threshold", item: rest.join(" "), threshold };
}

export function parseRules(text: string): ParsedAction[] {
  const clauses = text
    .replace(/(\d),(\d{3})\b/g, "$1$2") // 1,000 → 1000
    .split(/[\n;,+&]|\band\b|\balso\b|\bthen\b/i)
    .map(lex)
    .filter((t) => t.length);

  // Attribute-only clauses ("price 14") belong to the preceding new item
  const parts: { kind: Kind | null; tokens: string[] }[] = [];
  for (const tokens of clauses) {
    const prev = parts[parts.length - 1];
    if (prev?.kind === "create" && ATTR_START.has(tokens[0]) && !detectKind(tokens))
      prev.tokens.push(...tokens);
    else parts.push({ kind: detectKind(tokens), tokens });
  }

  // Clauses without a verb take the nearest sale/restock verb ("sold 2 rice, 3 sugar")
  const flow = (k: Kind | null) => (k === "sale" || k === "restock" ? k : null);
  parts.forEach((p, i) => {
    if (p.kind) return;
    const before = parts
      .slice(0, i)
      .reverse()
      .find((q) => flow(q.kind));
    const after = parts.slice(i + 1).find((q) => flow(q.kind));
    p.kind = before?.kind ?? after?.kind ?? "sale";
  });

  const actions: ParsedAction[] = [];
  for (const p of parts) {
    if (p.kind === "create") {
      const a = parseCreate(p.tokens);
      if (a) actions.push(a);
    } else if (p.kind === "threshold") {
      const a = parseThreshold(p.tokens);
      if (a) actions.push(a);
    } else {
      for (const pr of pairs(p.tokens))
        actions.push({ type: p.kind as "sale" | "restock", item: pr.item, quantity: pr.quantity });
    }
  }
  return parseResultSchema.parse({ actions: actions.slice(0, 20) }).actions;
}
