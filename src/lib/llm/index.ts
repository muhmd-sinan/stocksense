// Minimal LLM client. Providers with an OpenAI-compatible /chat/completions API
// (Groq by default) are selected by env; swap the provider without touching callers.

export type LlmErrorKind = "not_configured" | "timeout" | "network" | "http" | "invalid_json";

export class LlmError extends Error {
  kind: LlmErrorKind;
  constructor(kind: LlmErrorKind, message: string) {
    super(message);
    this.name = "LlmError";
    this.kind = kind;
  }
}

const PROVIDERS: Record<string, { baseUrl: string; model: string }> = {
  groq: { baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
};

export type LlmConfig = { baseUrl: string; apiKey: string; model: string; timeoutMs: number };

export function llmConfig(env: NodeJS.ProcessEnv = process.env): LlmConfig | null {
  const apiKey = env.LLM_API_KEY?.trim();
  if (!apiKey) return null;
  const provider = PROVIDERS[env.LLM_PROVIDER?.trim() || "groq"] ?? PROVIDERS.groq;
  const timeoutMs = Number(env.LLM_TIMEOUT_MS);
  return {
    baseUrl: env.LLM_BASE_URL?.trim() || provider.baseUrl,
    apiKey,
    model: env.LLM_MODEL?.trim() || provider.model,
    timeoutMs: Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 10_000,
  };
}

/** Sends a system + user message and returns the reply parsed as a JSON object. */
export async function completeJson(
  system: string,
  user: string,
  config: LlmConfig | null = llmConfig(),
  fetchImpl: typeof fetch = fetch,
): Promise<unknown> {
  if (!config) throw new LlmError("not_configured", "No LLM API key set");

  let res: Response;
  try {
    res = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
      signal: AbortSignal.timeout(config.timeoutMs),
    });
  } catch (e) {
    const name = (e as Error)?.name;
    if (name === "TimeoutError" || name === "AbortError")
      throw new LlmError("timeout", "The AI reader took too long");
    throw new LlmError("network", "Couldn't reach the AI reader");
  }
  if (!res.ok) throw new LlmError("http", `AI reader returned HTTP ${res.status}`);

  let content: unknown;
  try {
    const body = await res.json();
    content = body?.choices?.[0]?.message?.content;
    if (typeof content !== "string") throw new Error("no content");
    return JSON.parse(content);
  } catch (e) {
    if ((e as Error)?.name === "TimeoutError")
      throw new LlmError("timeout", "The AI reader took too long");
    throw new LlmError("invalid_json", "The AI reader sent back something unreadable");
  }
}
