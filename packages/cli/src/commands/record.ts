/**
 * record — run a Node script with agent-replay capturing its events.
 *
 * The script imports `@agent-replay/core`, creates a Recorder, and emits
 * events. On exit, we flush them to a .replay.jsonl file.
 *
 * The script controls the recording by calling process.exit through its own
 * recorder.end(); we just set the output path via env and wait.
 */
import { spawn } from "node:child_process";
import { resolve, basename, dirname } from "node:path";

export async function record(args: string[]): Promise<number> {
  const [script, ...rest] = args;
  if (!script) {
    console.error("usage: agent-replay record <script.ts|js> [args...]");
    console.error("       AGENT_REPLAY_OUT=path.replay.jsonl agent-replay record ...");
    return 1;
  }

  const scriptPath = resolve(script);
  const stem = basename(scriptPath).replace(/\.m?[tj]sx?$/, "");
  const defaultOut = `${stem}.${Date.now()}.replay.jsonl`;
  const out = process.env.AGENT_REPLAY_OUT ?? resolve(dirname(scriptPath), defaultOut);

  console.error(`▶ recording → ${out}`);
  const code = await run(scriptPath, rest, out);
  console.error(`■ done (exit ${code})`);
  return code === 0 ? 0 : code;
}

function run(script: string, args: string[], out: string): Promise<number> {
  return new Promise((resolveP) => {
    const child = spawn(process.execPath, [script, ...args], {
      stdio: "inherit",
      env: { ...process.env, AGENT_REPLAY_OUT: out },
    });
    child.on("close", (code) => resolveP(code ?? 1));
    child.on("error", (err) => {
      console.error(err);
      resolveP(1);
    });
  });
}
