// Run: npm run eval:parser
// Always scores the rules parser; also scores the LLM parser when LLM_API_KEY is set.
import "dotenv/config";
import { parseEntry } from "../src/lib/parser";
import { llmConfig } from "../src/lib/llm";
import { parseRules } from "../src/lib/parser/rules";
import { formatReport, runEval } from "./parser-eval";

async function main() {
  console.log(formatReport("Rules parser", await runEval(async (text) => parseRules(text))));

  const config = llmConfig();
  if (!config) {
    console.log("\nLLM parser: skipped (no LLM_API_KEY in .env)");
    return;
  }
  let fallbacks = 0;
  const report = await runEval(async (text, names) => {
    const r = await parseEntry(text, names, config);
    if (r.source === "rules") fallbacks++;
    return r.actions;
  });
  console.log(`\n${formatReport(`LLM parser (${config.model})`, report)}`);
  if (fallbacks) console.log(`  Note: ${fallbacks} entries fell back to the rules parser`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
