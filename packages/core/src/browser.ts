/**
 * Browser-safe entry — pure logic only, no Node builtins.
 *
 * The recorder/writer/reader touch `fs` and `events`, which don't exist in
 * the browser. The viewer only needs types, the replay engine, filters, and
 * the inspector. Import from `@agent-replay/core/browser` in browser code.
 */
export * from "./types.js";
export * from "./constants.js";
export * from "./factory.js";
export * from "./spans.js";
export * from "./replay.js";
export * from "./inspector.js";
export * from "./filters.js";
