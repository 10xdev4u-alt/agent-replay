/**
 * diff — compare two recordings and print what changed.
 *
 * Aligns events by key, prints added/removed/changed counts, and the
 * delta in tokens, cost, and duration. The text-mode "what's different
 * between these two runs?" view.
 */
import { resolve } from "node:path";
import { readAll, diffRecordings, formatCost } from "@agent-replay/core";

export async function diff(args: string[]): Promise<number> {
  const [leftFile, rightFile] = args;
  if (!leftFile || !rightFile) {
    console.error("usage: agent-replay diff <base.replay.jsonl> <new.replay.jsonl>");
    return 1;
  }

  const [left, right] = await Promise.all([
    readAll(resolve(leftFile)),
    readAll(resolve(rightFile)),
  ]);

  if (!left.events.length || !right.events.length) {
    console.error("both recordings must have events");
    return 1;
  }

  const d = diffRecordings(left.events, right.events);

  console.log(`base:   ${leftFile} (${d.leftSummary.eventCount} events)`);
  console.log(`new:    ${rightFile} (${d.rightSummary.eventCount} events)`);
  console.log("");
  console.log(`changes:  +${d.counts.added} added  -${d.counts.removed} removed  ~${d.counts.changed} changed  =${d.counts.same} same`);

  const tokenSign = d.tokenDelta >= 0 ? "+" : "";
  const costSign = d.costDelta >= 0 ? "+" : "";
  const durSign = d.durationDeltaMs >= 0 ? "+" : "";
  console.log(`tokens:   ${tokenSign}${d.tokenDelta.toLocaleString()}`);
  console.log(`cost:     ${costSign}${formatCost(d.costDelta)}`);
  console.log(`duration: ${durSign}${formatMs(d.durationDeltaMs)}`);

  const interesting = d.entries.filter((e) => e.change !== "same");
  if (interesting.length) {
    console.log("\nchanged events:");
    for (const e of interesting) {
      const tag = e.change === "added" ? "+" : e.change === "removed" ? "-" : "~";
      console.log(`  ${tag} ${e.key}`);
    }
  }

  return 0;
}

function formatMs(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < 1000) return `${ms}ms`;
  if (abs < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(abs / 60_000);
  const s = Math.round((abs % 60_000) / 1000);
  return `${ms < 0 ? "-" : ""}${m}m${s}s`;
}
