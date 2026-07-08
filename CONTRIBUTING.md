# Contributing to agent-replay

Thanks for your interest! agent-replay is open source and contributions are welcome — bug reports, fixes, features, docs, recordings to use as fixtures.

## Quick start

```bash
git clone https://github.com/10xdev4u-alt/agent-replay.git
cd agent-replay
pnpm install
pnpm build
pnpm test
```

Requires Node 20+ and pnpm 9+.

## Project layout

This is a pnpm monorepo with three packages:

```
packages/
  core/     — recorder, replay engine, types, filters, diff (no DOM deps)
  cli/      — `agent-replay` command (record/play/serve/info/export/import/diff)
  viewer/   — React + Vite web player (imports core/browser entry)
  examples/ — demo agent scripts + sample recordings
```

**Key architectural constraint:** `core` has two entry points — `index.ts` (Node: uses `fs`/`events`) and `browser.ts` (pure logic only). The viewer imports from `/browser` so it bundles cleanly. If you add a module to core, decide which entry it belongs in.

## Development workflow

1. Create a branch: `git checkout -b feat/my-thing`
2. Make your change. Keep commits small and use [conventional commits](https://www.conventionalcommits.org/): `feat(core): add X`, `fix(viewer): handle Y`, `docs: ...`, `test(cli): ...`, `refactor: ...`, `chore: ...`.
3. Before pushing, run the full check:
   ```bash
   pnpm typecheck && pnpm build && pnpm test
   ```
4. Push and open a pull request against `main`.

## What we look for in a PR

- **One thing per PR.** A focused diff is reviewable; a grab-bag isn't.
- **Tests for new logic.** If you add a function with a branch or a loop, add the smallest test that fails if it breaks. We use Vitest.
- **No new dependencies unless necessary.** Prefer the standard library and native platform features. If you need a dep, justify it in the PR description.
- **Types stay strict.** No `any`. The `tsconfig` has `strict`, `noUnusedLocals`, `noUnusedParameters` — keep it green.

## Reporting bugs

Open an issue with:
- What you expected
- What happened
- The smallest recording or script that reproduces it (drag the `.replay.jsonl` into the viewer, screenshot the timeline)

## License

By contributing, you agree that your contributions are licensed under the MIT License.
