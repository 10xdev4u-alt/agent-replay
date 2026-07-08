#!/usr/bin/env node
/**
 * agent-replay CLI entry point.
 *
 * Subcommand router. Uses Node's built-in parseArgs — zero runtime deps.
 */
import { parseArgs } from "node:util";
import { record } from "./commands/record.js";
import { play } from "./commands/play.js";
import { serve } from "./commands/serve.js";
import { info } from "./commands/info.js";
import { version } from "./commands/version.js";
import { exportCmd } from "./commands/export.js";
import { importCmd } from "./commands/import.js";
import { diff } from "./commands/diff.js";
import { convert } from "./commands/convert.js";

const COMMANDS = new Map<string, (args: string[]) => Promise<number>>([
  ["record", record],
  ["play", play],
  ["serve", serve],
  ["info", info],
  ["version", version],
  ["export", exportCmd],
  ["import", importCmd],
  ["diff", diff],
  ["convert", convert],
]);

function printHelp(): void {
  console.log(`agent-replay — time-travel replay for AI agents

USAGE
  agent-replay <command> [options]

COMMANDS
  record <script>     Record a Node script's agent run to a .replay.jsonl file
  play   <file>       Print a recorded session as a readable timeline
  serve   [dir]       Serve recordings over HTTP for the viewer
  info    <file>      Print summary stats for a recording
  export <in> <out>   Convert .replay.jsonl → portable .replay archive
  import <in> <out>   Convert .replay archive → .replay.jsonl
  diff <a> <b>        Diff two recordings, show what changed
  convert <in> <out>  Auto-detect format and convert jsonl ↔ archive
  version             Print the installed version

OPTIONS
  -h, --help          Show this help
  -v, --version       Print version

EXAMPLES
  agent-replay record ./my-agent.ts
  agent-replay play run.replay.jsonl
  agent-replay serve ./recordings
  agent-replay diff base.replay.jsonl new.replay.jsonl
`);
}

async function main(): Promise<number> {
  const { values, positionals } = parseArgs({
    options: {
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
    allowPositionals: true,
    strict: false,
  });

  if (values.help || positionals.length === 0) {
    printHelp();
    return 0;
  }

  if (values.version) {
    return version([]);
  }

  const [cmd, ...rest] = positionals;
  const handler = COMMANDS.get(cmd);
  if (!handler) {
    console.error(`unknown command: ${cmd}`);
    printHelp();
    return 1;
  }

  return handler(rest);
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exit(1);
  });
