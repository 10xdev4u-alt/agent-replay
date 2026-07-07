/**
 * CLI smoke tests — run the real built CLI against fixtures and assert
 * on stdout/stderr/exit code.
 *
 * These catch regressions that unit tests on helpers miss: arg parsing,
 * the command router, file IO, and the help text.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// dist/index.js is the bundled CLI entry (bin target).
const BIN = join(here, "..", "dist", "index.js");

function run(args: string[], env: NodeJS.ProcessEnv = {}): { code: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(process.execPath, [BIN, ...args], {
      encoding: "utf8",
      env: { ...process.env, ...env },
      timeout: 10_000,
    });
    return { code: 0, stdout, stderr: "" };
  } catch (err) {
    const e = err as { stdout?: string; stderr?: string; status?: number };
    return { code: e.status ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? "" };
  }
}

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "agent-replay-cli-"));
});
afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("cli", () => {
  it("prints help with no args", () => {
    const { code, stdout } = run([]);
    expect(code).toBe(0);
    expect(stdout).toContain("USAGE");
    expect(stdout).toContain("COMMANDS");
  });

  it("version prints a semver string", () => {
    const { code, stdout } = run(["version"]);
    expect(code).toBe(0);
    expect(stdout.trim()).toMatch(/^\d+\.\d+\.\d+/);
  });

  it("unknown command exits non-zero", () => {
    const { code } = run(["nope"]);
    expect(code).not.toBe(0);
  });

  it("info summarizes a recording file", () => {
    const file = join(dir, "run.replay.jsonl");
    writeFileSync(file, FIXTURE);
    const { code, stdout } = run(["info", file]);
    expect(code).toBe(0);
    expect(stdout).toContain("recording:");
    expect(stdout).toContain("events:");
  });

  it("play renders an event timeline", () => {
    const file = join(dir, "run.replay.jsonl");
    writeFileSync(file, FIXTURE);
    const { code, stdout } = run(["play", file]);
    expect(code).toBe(0);
    expect(stdout).toContain("message.user");
  });

  it("export → import round-trips events", () => {
    const jsonl = join(dir, "run.replay.jsonl");
    const archive = join(dir, "run.replay");
    const back = join(dir, "back.replay.jsonl");
    writeFileSync(jsonl, FIXTURE);

    expect(run(["export", jsonl, archive]).code).toBe(0);
    // The archive must be gzip (magic bytes 0x1f 0x8b).
    const head = readFileSync(archive).subarray(0, 2);
    expect(head[0]).toBe(0x1f);
    expect(head[1]).toBe(0x8b);

    expect(run(["import", archive, back]).code).toBe(0);
    const restored = readFileSync(back, "utf8").trim().split("\n");
    expect(restored.length).toBeGreaterThan(0);
    expect(JSON.parse(restored[0]).name).toBe("session.meta");
  });

  it("diff prints a change summary", () => {
    const a = join(dir, "a.replay.jsonl");
    const b = join(dir, "b.replay.jsonl");
    writeFileSync(a, FIXTURE);
    writeFileSync(b, FIXTURE.replace("hello", "hi there"));
    const { code, stdout } = run(["diff", a, b]);
    expect(code).toBe(0);
    expect(stdout).toMatch(/events|changed|same/i);
  });
});

const FIXTURE = [
  JSON.stringify({
    id: "evt_1",
    ts: 1_000,
    kind: "meta",
    name: "session.meta",
    level: "info",
    spanId: "root",
    parentId: null,
    data: { name: "t", protocol: "0.1.0", startedAt: 1_000 },
  }),
  JSON.stringify({
    id: "evt_2",
    ts: 1_100,
    kind: "message",
    name: "message.user",
    level: "info",
    spanId: "root",
    parentId: null,
    data: { role: "user", content: "hello" },
  }),
].join("\n") + "\n";
