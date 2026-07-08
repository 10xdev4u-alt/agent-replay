// Demo agent — generates a rich .replay.jsonl recording for the viewer.
//
// Plain JS (no transpile) so it runs against the built core dist directly:
//   pnpm --filter @agent-replay/core build
//   node packages/examples/scripts/demo-agent.mjs
import { Recorder } from "../../core/dist/index.js";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const OUT = process.env.AGENT_REPLAY_OUT ?? "packages/examples/demo.replay.jsonl";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const rec = new Recorder({ name: "demo-agent" });

  // Turn 1: a successful tool call.
  rec.message("user", "What files are in the src directory?");
  rec.thought("reasoning", "User wants a directory listing. I'll use list_files.");
  await sleep(40);

  let span = rec.span("model.openai.chat");
  rec.prompt("openai", { model: "gpt-4o", messages: [{ role: "user", content: "list src/" }] });
  await sleep(30);
  for (const t of ["I'll", " check", " the", " `src`", " dir", "."]) {
    rec.delta(t);
    await sleep(20);
  }
  rec.response("openai", { model: "gpt-4o", content: "I'll check the `src` dir." });
  rec.metric("tokens", 88);
  rec.metric("cost", 0.0013);
  span.end();

  span = rec.span("tool:list_files");
  rec.toolCall("list_files", { path: "./src" });
  await sleep(60);
  rec.toolResult("list_files", { files: ["main.ts", "utils.ts", "config.json"] });
  span.end();

  rec.message("assistant", "The `src` directory contains: main.ts, utils.ts, and config.json.");
  rec.metric("tokens", 14);
  rec.metric("cost", 0.0002);

  // Turn 2: an error + recovery — shows the viewer's error surfacing.
  rec.message("user", "Now read config.json.");
  span = rec.span("tool:read_file");
  rec.toolCall("read_file", { path: "./src/config.json" });
  await sleep(50);
  rec.error(new Error("ENOENT: no such file ./src/config.json"), { spanId: span.id });
  span.end();

  span = rec.span("model.openai.chat");
  rec.prompt("openai", { model: "gpt-4o", messages: [{ role: "user", content: "retry read" }] });
  await sleep(30);
  for (const t of ["Sorry", ", that", " file", " is", " missing", "."]) {
    rec.delta(t);
    await sleep(20);
  }
  rec.response("openai", { model: "gpt-4o", content: "Sorry, that file is missing." });
  rec.metric("tokens", 22);
  rec.metric("cost", 0.0004);
  span.end();
  rec.message("assistant", "Sorry, that file is missing.");

  const events = rec.end();
  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, events.map((e) => JSON.stringify(e)).join("\n") + "\n");
  console.error(`◆ recorded ${events.length} events → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
