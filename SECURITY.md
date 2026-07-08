# Security Policy

## Reporting a Vulnerability

agent-replay is a developer tool that processes recording files. If you find a
security issue, please report it responsibly:

- **Do NOT open a public GitHub issue.**
- Email **10xdev4u@gmail.com** with details and a reproduction if possible.
- You'll get an acknowledgment within 72 hours.

## Scope

agent-replay reads `.replay.jsonl` and `.replay` files. Treat recordings from
untrusted sources like any untrusted input — a malicious recording can contain
arbitrary JSON payloads in event `data` fields. The tooling validates event
**shape** but does not sanitize event **contents**.

Out of scope:

- The `wrapFetch` helper records request/response bodies. If your agent handles
  secrets, scrub them before recording or avoid wrapping those calls. This is
  documented behavior, not a vulnerability.
- Recordings may contain PII from your agent's inputs. Don't share recordings
  publicly without reviewing their contents.

## Supported Versions

Only the latest minor release receives security fixes.

## Hardening Tips

- Set `maxPayloadBytes` on the `Recorder` to cap oversized payloads.
- Use `lenient: false` when reading trusted files to fail fast on tampering.
- Run the viewer in a sandbox if loading untrusted recordings.
