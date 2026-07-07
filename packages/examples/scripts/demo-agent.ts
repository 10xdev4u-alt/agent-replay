/**
 * Example — generate a demo .replay.jsonl recording.
 *
 * Simulates a tiny agent loop: a user message, a "thought", a prompt to a
 * model, streamed response deltas, a tool call, and a final message.
 * Run it with the CLI to produce a recording the viewer can open.
 *
 *   pnpm build && node packages/examples/scripts/demo-agent.js
 *   → dist/demo.replay.jsonl
 *
 * No real LLM is contacted — the payloads are synthetic but realistic.
 */
import { Recorder } from "@agent-replay/core";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const OUT = process.env.AGENT_REPLAY_OUT ?? "packages/examples/demo.replay.jsonl";

async function main(): Promise<void> {
  const rec = new Recorder({ name: "demo-agent" });

  rec.message("user", "What files are in the src directory?");
  rec.thought("thinking", "The user wants a directory listing. I'll use the list_files tool.");
  await sleep(120);

  const span = rec.span("model.openai.chat");
  rec.prompt("openai", {
    model: "gpt-4o",
    messages: [{ role: "user", content: "What files are in the src directory?" }],
  });
  await sleep(80);

  // Stream the response token by token.
  const tokens = ["I'll", " check", " the", " `src`", " directory", " for", " you", "."];
  for (const t of tokens) {
    rec.delta(t);
    await sleep(30);
  }
  rec.response("openai", {
    model: "gpt-4o",
    content: tokens.join(""),
  });
  rec.metric("tokens", 142);
  rec.metric("cost", 0.0021);
  span.end();

  const toolSpan = rec.span("tool:list_files");
  rec.toolCall("list_files", { path: "./src" });
  await sleep(150);
  rec.toolResult("list_files", {
    files: ["main.ts", "utils.ts", "config.json"],
  });
  toolSpan.end();

  rec.message("assistant", "The `src` directory contains: main.ts, utils.ts, and config.json.");
  rec.metric("tokens", 18);
  rec.metric("cost", 0.0003);

  const events = rec.end();

  mkdirSync(dirname(OUT), { recursive: true });
  const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
  writeFileSync(OUT, lines);
  console.error(`◆ recorded ${events.length} events → ${OUT}`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
