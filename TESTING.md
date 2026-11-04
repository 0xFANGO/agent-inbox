# Test Record

**English** | [简体中文](TESTING.zh-CN.md)

Records dated 2026-11-04, Asia/Shanghai. Historical checkpoints below describe checks performed at those stages; they are not claims that every live workflow was rerun for the current change.

## Session list shortcuts and presentation

- `npm run check`: 150 tests, TypeScript, ESLint, Prettier, CLI bundling, and Raycast build passed. `npm run lint` passed, including Store screenshot metadata.
- In native Raycast with isolated demonstration data, verified that Return dispatches the selected session to navigation without changing subscription, and Command-Return subscribes or unsubscribes. In Subscriptions, unsubscribing removed the row and updated the section count immediately. Navigation destinations were recorded in the fixture rather than opening real conversations; this does not replace the live integration checks below.
- Checked default session focus, action-menu shortcuts, list density, and detail mode in both themes. Three Store screenshots use the same dark theme and background, 2000 × 1250 PNG, and illustrative session content. The original Raycast theme, preferences, and development build were restored afterward.

## English interface and native preferences

- `npm run check`: **150/150 tests passed**, no skips, plus TypeScript, ESLint, Prettier, CLI bundling, and all three Raycast commands.
- `npm run lint`: manifest, author `silencerichard`, icon, extension skills, ESLint, and Prettier all passed. This resolves the earlier author lookup failure recorded below.
- Added regression coverage for native preferences reaching the collector configuration, including false values, terminal fallback, preserved custom channels, and English message substitution.
- Loaded the development build in Raycast. Verified English All Sessions labels, the action menu's Connect an Agent entry, the connection panel, and the native preferences for terminal, notifications, and opt-in full-text search.
- No Store publishing command was run. Notification clicks and end-to-end terminal navigation were not rerun for this interface change.

`npm test` rebuilds the CLI before testing. Database, configuration, and installation tests use temporary directories and clean up afterward. Navigation tests inject interfaces instead of opening terminals or sending agent messages.

## Open-source preparation checkpoint

- Full checks passed on Node 24.22.1. Fresh temporary installs with `npm ci` also passed on Node 22.22.2 and 26.13.0: 148 tests in each environment. The environment used npm 11.19.1 and system SQLite 3.51.0.
- CLI help first reproduced the old exit-2 behavior. After the fix, `--help`, `-h`, and `help` returned successfully without stderr or state files, including when SQLite was unavailable.
- The isolated [CLI example](docs/cli.md) printed `Demo session: needs_input`. Relative documentation links and the shared product description were checked.
- The `.rayext` bundle included the then-four commands, helper CLI, icons, license, and runtime dependencies. Source maps exposing build paths were removed; tests, docs, skills, and Git data were excluded.
- At this checkpoint the old author `0xFango` returned HTTP 404, and the new CI workflow had not yet been pushed or run. That author issue is resolved by the current checks above.

## Title synchronization checkpoint

- Full checks passed with 147 tests. Thirteen new regressions covered separate and legacy Claude title records, titles preceding 3 MB tool output, partial writes/truncation, missing files, source priorities, cloud IDs/aliases/conflicts, Codex rename persistence, stale/concurrent observations, 1,100-title batches, and current titles at notification delivery.
- Native probes only read open windows' outer documents. They excluded nested artifacts and sidebar titles, bounded traversal, and did not focus windows or launch Claude.
- An isolated copy of the real database, with notifications off, tested six existing subscriptions. The collector restored one deliberately stale cloud title in 242 ms while all other session fields remained unchanged. No real conversation was renamed.
- At that earlier checkpoint, the installed CLI and collector were updated. Readback confirmed a running service and advancing cloud title observations without changing unknown state, zero activity time, or subscription. The pre-update backup was `~/.sessions/backups/title-sync-20261104-161241/`.
- Hidden or closed cloud sessions still require the client to display them before their titles can sync.

## Claude Cloud subscription checkpoint

