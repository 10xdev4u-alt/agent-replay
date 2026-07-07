/**
 * Cost tracking — model pricing table + USD cost calculator.
 *
 * Why: agent runs cost money, and nobody wants to wait for a cloud
 * dashboard to tell them how much. This is offline, instant, and
 * works on a raw event stream.
 *
 * Prices are USD per million tokens (input / output), sourced from
 * public pricing pages. Update the table when providers change them —
 * that's the whole maintenance burden.
 */

/** Price per 1M tokens (USD), split input/output. */
export interface ModelPrice {
  input: number;
  output: number;
}

/** Known model prices (USD / 1M tokens). Keyed by lowercase substring match. */
export const PRICES: Record<string, ModelPrice> = {
  // Anthropic
  "claude-opus-4": { input: 15, output: 75 },
  "claude-sonnet-4": { input: 3, output: 15 },
  "claude-3-5-sonnet": { input: 3, output: 15 },
  "claude-3-5-haiku": { input: 0.8, output: 4 },
  "claude-3-opus": { input: 15, output: 75 },
  "claude-3-haiku": { input: 0.25, output: 1.25 },
  // OpenAI
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10, output: 30 },
  "gpt-4": { input: 30, output: 60 },
  "gpt-3.5-turbo": { input: 0.5, output: 1.5 },
  "o1": { input: 15, output: 60 },
  "o1-mini": { input: 3, output: 12 },
  "o3": { input: 15, output: 60 },
  "o3-mini": { input: 3, output: 12 },
  // Google
  "gemini-1.5-pro": { input: 1.25, output: 5 },
  "gemini-1.5-flash": { input: 0.075, output: 0.3 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4 },
  "gemini-2.5-pro": { input: 1.25, output: 10 },
  // Meta / open
  "llama-3.1-405b": { input: 0.9, output: 0.9 },
  "llama-3.1-70b": { input: 0.4, output: 0.4 },
  "llama-3.3-70b": { input: 0.2, output: 0.2 },
  "deepseek-v3": { input: 0.27, output: 1.1 },
  "deepseek-r1": { input: 0.55, output: 2.19 },
  "qwen-2.5-72b": { input: 0.4, output: 0.4 },
  // Mistral
  "mistral-large": { input: 2, output: 6 },
  "mistral-small": { input: 0.2, output: 0.6 },
};

/** Find the price for a model id, by case-insensitive substring match. */
export function priceFor(modelId: string): ModelPrice | undefined {
  const key = modelId.toLowerCase();
  // Prefer the longest matching key (most specific).
  let best: string | undefined;
  for (const candidate of Object.keys(PRICES)) {
    if (key.includes(candidate) && (!best || candidate.length > best.length)) {
      best = candidate;
    }
  }
  return best ? PRICES[best] : undefined;
}

/** Usage counters for a single model invocation. */
export interface TokenUsage {
  model: string;
  inputTokens: number;
  outputTokens: number;
}

/** Compute USD cost for a single usage record. */
export function costOf(usage: TokenUsage): number {
  const price = priceFor(usage.model);
  if (!price) return 0;
  return (usage.inputTokens * price.input + usage.outputTokens * price.output) / 1_000_000;
}

/** Sum costs across many usage records. */
export function totalCost(usages: readonly TokenUsage[]): number {
  let sum = 0;
  for (const u of usages) sum += costOf(u);
  return sum;
}

/** Format a USD cost for display. Tiny values get more precision. */
export function formatCost(usd: number): string {
  if (usd === 0) return "$0";
  if (usd < 0.01) return `$${usd.toFixed(6)}`;
  if (usd < 1) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(2)}`;
}
