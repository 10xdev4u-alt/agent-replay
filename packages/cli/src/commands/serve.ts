/**
 * serve — expose recordings + the viewer UI over HTTP.
 *
 * Static server with two roots: recording files from the recordings dir,
 * and the built viewer UI from the viewer dist. GET / → the viewer app,
 * GET /index.json → list of recordings, GET /<file> → a recording.
 * CORS open so a dev-mode viewer on another port can fetch recordings.
 * No deps — just node:http.
 */
import { createServer } from "node:http";
import { readdir, readFile, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve, join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const PORT = Number(process.env.AGENT_REPLAY_PORT ?? 4319);
const HOST = process.env.AGENT_REPLAY_HOST ?? "127.0.0.1";

const here = dirname(fileURLToPath(import.meta.url));
// dist lives at packages/viewer/dist in dev, bundled into the cli bin in prod.
function findViewerDist(): string | null {
  for (const candidate of [
    "../../../../viewer/dist",
    "../../../viewer/dist",
    "../../viewer/dist",
  ]) {
    const p = resolve(here, candidate);
    if (existsSync(join(p, "index.html"))) return p;
  }
  return null;
}

export async function serve(args: string[]): Promise<number> {
  const dir = args[0] ? resolve(args[0]) : process.cwd();

  try {
    await stat(dir);
  } catch {
    console.error(`directory not found: ${dir}`);
    return 1;
  }

  const viewerDist = findViewerDist();
  if (!viewerDist) {
    console.error("viewer dist not found — run `pnpm --filter @agent-replay/viewer build`");
  }

  const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!req.url) return send(res, 400, "bad request");

    try {
      // Recordings index.
      if (req.url === "/index.json") {
        const files = await listRecordings(dir);
        return json(res, 200, { dir, files });
      }

      const safe = req.url.replace(/^\/+/, "").replace(/\.\./g, "");

      // Recording file from the recordings dir (takes precedence).
      try {
        const recPath = join(dir, safe);
        const recStat = await stat(recPath);
        if (recStat.isFile()) {
          const body = await readFile(recPath, "utf8");
          return send(res, 200, body, mime(safe));
        }
      } catch {
        // not a recording file — fall through to viewer assets
      }

      // Viewer UI. `/` and unknown routes serve index.html (SPA fallback).
      if (viewerDist) {
        const assetPath = safe ? join(viewerDist, safe) : join(viewerDist, "index.html");
        try {
          const assetStat = await stat(assetPath);
          if (assetStat.isFile()) {
            const body = await readFile(assetPath);
            return send(res, 200, body.toString("utf8"), mime(safe || "index.html"));
          }
        } catch {
          // SPA fallback: any unknown non-file route renders index.html.
        }
        const indexHtml = await readFile(join(viewerDist, "index.html"));
        return send(res, 200, indexHtml.toString("utf8"), "text/html; charset=utf-8");
      }

      return send(res, 404, "not found");
    } catch (err) {
      return send(res, 404, err instanceof Error ? err.message : "not found");
    }
  });

  server.listen(PORT, HOST, () => {
    console.error(`agent-replay serve → http://${HOST}:${PORT}`);
    console.error(`recordings: ${dir}`);
    if (viewerDist) console.error(`viewer:    ${viewerDist}`);
    console.error("ctrl-c to stop");
  });

  // Run until killed.
  return new Promise(() => {});
}

async function listRecordings(dir: string): Promise<Array<{ name: string; size: number }>> {
  const entries = await readdir(dir, { withFileTypes: true });
  const out: Array<{ name: string; size: number }> = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!e.name.endsWith(".replay.jsonl") && !e.name.endsWith(".replay")) continue;
    const s = await stat(join(dir, e.name));
    out.push({ name: e.name, size: s.size });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

function json(res: import("node:http").ServerResponse, status: number, body: unknown): void {
  send(res, status, JSON.stringify(body, null, 2), "application/json");
}

function send(
  res: import("node:http").ServerResponse,
  status: number,
  body: string,
  contentType = "text/plain; charset=utf-8",
): void {
  res.writeHead(status, { "Content-Type": contentType });
  res.end(body);
}

function mime(path: string): string {
  const ext = extname(path);
  if (ext === ".jsonl" || ext === ".json") return "application/jsonl";
  if (ext === ".html") return "text/html";
  return "application/octet-stream";
}
