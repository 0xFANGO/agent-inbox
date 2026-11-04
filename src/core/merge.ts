import { HistoryEntry, Session } from "./types";
import { recoverIdleSessionStates } from "./transcript-state";

const key = (s: { agent: string; sessionId: string }) => `${s.agent}:${s.sessionId}`;

export function fromHistory(h: HistoryEntry): Session {
  return recoverIdleSessionStates([historySession(h)])[0];
}

function historySession(h: HistoryEntry): Session {
  return { ...h, status: "idle", attention: null, locator: h.locator ?? {}, subscribed: false, handledAt: null };
}

/**
 * Hook rows win over metadata; only idle status may recover an explicit terminal state from
 * the transcript. All recovery is for display and leaves the original rows unchanged.
 */
export function mergeSessions(rows: Session[], history: HistoryEntry[]): Session[] {
  const byKey = new Map<string, Session>();
  for (const r of rows) byKey.set(key(r), r);
  for (const h of history) {
    const existing = byKey.get(key(h));
    if (!existing) byKey.set(key(h), historySession(h));
    else
      byKey.set(key(h), {
        ...existing,
        title: existing.title || h.title,
        summary: existing.summary || h.summary,
        cwd: existing.cwd || h.cwd,
        transcriptPath: existing.transcriptPath || h.transcriptPath,
        locator: { ...h.locator, ...existing.locator },
      });
  }
  return recoverIdleSessionStates([...byKey.values()]).sort((a, b) => b.updatedAt - a.updatedAt);
}
