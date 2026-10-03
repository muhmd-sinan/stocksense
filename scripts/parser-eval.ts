// Scores a parser on the eval set (scripts/parser-eval-cases.ts). Pure: the parse function
// is passed in, so the unit test runs it on the rules parser and the CLI can use the LLM.

import type { CategoryOption, Draft, ItemOption } from "../src/lib/parser/draft";
import { resolveActions } from "../src/lib/parser/resolve";
import type { ParsedAction } from "../src/lib/parser/schema";
import { CASES, type EvalCase, type ExpectedLine } from "./parser-eval-cases";
import { CATALOG } from "./seed-catalog";

// The demo shop: ids are the item names so results read easily
export const EVAL_ITEMS: ItemOption[] = Object.values(CATALOG).flatMap((list) =>
  list.map((i) => ({
    id: i.name,
    name: i.name,
    unit: i.unit,
    price: i.price,
    stock: 50,
    threshold: i.threshold,
  })),
);
export const EVAL_CATEGORIES: CategoryOption[] = Object.keys(CATALOG).map((n) => ({
  id: n,
  name: n,
}));

export type ParseFn = (text: string, itemNames: string[]) => Promise<ParsedAction[]>;

export type CaseResult = { c: EvalCase; got: ExpectedLine[]; pass: boolean; linesOk: number };
export type EvalReport = {
  results: CaseResult[];
  cases: { total: number; passed: number };
  lines: { total: number; correct: number };
  byTag: Record<string, { total: number; passed: number }>;
};

/** A draft as an expected line, keeping only the fields we score */
function toLine(d: Draft): ExpectedLine {
  if (d.type === "create_item")
    return { type: d.type, name: d.name, quantity: d.quantity, price: d.price };
  if (d.type === "update_threshold")
    return { type: d.type, item: d.itemId, threshold: d.threshold };
  return { type: d.type, item: d.itemId, quantity: d.quantity };
}

function lineMatches(exp: ExpectedLine, got: ExpectedLine | undefined): boolean {
  if (!got || got.type !== exp.type) return false;
  if (exp.type === "create_item" && got.type === "create_item")
    return (
      exp.name.toLowerCase() === got.name.toLowerCase() &&
      (exp.quantity === undefined || exp.quantity === got.quantity) &&
      (exp.price === undefined || exp.price === got.price)
    );
  if (exp.type === "update_threshold" && got.type === "update_threshold")
    return exp.item === got.item && exp.threshold === got.threshold;
  if ((exp.type === "sale" || exp.type === "restock") && got.type === exp.type)
    return exp.item === got.item && exp.quantity === got.quantity;
  return false;
}

export async function runEval(parse: ParseFn, cases = CASES): Promise<EvalReport> {
  const names = EVAL_ITEMS.map((i) => i.name);
  const results: CaseResult[] = [];
  for (const c of cases) {
    const actions = await parse(c.text, names);
    const got = resolveActions(actions, EVAL_ITEMS, EVAL_CATEGORIES).map(toLine);
    const linesOk = c.expect.filter((e, i) => lineMatches(e, got[i])).length;
    results.push({
      c,
      got,
      linesOk,
      pass: got.length === c.expect.length && linesOk === c.expect.length,
    });
  }
  const byTag: EvalReport["byTag"] = {};
  for (const r of results) {
    const t = (byTag[r.c.tag] ??= { total: 0, passed: 0 });
    t.total++;
    if (r.pass) t.passed++;
  }
  return {
    results,
    cases: { total: results.length, passed: results.filter((r) => r.pass).length },
    lines: {
      total: results.reduce((s, r) => s + r.c.expect.length, 0),
      correct: results.reduce((s, r) => s + r.linesOk, 0),
    },
    byTag,
  };
}

const pct = (a: number, b: number) => `${b ? Math.round((a / b) * 1000) / 10 : 0}%`;

export function formatReport(label: string, r: EvalReport): string {
  const out = [
    `${label}: ${r.cases.passed}/${r.cases.total} entries fully right (${pct(r.cases.passed, r.cases.total)}), ` +
      `${r.lines.correct}/${r.lines.total} lines right (${pct(r.lines.correct, r.lines.total)})`,
  ];
  for (const [tag, t] of Object.entries(r.byTag))
    out.push(`  ${tag.padEnd(12)} ${t.passed}/${t.total}`);
  const failed = r.results.filter((x) => !x.pass);
  if (failed.length) out.push("  Misses:");
  for (const f of failed)
    out.push(
      `    "${f.c.text.replace(/\n/g, " / ")}"`,
      `      want ${JSON.stringify(f.c.expect)}`,
      `      got  ${JSON.stringify(f.got)}`,
    );
  return out.join("\n");
}
