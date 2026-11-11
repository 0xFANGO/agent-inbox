# Agent Inbox

Raycast extension for macOS that subscribes to Claude Code and Codex sessions,
notifies when one needs input, and jumps back to the conversation. TypeScript
and React (`@raycast/api`), plus a standalone helper CLI bundled with esbuild.
Tests use `node:test`. User-facing behavior is covered in `README.md` and
`docs/`; this file is for working on the code.

## Layout

```
src/*.tsx, src/subscribe-current.ts   Raycast command entry points (match `commands` in package.json)
src/components/                       Shared Raycast UI
src/lib/                              Raycast-specific services (preferences, launch, SQL access)
src/core/                             Shared core: event engine, state machine, SQLite, navigation
  adapters/                           Per-agent detection, hook setup, hook parsing, jump
  sources/                            Transcript reads, history discovery, background collector
  notifications/                      Channel-independent messages; macOS is the only channel
cli/agent-inbox.ts                    Entry point of the helper CLI used by hooks and the collector
assets/agent-inbox.mjs                Generated CLI bundle (tracked) plus runtime icons
test/*.test.ts                        Regression tests; shared fixtures in test/helpers.ts
docs/, media/, metadata/              Guides, brand sources, Store screenshots
```

`docs/architecture.md` describes the data flow; `docs/integrations.md` holds the
state contract and the interfaces for new sources and notification channels.

## Setup and commands

Needs macOS, Node.js 22.22.2 or later (`.nvmrc` selects 24), and the system
`sqlite3`. `npm run dev` and the live checks also need Raycast.

- `npm ci` installs dependencies.
- `npm run check` is the full gate and what CI runs: `npm test`, then
  `npm run typecheck`, `npm run lint:code`, and `npm run build`.
- `npm test` rebuilds the CLI bundle first (`pretest`), bundles `test/*.test.ts`
  into the git-ignored `.test-build/`, and runs them with `node --test`.
- `npm run typecheck` runs `tsc --noEmit`.
- `npm run lint:code` runs ESLint and `prettier --check` over `src`, `cli`, and `test`.
- `npm run build:cli` regenerates `assets/agent-inbox.mjs`.
- `npm run build` runs `build:cli`, then `ray build -e dist`.
- `npm run bundle` writes the installable `dist/agent-inbox.rayext`.
- `npm run dev` loads the development extension into Raycast (`ray develop`).
- `npm run lint` (`ray lint`) validates the Raycast manifest, icon, and author
  account. It needs network access; run it before opening a pull request.

## Before you commit

- Run `npm run check`. CI runs it on macOS with Node 22.22.2, 24, and 26, then
  fails if `git diff --exit-code -- assets/agent-inbox.mjs` reports a change,
  then runs `npm run bundle`.
- After changing anything under `src/core` or `cli`, commit the regenerated
  `assets/agent-inbox.mjs` together with the source change.
- Style comes from `.prettierrc` (120 columns, double quotes), `.editorconfig`
  (2 spaces, LF), and `eslint.config.js`. Avoid unrelated formatting changes.
- The pull request template asks for the problem and result, the checks actually
  performed (and those not run), and any effect on hooks, state, or data formats.

## Things to get right

- Never edit `assets/agent-inbox.mjs` by hand. Hooks and the background
  collector run it outside Raycast, and Store builds do not run `build:cli`,
  so the tracked bundle must match the source.
- Keep `src/core` and `cli` free of `@raycast/api` and `@raycast/utils`
  imports. Raycast-specific code belongs in `src/lib`, which injects what the
  core needs (for example `executeSQL`; the CLI uses read-only system `sqlite3`).
- Tests use temporary databases and configuration and must not install real
  hooks or message agents. Use fictional session IDs, paths, and conversation
  content in fixtures.
- State or navigation changes need a reproducible input and a regression test.
- Never guess the target session from recent activity, and never infer task
  completion from a timeout or an ordinary turn ending. `stopped` and
  `completed` are distinct events; see `docs/integrations.md`.
- Agent transcripts are read-only. The extension observes requests; it never
  approves them.
- Automated tests do not prove that real windows, notification clicks,
  permissions, or terminal navigation work. Report automated and live results
  separately (`TESTING.md` shows the format).
- Connecting an agent from the extension edits the user's hook configuration
  and installs a background collector. Do not trigger it as part of a check.

## Documentation

- English is the default. Every guide has a `.zh-CN.md` edition; keep both and
  their language links in sync when features, setup, or compatibility change.
- Interface and notification text is English.
- Update `docs/usage.md` and `CHANGELOG.md` when behavior changes.