- A real Code window exposed an explicit `session_*` ID absent from local metadata and the hook database. The earlier matcher incorrectly required a local candidate.
- Regressions covered exact-ID cloud subscription, persistence/deduplication, invalid or conflicting routes, retained real events, unknown dates, and the cloud jump route, alongside existing bridge mapping tests.
- Using the observed window ID, the real matcher and store saved the session. Raycast displayed its title and unavailable cloud status, with no reminder claim. No conversation or remote task was edited.
- Automated current-window capture returned to Codex instead of Claude, so the Claude focus-restoration button path was not counted as passed. The cloud jump was not executed while the user was editing a draft.

## State, collection, and notification checkpoint

- Ordinary stop events resolve to `ready`; only explicit `completed` events assert task completion. Structured pending requests remain authoritative.
- Tests covered Claude/Codex hooks, asynchronous question acknowledgments, per-question replies, unrelated tools, late/cross-turn events, late snapshots, chunking, partial records, rotation, oversized output, and database migration.
- Ten concurrent writers tested revision handling. Two fake channels tested persistent delivery, stable retry IDs, and cancellation after handling, unsubscribing, or resolution. No Feishu message was sent.
- A temporary copy of real state with notifications disabled restored two Claude and three Codex sessions into waiting, running, and turn-ended states, without collection errors or queued alerts. Subsequent passes resumed from persistent offsets.
- Local Codex CLI 0.163.0 hook names were checked; unsupported `PostToolUseFailure` was not installed. DeepSeek Harness and extra channels remained interfaces only.
- At that checkpoint, real CLI/hooks/collector were updated with backups under `~/.sessions/backups/state-channels-20261104-151754/`. The collector ran with empty stderr and no bootstrap notifications, while unrelated hooks, configuration, and existing Codex notify forwarding were preserved.
- Regressions also fixed mixed-matcher hook removal, commented notify parsing, CLI error exit codes, missing install directories, cross-chunk records, desktop/CLI ID confusion, incorrect foreground guesses, tmux/Ghostty targeting, and the race between history subscription and a new hook row.

## Earlier interface and search checkpoints

The earlier 108-, 102-, and 80-test stages passed their full checks. Their old Settings screen and Chinese labels are historical; the current interface is described above.

- Subscription grouping excluded handled/unsubscribed sessions and assigned each row to exactly one section. Archiving checked current state/revisions so it could not hide concurrent hook updates.
- A 6.70 MB Claude transcript was sampled with a 96 KB tail in 1.28 ms cold and 0.028 ms cached. It then inferred `done`; the later state change replaced that interpretation with `ready`. No original file or database was changed by that measurement.
- A roughly 22 MB transcript reproduced the mid-read `AbortError` that the old pre-start cancellation test missed. Regressions covered several cancellation points and successful subsequent indexing.
- Live Raycast checks covered title/body searches, empty results, snippets, opt-in messaging, cancellation without index writes, navigation with Delete, and connection entry points. Full-text search was not enabled on the user's behalf.
- Local search sample: 237 files, 1.389 GB; first index 4.38 seconds, index size 17.9 MB; warm refresh 43.8 ms with one changed file; queries 2.5–8.8 ms plus 180 ms debounce; peak RSS about 308 MB; event-loop p99/max delay 13.8/17.2 ms. These are local measurements, not guarantees.
- Codex desktop checks used package analysis, local metadata, and synthetic navigation interfaces. Full live subscription/jump verification was not completed. See the [original Codex investigation (Chinese)](docs/codex-session-investigation.md).

## Earlier live navigation checks

- History, search, details, onboarding, and connection previews rendered in Raycast.
- Claude desktop records retained desktop identity, while explicit CLI copies stayed CLI. A mapped local desktop ID opened the expected Claude Code conversation.
- Earlier current-window checks matched Claude and Codex page titles. Later read-only native AXURL probes verified local/cloud IDs and subscription using a native local ID. Temporary subscription flags were restored.
- Terminal choices included Terminal, iTerm2, and Ghostty without changing the user's selection. Native probe logs were removed from source. See the [original Claude investigation (Chinese)](docs/claude-session-investigation.md).

## Still requiring live validation

- The complete start/run/original-tab workflow in each supported terminal.
- Real hook → system notification → notification click → handled state → menu-bar count, including permission prompts.
- Clickable notifications with `terminal-notifier`; it was absent during the earlier connection checks.
- The current Codex desktop window-to-session and jump-to-target workflow.
