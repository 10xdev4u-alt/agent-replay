/**
 * info — print summary stats for a recording file.
 *
 * Uses core's summarize() to aggregate events: counts by kind, duration,
 * token/cost totals, span count, error count. One-glance overview.
 */
import { resolve } from "node:path";
import { readAll, summarize } from "@agent-replay/core";

export async function info(args: string[]): Promise<number> {
  const [file] = args;
  if (!file) {
    console.error("usage: agent-replay info <file.replay.jsonl>");
    return 1;
  }

  const path = resolve(file);
  const { events, dropped } = await readAll(path);

  if (events.length === 0) {
    console.error(`no events in ${path} (${dropped.length} dropped lines)`);
    return 1;
  }

  const s = summarize(events);
  const started = s.startedAt ? new Date(s.startedAt).toISOString() : "n/a";
  const ended = s.endedAt ? new Date(s.endedAt).toISOString() : "n/a";

  console.log(`recording: ${path}`);
  console.log(`events:    ${s.eventCount}${dropped.length ? ` (${dropped.length} dropped)` : ""}`);
  console.log(`spans:     ${s.spanCount} (depth ${s.maxDepth})`);
  console.log(`started:   ${started}`);
  console.log(`ended:     ${ended} (${formatDuration(s.durationMs)})`);
  console.log(`errors:    ${s.errorCount}`);
  if (s.totalTokens) console.log(`tokens:    ${s.totalTokens.toLocaleString()}`);
  if (s.totalCost) console.log(`cost:      $${s.totalCost.toFixed(4)}`);

  if (s.tools.length) {
    console.log("\ntools:");
    for (const t of s.tools) {
      const errs = t.errors ? ` (${t.errors} errs)` : "";
      console.log(`  ${t.name.padEnd(24)} ${t.calls} calls${errs}`);
    }
  }
  if (s.providers.length) {
    console.log("\nproviders:");
    for (const p of s.providers) {
      console.log(`  ${p.name.padEnd(24)} ${p.prompts} prompts / ${p.responses} responses`);
    }
  }

  console.log("\nby kind:");
  for (const [kind, n] of Object.entries(s.byKind)) {
    if (n > 0) console.log(`  ${kind.padEnd(14)} ${n}`);
  }

  return 0;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m${s}s`;
}
