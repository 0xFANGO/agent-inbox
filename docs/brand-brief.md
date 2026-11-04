# Agent Inbox: Product and Logo Brief

**English** | [简体中文](brand-brief.zh-CN.md)

## One sentence

Subscribe to Claude Code and Codex sessions, get notified when they need your input, and jump back to the conversation.

Agent Inbox is a macOS Raycast extension for developers working across multiple AI coding sessions. It brings conversations from terminals and desktop clients into a subscription list, showing which sessions are running, which need attention, and where to continue.

## The problem

A developer may have several agents fixing bugs, writing code, or investigating approaches in different projects and windows. One needs permission, another asks a question, and a third has finished its current turn. Checking each window interrupts work, and unanswered requests are easy to miss.

Agent Inbox lets users follow selected sessions, receive a reminder when their input is needed, and return to the original context.

## Current features

| Capability                | What it gives the user                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| All Sessions              | Find Claude Code and Codex conversations by title, project, or ID, including past work                                         |
| Subscriptions             | Follow selected sessions; temporarily dismiss handled work until a new state or request arrives                                |
| Status and notifications  | Distinguish running, waiting, turn ended, explicitly completed, and unknown; notify only for subscribed work needing attention |
| Return to context         | Focus the original desktop conversation, terminal tab, or tmux pane, with recovery options when exact targeting fails          |
| Menu bar                  | See subscribed sessions and a waiting count                                                                                    |
| Optional full-text search | Enable a local index of user and agent messages and see matching excerpts                                                      |
| Title synchronization     | Keep lists, menu bar, and notifications aligned with current source titles                                                     |

Typical workflow: subscribe to two project sessions → do other work → an agent requests confirmation → receive a notification → jump to that conversation → respond and continue.

## Product boundaries

- It manages existing conversations. It does not orchestrate agents, assign work, generate code, or approve requests.
- The current platform is Raycast on macOS. Built-in sources are Claude Code and Codex; the built-in notification channel is macOS.
- Cloud-only Claude Code sessions can be subscribed to and reopened using explicit window IDs, and open-window titles can sync. Without local records or hooks, monitoring and input reminders are unavailable.
- State and optional search indexes stay on the Mac. There is no cross-device cloud sync.
- “Turn ended” does not mean the entire task is complete. Brand copy should preserve that distinction.

## Visual direction

The core ideas are **gather conversations, signal attention, and return to context**. Aim for a quiet, clear desktop utility.

Start with an inbox tray and one pending-status dot. The tray represents collected sessions; the dot indicates something needs the user. The opening or negative space can suggest a conversation bubble while retaining one main silhouette.

Another direction is two conversation lines converging into one entry point. A return arrow can be a secondary shape. Avoid combining a tray, bell, robot, code brackets, and lightning bolt in one icon.

Give the product its own mark. Claude and OpenAI icons identify sources; they should not be combined into the main logo. Use **Agent Inbox** for a wordmark and a standalone symbol in the menu bar and command list.

## Deliverables

- Editable vector artwork and a standalone icon.
- Light and dark background variants, plus a monochrome menu-bar version.
- Legible silhouettes and negative space at 16, 20, and 32 pixels; no status dot dependent on a thin outline.
- A 512 × 512 PNG Raycast icon. Replace `assets/extension-icon.png` and run `npm run lint`.
- A horizontal wordmark for the README and GitHub page.

## Designer prompt

> Design a logo for Agent Inbox, a macOS developer tool. It gathers coding conversations from Claude Code and Codex into a subscription inbox, signals when an agent needs an answer or permission, and helps users return to the original conversation. Focus on collected conversations, pending attention, and returning to context. Explore a simple inbox tray with one status dot and optional conversation-bubble negative space. Keep the silhouette clear and the spacing generous so it works at small sizes and in monochrome. Deliver a standalone icon, an Agent Inbox wordmark combination, and light/dark variants.
