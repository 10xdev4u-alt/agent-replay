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

const COMMANDS = new Map<string, (args: string[]) => Promise<number>>([
  ["record", record],
  ["play", play],
  ["serve", serve],
  ["info", info],
  ["version", version],
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
  version             Print the installed version

OPTIONS
  -h, --help          Show this help
  -v, --version       Print version

EXAMPLES
  agent-replay record ./my-agent.ts
  agent-replay play run.replay.jsonl
  agent-replay serve ./recordings
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
