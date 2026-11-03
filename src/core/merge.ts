import { HistoryEntry, Session } from "./types";

const key = (s: { agent: string; sessionId: string }) => `${s.agent}:${s.sessionId}`;

export function fromHistory(h: HistoryEntry): Session {
  return { ...h, status: "idle", attention: null, locator: {}, subscribed: false, handledAt: null };
}

/**
 * Hook rows win over transcripts; transcripts only fill gaps (and missing titles / last messages).
 */
export function mergeSessions(rows: Session[], history: HistoryEntry[]): Session[] {
  const byKey = new Map<string, Session>();
  for (const r of rows) byKey.set(key(r), r);
  for (const h of history) {
    const existing = byKey.get(key(h));
    if (!existing) byKey.set(key(h), fromHistory(h));
    else
      byKey.set(key(h), {
        ...existing,
        title: existing.title || h.title,
        summary: existing.summary || h.summary,
        cwd: existing.cwd || h.cwd,
        transcriptPath: existing.transcriptPath || h.transcriptPath,
      });
  }
  return [...byKey.values()].sort((a, b) => b.updatedAt - a.updatedAt);
}
