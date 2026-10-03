import { describe, expect, it } from "vitest";
import { parseRules } from "@/lib/parser/rules";
import { CASES } from "../../scripts/parser-eval-cases";
import { runEval } from "../../scripts/parser-eval";

describe("parser eval (rules parser)", () => {
  it("has 30+ cases covering typos, Manglish, multi-item and missing quantities", () => {
    expect(CASES.length).toBeGreaterThanOrEqual(30);
    const tags = new Set(CASES.map((c) => c.tag));
    for (const t of ["typo", "manglish", "multi", "missing_qty", "ambiguous"])
      expect(tags.has(t)).toBe(true);
  });

  it("stays above the accuracy floor", async () => {
    const r = await runEval(async (text) => parseRules(text));
    // Baseline 2026-10-03: 42/44 entries. Raise the floor when the parser improves.
    expect(r.cases.passed / r.cases.total).toBeGreaterThanOrEqual(0.9);
    // Never guess on ambiguous or unknown names
    for (const res of r.results.filter((x) => x.c.tag === "ambiguous")) expect(res.pass).toBe(true);
  });
});
