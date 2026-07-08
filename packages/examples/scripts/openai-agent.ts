/**
 * Example — wrap a real OpenAI SDK call with agent-replay.
 *
 * Demonstrates `wrapFetch` + `Recorder` capturing a live LLM call. Run with
 * an OPENAI_API_KEY set to record a real session:
 *
 *   OPENAI_API_KEY=sk-... node packages/examples/scripts/openai-agent.js
 *
 * No SDK install needed — uses fetch against the OpenAI REST API directly,
 * which wrapFetch intercepts. Result: a .replay.jsonl you can open in the
 * viewer showing the prompt, streamed response, and cost.
 */
import { Recorder, wrapFetch, writeArchive } from "@agent-replay/core";

const OUT = process.env.AGENT_REPLAY_OUT ?? "packages/examples/openai.replay.jsonl";

async function main(): Promise<void> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error("set OPENAI_API_KEY to run this example");
    process.exit(1);
  }

  const rec = new Recorder({ name: "openai-agent" });
  const restore = wrapFetch(rec);

  try {
    rec.message("user", "Explain JSONL in one sentence.");

    const span = rec.span("model.openai.chat");
    rec.prompt("openai", { model: "gpt-4o-mini", messages: [{ role: "user", content: "Explain JSONL in one sentence." }] });

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: "Explain JSONL in one sentence." }],
        max_tokens: 100,
      }),
    });

    if (!res.ok) throw new Error(`openai ${res.status}: ${await res.text()}`);
    const json = (await res.json()) as { choices: Array<{ message: { content: string } }>; usage?: { total_tokens?: number } };
    const answer = json.choices[0]?.message.content ?? "(no response)";
    rec.response("openai", { model: "gpt-4o-mini", content: answer });
    if (json.usage?.total_tokens) rec.metric("tokens", json.usage.total_tokens);
    rec.metric("cost", 0.0001); // gpt-4o-mini is cheap
    span.end();

    rec.message("assistant", answer);
  } finally {
    restore();
    rec.end();
  }

  // Persist both the raw events and a portable archive.
  const { writeFileSync, mkdirSync } = await import("node:fs");
  const { dirname } = await import("node:path");
  const events = rec.events;
  mkdirSync(dirname(OUT), { recursive: true });
  const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
  writeFileSync(OUT, lines);
  await writeArchive(OUT.replace(".replay.jsonl", ".replay"), events);
  console.error(`◆ recorded ${events.length} events → ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
