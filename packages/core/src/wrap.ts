/**
 * Wrappers — drop-in instrumentation for any agent loop.
 *
 * Three layers, increasing specificity:
 *   1. wrapAgent(fn)      — record any async function as a span
 *   2. wrapFetch(rec)     — intercept global fetch (prompts + responses)
 *   3. withRecording(fn)  — run a fn with a recorder on process exit
 *
 * All thin. The Recorder is the source of truth; these just feed it.
 */
import { Recorder } from "./recorder.js";
import type { AgentEvent } from "./types.js";

/** Wrap any async function so its execution becomes a named span. */
export function wrapAgent<TArgs extends unknown[], TResult>(
  rec: Recorder,
  name: string,
  fn: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
  return async (...args: TArgs) => {
    const span = rec.span(name);
    try {
      const result = await fn(...args);
      return result;
    } catch (err) {
      rec.error(err, { spanId: span.id });
      throw err;
    } finally {
      span.end();
    }
  };
}

/**
 * Patch global `fetch` so every request/response is recorded.
 *
 * Returns an `uninstall` fn that restores the original. The wrapper tags
 * JSON bodies as prompts and JSON responses as responses; non-JSON passes
 * through untouched. Conservative — never breaks the app.
 */
export function wrapFetch(rec: Recorder): () => void {
  const original = globalThis.fetch;
  if (!original) return () => {};

  const wrapped: typeof fetch = async (input, init) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = init?.method ?? "GET";
    const span = rec.span(`fetch ${method} ${shortUrl(url)}`);

    // Record request body if it looks like an LLM payload.
    if (init?.body) {
      const body = init.body;
      if (typeof body === "string") {
        rec.prompt("http", { url, method, body: preview(body) }, { spanId: span.id });
      }
    }

    try {
      const res = await original(input, init);
      const cloned = res.clone();
      // Fire-and-forget: record the response text without blocking the caller.
      cloned.text().then((text) => {
        rec.response("http", { url, status: res.status, body: preview(text) }, { spanId: span.id });
      }).catch(() => {});
      return res;
    } catch (err) {
      rec.error(err, { spanId: span.id });
      throw err;
    } finally {
      span.end();
    }
  };

  globalThis.fetch = wrapped;
  return () => {
    globalThis.fetch = original;
  };
}

/** Wrap a function so its return value is recorded as a metric event. */
export function recordMetric<T>(
  rec: Recorder,
  name: string,
  fn: () => T | Promise<T>,
  extract?: (result: T) => number,
): () => Promise<T> {
  return async () => {
    const start = Date.now();
    const result = await fn();
    const value = extract ? extract(result) : Date.now() - start;
    rec.metric(name, value);
    return result;
  };
}

/** Run a function with a recorder, auto-flushing on process exit. */
export async function withRecording<T>(
  rec: Recorder,
  fn: (rec: Recorder) => Promise<T>,
): Promise<T> {
  try {
    return await fn(rec);
  } finally {
    rec.end();
  }
}

function preview(s: string, max = 4096): string {
  return s.length > max ? s.slice(0, max) + "…[truncated]" : s;
}

function shortUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}${u.pathname}`;
  } catch {
    return url.slice(0, 64);
  }
}

/** Re-export so callers can type event payloads from wrappers. */
export type { AgentEvent };
