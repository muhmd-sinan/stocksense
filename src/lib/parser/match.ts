// Fuzzy matching of free-text item names against the shop's items.
// Pure: no DB access, so it runs in tests and on either side of the network.

// Local and short names → words that appear in item names
const ALIASES: Record<string, string> = {
  coke: "coca cola",
  cola: "coca cola",
  ari: "rice",
  pachari: "rice",
  panchasara: "sugar",
  chaya: "tea",
  chayapodi: "tea powder",
  kaapi: "coffee",
  kappi: "coffee",
  paal: "milk",
  pal: "milk",
  enna: "oil",
  ennai: "oil",
  velichenna: "coconut oil",
  nallenna: "gingelly oil",
  sopp: "soap",
  soppu: "soap",
  paripp: "dal",
  parippu: "dal",
  sooji: "rava",
  suji: "rava",
  atta: "wheat atta",
  biscuit: "biscuit",
  parle: "parle g",
  paste: "colgate",
  toothpaste: "colgate",
};

const SIZE_RE = /^\d+(\.\d+)?(kg|g|gm|l|ml|ltr)$/;

export const isSizeToken = (t: string) => SIZE_RE.test(t);

/** "Parle-G 250 g" → ["parle", "g", "250g"]; units normalised (gm → g, ltr → l) */
export function tokenize(text: string): string[] {
  const cleaned = text
    .toLowerCase()
    .replace(/'s\b/g, "")
    .replace(/(\d)\s+(kg|gm|g|ml|ltr|l)\b/g, "$1$2")
    .replace(/[^a-z0-9.\s]/g, " ")
    .replace(/(?<!\d)\.|\.(?!\d)/g, " ");
  return cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((t) => t.replace(/^(\d+(?:\.\d+)?)(gm)$/, "$1g").replace(/^(\d+(?:\.\d+)?)ltr$/, "$1l"))
    .map(singular);
}

export function singular(t: string): string {
  if (t.length <= 3 || /\d/.test(t)) return t;
  if (t.endsWith("ies")) return `${t.slice(0, -3)}y`;
  if (/(ch|sh|x|ss)es$/.test(t)) return t.slice(0, -2);
  if (t.endsWith("s") && !t.endsWith("ss")) return t.slice(0, -1);
  return t;
}

function expandAliases(tokens: string[]): string[] {
  return tokens.flatMap((t) => (ALIASES[t] ? tokenize(ALIASES[t]) : [t]));
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** 1 = same word; tolerates a typo in longer words and prefixes like "choc" → "chocolate" */
function tokenSim(q: string, t: string): number {
  if (q === t) return 1;
  if (isSizeToken(q) || isSizeToken(t)) return 0;
  if (q.length >= 3 && t.startsWith(q)) return 0.9;
  if (q.length < 4) return 0;
  const sim = 1 - levenshtein(q, t) / Math.max(q.length, t.length);
  return sim >= 0.7 ? sim : 0;
}

/** 0..1 similarity between a query and an item name */
export function scoreName(query: string, name: string): number {
  const q = expandAliases(tokenize(query));
  const n = tokenize(name);
  if (!q.length || !n.length) return 0;

  const qWords = q.filter((t) => !isSizeToken(t));
  const nWords = n.filter((t) => !isSizeToken(t));
  const qSizes = q.filter(isSizeToken);
  const nSizes = n.filter(isSizeToken);
  if (!qWords.length) return 0;

  const best = (t: string, pool: string[]) => Math.max(0, ...pool.map((p) => tokenSim(t, p)));
  const qCover = qWords.reduce((s, t) => s + best(t, nWords), 0) / qWords.length;
  const nCover = nWords.reduce((s, t) => s + best(t, qWords), 0) / (nWords.length || 1);
  let score = 0.75 * qCover + 0.25 * nCover;
  // A size the owner typed must agree with the item's size
  if (qSizes.length && nSizes.length) score *= qSizes.some((s) => nSizes.includes(s)) ? 1 : 0.6;
  return Math.round(score * 1000) / 1000;
}

export type MatchCandidate<T> = { item: T; score: number };
export type MatchResult<T> =
  | { kind: "matched"; item: T; score: number }
  | { kind: "ambiguous"; candidates: MatchCandidate<T>[] }
  | { kind: "none"; candidates: MatchCandidate<T>[] };

export const MATCH_MIN = 0.75;
export const CANDIDATE_MIN = 0.4;
const MARGIN = 0.1;

export function matchItem<T extends { name: string }>(query: string, items: T[]): MatchResult<T> {
  const q = query.trim().toLowerCase();
  const exact = items.find((i) => i.name.toLowerCase() === q);
  if (exact) return { kind: "matched", item: exact, score: 1 };

  const ranked = items
    .map((item) => ({ item, score: scoreName(query, item.name) }))
    .filter((c) => c.score >= CANDIDATE_MIN)
    .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name))
    .slice(0, 5);

  const [top, second] = ranked;
  if (!top) return { kind: "none", candidates: [] };
  if (top.score >= MATCH_MIN && (!second || top.score - second.score >= MARGIN))
    return { kind: "matched", item: top.item, score: top.score };
  if (top.score >= MATCH_MIN || ranked.length > 1) return { kind: "ambiguous", candidates: ranked };
  return { kind: "none", candidates: ranked };
}

/** Best category for a free-text name, or null */
export function matchCategory<T extends { name: string }>(query: string | null, cats: T[]) {
  if (!query) return null;
  const r = matchItem(query, cats);
  return r.kind === "matched" ? r.item : null;
}
