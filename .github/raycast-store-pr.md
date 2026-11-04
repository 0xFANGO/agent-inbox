<!-- Proposed upstream title: Add Agent Inbox extension -->
<!-- Local review draft. Before sending upstream, replace the screenshot links below with public URLs from the submission fork. -->

## Description

Add **Agent Inbox**, a Raycast extension for macOS that brings existing Claude Code and Codex conversations into one inbox. Developers can subscribe to selected sessions, see which conversations need input, and return to the corresponding desktop conversation, terminal tab, or tmux pane.

| Command                           | Purpose                                                                                       |
| --------------------------------- | --------------------------------------------------------------------------------------------- |
| Subscribe to Current Conversation | Subscribe to the focused conversation from Raycast search or a dedicated hotkey.              |
| All Sessions                      | Find conversations by title, project, or session ID; optionally search local message content. |
| Subscriptions                     | View subscribed sessions, jump back with Return, and mark requests handled.                   |
| Session Menu Bar                  | View subscribed sessions and the number waiting for input.                                    |

### Setup and data handling

The extension requires an existing Claude Code or Codex installation. **Connect an Agent** in the action panel installs local hooks and a user LaunchAgent, with backups of modified configuration. The setup guide documents permissions, data locations, and removal steps.

Conversation files are read-only. Session state and optional full-text indexes stay on the Mac; full-text indexing is disabled by default. Agent Inbox does not upload conversations or approve agent requests.

Clickable system notifications use `terminal-notifier`. Claude cloud-only conversations support subscription and navigation, but cannot provide status monitoring without local hooks or transcripts.

### Validation

- Fresh installation, `npm run check`, and `npm run lint` passed in `extensions/agent-inbox`, including 152 tests with no failures or skips.
- The distribution build was tested in native Raycast: focused subscription, list filtering, cloud indicators, mark-handled behavior, and unsubscribe behavior.
- Manual checks covered Codex desktop navigation, return to the original terminal tab, and a real Claude Code question-to-answer lifecycle.
- **Pending:** system notification delivery and notification-click navigation. Terminal applications and tmux have not each received separate live verification; the detailed coverage is recorded in `TESTING.md`.

## Screencast

Three 2000 × 1250 PNG screenshots show the subscription inbox, session browser, and conversation details using fictional sessions and a consistent theme.

![Subscriptions](../metadata/agent-inbox-1.png)

![All Sessions](../metadata/agent-inbox-2.png)

![Session details](../metadata/agent-inbox-3.png)

## Checklist

- [x] I read the [extension guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store).
- [x] I read the [documentation about publishing](https://developers.raycast.com/basics/publish-an-extension).
- [x] I ran `npm run build` and tested this distribution build in Raycast.
- [x] I checked that files in the `assets` folder are used by the extension itself.
- [x] I checked that assets used in the README are located outside the metadata folder if they were not generated with the metadata tool.
