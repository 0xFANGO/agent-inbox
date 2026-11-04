import { CLAUDE_BUNDLE, findClaudeDesktopSession, readClaudeDesktopSessions, sameClaudeBridgeId } from "./claude-desktop";
import { CODEX_APP_BUNDLE } from "./adapters/codex";
import { FocusedWindow, readFocusedWindow } from "./focused-window";
import { fromHistory } from "./merge";
import { bundleFor, frontTty, tmuxClients, TERMINAL_BUNDLES } from "./terminal";
import { Session } from "./types";

export interface ForegroundContext {
  bundleId?: string;
  window?: FocusedWindow;
  tty?: string;
}

/** Capture focus before reading history or the database, which may take time. */
export async function captureForeground(bundleId: string | undefined): Promise<ForegroundContext> {
  if (bundleId === CLAUDE_BUNDLE || bundleId === CODEX_APP_BUNDLE) return { bundleId, window: await readFocusedWindow(bundleId) };
  return { bundleId, tty: bundleId ? await frontTty(bundleId) : undefined };
}

function unique(sessions: Session[]): Session | undefined {
  return sessions.length === 1 ? sessions[0] : undefined;
}

function documentId(bundleId: string, raw: string): string | undefined {
  try {
    const url = new URL(raw.includes("://") ? raw : `https://${raw}`);
    if (bundleId === CLAUDE_BUNDLE && url.hostname === "claude.ai") {
      return url.pathname.match(/^\/(?:epitaxy|code)\/((?:local_|session_|cse_)[A-Za-z0-9-]+)\/?$/)?.[1];
    }
    if (bundleId === CODEX_APP_BUNDLE && ["app:", "codex:"].includes(url.protocol)) {
      return `${url.hostname}${url.pathname}`.match(/(?:^|\/)threads?\/([a-f0-9-]{36})(?:\/|$)/i)?.[1];
    }
  } catch {
    // Missing or unsupported document URL.
  }
  return undefined;
}

/** Match actual window identity. Background activity and lastFocusedAt are not current focus. */
export async function sessionForForeground(
  context: ForegroundContext,
  sessions: Session[],
  actions = { readClaudeDesktopSessions, tmuxClients },
): Promise<Session | undefined> {
  const { bundleId, window, tty } = context;
  if (!bundleId) return undefined;
  if (bundleId === CLAUDE_BUNDLE || bundleId === CODEX_APP_BUNDLE) {
    if (!window) return undefined;
    const agent = bundleId === CLAUDE_BUNDLE ? "claude" : "codex";
    const desktop = agent === "claude" ? actions.readClaudeDesktopSessions() : [];
    const candidates = sessions.filter((s) => s.agent === agent && s.host === "app");
    // Include old desktop sessions even if they fall outside the history scan limit.
    for (const r of desktop) {
      if (r.isArchived || candidates.some((s) => s.locator.claudeDesktopId === r.sessionId)) continue;
      const existing = sessions.find((s) => s.agent === "claude" && s.sessionId === (r.cliSessionId || r.sessionId));
      if (existing && candidates.includes(existing)) candidates.splice(candidates.indexOf(existing), 1);
      candidates.push({
        ...(existing ??
          fromHistory({
            agent: "claude",
            sessionId: r.cliSessionId || r.sessionId,
            host: "app",
            title: r.title,
            cwd: r.cwd,
            summary: "",
            startedAt: r.createdAt,
            updatedAt: r.lastActivityAt,
            transcriptPath: "",
          })),
        host: "app",
        title: r.title || existing?.title || "",
        locator: { ...existing?.locator, claudeDesktopId: r.sessionId },
      });
    }
    const id = documentId(bundleId, window.url);
    if (id) {
      const localId = agent === "claude" ? findClaudeDesktopSession(id, desktop)?.sessionId : undefined;
      return unique(
        candidates.filter(
          (s) =>
            s.sessionId === id ||
            s.locator.claudeDesktopId === id ||
            (localId && s.locator.claudeDesktopId === localId) ||
            (agent === "claude" && sameClaudeBridgeId(s.sessionId, id)),
        ),
      );
    }
    // A known non-conversation document (home, settings, ordinary Claude chat) must not match by title.
    if (window.url && agent === "claude") return undefined;
    if (agent === "claude" && !/\s+[-–—]\s+Claude Code$/.test(window.title)) return undefined;
    const title = window.title.replace(/\s+[-–—]\s+(?:Claude(?: Code)?|Codex)$/, "").trim();
    if (!title || /^(?:Claude(?: Code)?|Codex)$/.test(title)) return undefined;
    return unique(candidates.filter((s) => s.title === title));
  }

  const cli = sessions.filter((s) => s.host === "cli");
  if (!tty || !(TERMINAL_BUNDLES.has(bundleId) || cli.some((s) => bundleFor(s.locator) === bundleId))) return undefined;
  const sockets = [...new Set(cli.filter((s) => s.locator.tmuxPane).map((s) => s.locator.tmuxSocket))];
  const clients = (await Promise.all(sockets.map((socket) => actions.tmuxClients(socket)))).flat().filter((c) => c.tty === tty);
  if (clients.length)
    return unique(cli.filter((s) => clients.some((c) => s.locator.tmuxPane === c.pane && s.locator.tmuxSocket === c.socket)));
  // No app-wide "most recent" fallback: it can select a different tab or background agent.
  return unique(cli.filter((s) => s.locator.tty === tty && !s.locator.tmuxPane));
}
