/**
 * Pricing tests — cost math + model matching.
 */
import { describe, it, expect } from "vitest";
import { PRICES, priceFor, costOf, totalCost, formatCost } from "../src/pricing.js";

describe("pricing", () => {
  it("matches known models by substring (case-insensitive)", () => {
    expect(priceFor("gpt-4o")?.input).toBe(2.5);
    expect(priceFor("openai/gpt-4o-2024-08")?.input).toBe(2.5);
    expect(priceFor("GPT-4O")?.input).toBe(2.5);
    expect(priceFor("claude-3-5-sonnet")?.output).toBe(15);
  });

  it("prefers the most specific (longest) match", () => {
    // gpt-4o-mini should beat gpt-4o for the mini model.
    expect(priceFor("gpt-4o-mini")?.input).toBe(0.15);
    expect(priceFor("claude-3-haiku")?.input).toBe(0.25);
  });

  it("returns undefined for unknown models", () => {
    expect(priceFor("totally-unknown-xyz")).toBeUndefined();
  });

  it("pricing table covers major providers", () => {
    const ids = Object.keys(PRICES);
    expect(ids.some((id) => id.includes("gpt"))).toBe(true);
    expect(ids.some((id) => id.includes("claude"))).toBe(true);
    expect(ids.some((id) => id.includes("gemini"))).toBe(true);
    expect(ids.some((id) => id.includes("llama"))).toBe(true);
  });

  it("costOf computes per-1M-token pricing", () => {
    // gpt-4o: $2.50/1M in, $10/1M out.
    const cost = costOf({ model: "gpt-4o", inputTokens: 1_000_000, outputTokens: 1_000_000 });
    expect(cost).toBeCloseTo(12.5, 4);
  });

  it("costOf is zero for unknown models", () => {
    expect(costOf({ model: "unknown-xyz", inputTokens: 1000, outputTokens: 1000 })).toBe(0);
  });

  it("totalCost sums across usage records", () => {
    const sum = totalCost([
      { model: "gpt-4o", inputTokens: 1_000_000, outputTokens: 0 },
      { model: "gpt-4o", inputTokens: 0, outputTokens: 1_000_000 },
    ]);
    expect(sum).toBeCloseTo(12.5, 4);
  });

  it("formatCost scales precision to magnitude", () => {
    expect(formatCost(0)).toBe("$0");
    expect(formatCost(0.000004)).toBe("$0.000004");
    expect(formatCost(0.5)).toBe("$0.5000");
    expect(formatCost(12.5)).toBe("$12.50");
  });
});
