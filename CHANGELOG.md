# Agent Inbox Changelog

**English** | [简体中文](CHANGELOG.zh-CN.md)

These are development records. As of 2026-11-04, no GitHub Release has been published. Dates below describe development, not Store availability.

## [New Product Logo] - 2026-11-04

- Replace extension and README icons with the supplied envelope-and-agents artwork.
- Use a terracotta crab in both themes, pale apricot and charcoal backgrounds, and automatic theme switching.
- Use a simplified envelope outline in the menu bar and retain editable SVG sources.

## [English Interface and Native Preferences] - 2026-11-04

- Use English for commands, interface labels, and notifications; remove the custom language selector and Settings command.
- Move notifications, optional full-text search, and terminal recovery to Raycast preferences. Let Raycast control the menu-bar command, and keep agent connection actions in session lists.
- Correct the Raycast author to `silencerichard` and use it in notification links.
- Provide English defaults and Chinese editions for homepage-linked documentation and English issue/PR templates. Remove the separate publishing guide and move README icons to `media/`.

## [Bilingual Project Overview] - 2026-11-04

- Make English the default README and add a Chinese edition with reciprocal language links.
- Identify Raycast and macOS using branded platform icons.
- Align the English product description and documentation links; describe the interface and command names available at that checkpoint.

## [Open-source Preparation] - 2026-11-04

- Document source installation, first connection, permissions, data locations, and removal; separate quick start from detailed usage.
- Add CLI help, an isolated example, and argument defaults.
- Add the already-declared MIT license, contribution and security documentation, and issue templates.
- Add macOS CI and extension bundling; include the license, strip source maps containing build-machine paths, and document the minimum Node version.
- Record the product and logo brief with limits such as cloud-only monitoring.

## [Session Title Synchronization] - 2026-11-04

- Persist titles separately by session ID and use current names in lists, menu bar, and notifications. Older observations cannot overwrite newer ones.
- Read Claude CLI `custom-title.json` and older transcript rename events alongside Claude desktop metadata and Codex catalogs.
- Passively sync open Claude Cloud window titles. Preserve confirmed names when sources are unavailable, without inferring remote state.
- Preserve subscriptions, handled markers, state, and activity during renames; send no extra alerts and use current titles for queued notifications.

## [Subscription Sections and Settings] - 2026-11-04

- Use Waiting for You, Subscribed, and Completed sections in the subscription list and menu bar.
- Restore initial Claude history state from explicit turn markers while preserving live hooks; include recovered completed sessions in archiving. Later state changes below replace inferred completion with turn-ended semantics.
- Simplify settings labels and remove the separate notification-navigation row.

## [Search and Desktop Compatibility] - 2026-11-04

- Fix actual search filtering. Default to titles, projects, and IDs; make local full-text indexing opt-in and reversible.
- Support user/assistant dialogue, short Chinese terms, incremental refresh, and snippets; fix uncaught `AbortError` when indexing is canceled.
- Add menu-bar visibility control and direct connection results; remove adapter creation and installation previews from the UI.
- Handle Codex native window titles, renamed catalogs, session routes, and focus restoration by capability rather than pinned client versions.
- Persist confirmed desktop origins without losing live state; use external Codex session links and report failed recovery.

## [Navigation and Subscription Updates] - 2026-11-04

- Rename the extension Agent Inbox and organize its initial session, subscription, notification, and settings entry points.
- Put current-window subscription first in All Sessions and add subscription/status filters.
- Show only subscribed sessions in the inbox and notification menu; allow history subscriptions.
- Centralize connection and preferences, and provide subscribe/jump actions on each row.

## [Initial Version] - {PR_MERGE_DATE}

The date placeholder is reserved for the first Raycast Store PR merge. It does not mean the extension is already published.

- Initial inbox, history, current-session subscription, menu-bar, and connection commands.
- Claude Code and Codex CLI/desktop hooks and navigation.
- Initial Chinese/English interface selection, later replaced by the English interface above.

## [State Recognition and Integration Interfaces] - 2026-11-04

- Distinguish turn-ended from completed, preserve unresolved questions/approvals, and migrate earlier inferred completion to turn-ended.
- Add structured Claude/Codex hooks and subscribed transcript collection, including asynchronous Codex desktop acknowledgments and actual answers.
- Add event identities, ordering guards, SQLite concurrency retries, and atomic notification queue entries.
- Separate sources, state, and notification channels; provide macOS delivery with persistence, cancellation, and retry, plus interfaces for future Feishu/DeepSeek Harness support.
- Add the user background collector, automatic list refresh, and status labels.
