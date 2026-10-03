// Text → proposed actions. Tries the LLM first; falls back to the rules parser on any failure.
// Never writes to the database.

import { completeJson, llmConfig, LlmError, type LlmConfig } from "@/lib/llm";
import { buildUserMessage, SYSTEM_PROMPT } from "./prompt";
import { parseRules } from "./rules";
import { parseResultSchema, type ParsedAction } from "./schema";

export type ParseSource = "ai" | "rules";
export type ParseOutcome = { actions: ParsedAction[]; source: ParseSource; notice?: string };

const FALLBACK_NOTICE: Record<string, string> = {
  timeout: "The AI reader timed out, so a basic reader was used. Check each line carefully.",
  network: "Couldn't reach the AI reader, so a basic reader was used. Check each line carefully.",
  http: "The AI reader had a problem, so a basic reader was used. Check each line carefully.",
  invalid_json:
    "The AI reader's answer couldn't be read, so a basic reader was used. Check each line carefully.",
  empty: "The AI reader found nothing, so a basic reader was used. Check each line carefully.",
};

export async function parseEntry(
  text: string,
  itemNames: string[],
  config: LlmConfig | null = llmConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<ParseOutcome> {
  if (!config) return { actions: parseRules(text), source: "rules" };

  try {
    const raw = await completeJson(
      SYSTEM_PROMPT,
      buildUserMessage(text, itemNames),
      config,
      fetchImpl,
    );
    const parsed = parseResultSchema.safeParse(raw);
    if (!parsed.success) throw new LlmError("invalid_json", "AI reply didn't match the schema");
    // An empty AI answer for non-empty text is worth a second opinion from the rules
    if (!parsed.data.actions.length) {
      const rules = parseRules(text);
      return rules.length
        ? { actions: rules, source: "rules", notice: FALLBACK_NOTICE.empty }
        : { actions: [], source: "ai" };
    }
    return { actions: parsed.data.actions, source: "ai" };
  } catch (e) {
    const kind = e instanceof LlmError ? e.kind : "http";
    return { actions: parseRules(text), source: "rules", notice: FALLBACK_NOTICE[kind] };
  }
}
