/**
 * serve — expose recordings over HTTP for the viewer.
 *
 * Minimal static server: GET / → index of recordings, GET /<file> → the raw
 * JSONL. CORS open so the viewer (running on another port) can fetch them.
 * No deps — just node:http.
 */
import { createServer } from "node:http";
import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, join, extname } from "node:path";

const PORT = Number(process.env.AGENT_REPLAY_PORT ?? 4319);
const HOST = process.env.AGENT_REPLAY_HOST ?? "127.0.0.1";

export async function serve(args: string[]): Promise<number> {
  const dir = args[0] ? resolve(args[0]) : process.cwd();

  try {
    await stat(dir);
  } catch {
    console.error(`directory not found: ${dir}`);
    return 1;
  }

  const server = createServer(async (req, res) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    if (!req.url) return send(res, 400, "bad request");

    try {
      if (req.url === "/" || req.url === "/index.json") {
        const files = await listRecordings(dir);
        return json(res, 200, { dir, files });
      }
      // Strip leading slash, prevent path traversal.
      const safe = req.url.replace(/^\/+/, "").replace(/\.\./g, "");
      const path = join(dir, safe);
      const s = await stat(path);
      if (!s.isFile()) return send(res, 404, "not a file");
      const body = await readFile(path, "utf8");
      return send(res, 200, body, mime(safe));
    } catch (err) {
      return send(res, 404, err instanceof Error ? err.message : "not found");
    }
  });

  server.listen(PORT, HOST, () => {
    console.error(`agent-replay serve → http://${HOST}:${PORT}`);
    console.error(`serving: ${dir}`);
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
