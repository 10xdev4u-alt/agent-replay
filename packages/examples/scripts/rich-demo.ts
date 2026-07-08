/**
 * Rich demo — a fuller agent session for viewer screenshots/demos.
 *
 * Multi-turn conversation, multiple tool calls, an error + recovery, a
 * sub-span, streaming, and token/cost metrics. Generates a recording that
 * exercises every event kind and several spans.
 */
import { Recorder } from "@agent-replay/core";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const OUT = process.env.AGENT_REPLAY_OUT ?? "packages/examples/rich-demo.replay.jsonl";

async function main(): Promise<void> {
  const rec = new Recorder({ name: "rich-demo-agent" });

  // Turn 1.
  rec.message("user", "Can you find the config file and tell me the port number?");
  rec.thought("thinking", "User wants config port. I'll search for config files first.");
  await sleep(90);

  const searchSpan = rec.span("tool:grep");
  rec.toolCall("grep", { pattern: "port", path: "." });
  await sleep(120);
  rec.toolResult("grep", { matches: ["config/app.json:3:  \"port\": 8080"] });
  searchSpan.end();

  const readSpan = rec.span("tool:read_file");
  rec.toolCall("read_file", { path: "config/app.json" });
  await sleep(110);
  rec.toolResult("read_file", { content: "{\n  \"port\": 8080,\n  \"host\": \"0.0.0.0\"\n}" });
  readSpan.end();

  rec.message("assistant", "The config file shows the port is **8080**.");
  rec.metric("tokens", 312);
  rec.metric("cost", 0.0046);

  // Turn 2 — with an error.
  rec.message("user", "Now restart the server please.");
  rec.thought("thinking", "Restart needs the run_restart tool. Let me try it.");
  await sleep(80);

  const restartSpan = rec.span("tool:run_restart");
  rec.toolCall("run_restart", { signal: "restart" });
  await sleep(160);
  rec.error(new Error("ECONNREFUSED: server not running"), { spanId: restartSpan.id });
  restartSpan.end();

  rec.thought("thinking", "Server wasn't running. I'll start it fresh instead.");
  const startSpan = rec.span("tool:run_start");
  rec.toolCall("run_start", {});
  await sleep(140);
  rec.toolResult("run_start", { ok: true, pid: 4221 });
  startSpan.end();

  rec.message("assistant", "The server wasn't running, so I started it fresh (pid 4221). It's up on port 8080.");
  rec.metric("tokens", 188);
  rec.metric("cost", 0.0028);

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
