import { statSync } from "node:fs";
import { ClaudeTurnState, claudeTurnState, readHeadTail } from "./transcript";
import { Session } from "./types";

const TAIL_BYTES = 96 * 1024;

interface CachedState {
  mtime: number;
  size: number;
  state: ClaudeTurnState | null;
}

/** In-memory status evidence only: no persistent index or conversation database writes. */
export class TranscriptStateRecovery {
  private cache = new Map<string, CachedState>();

  recover(sessions: Session[]): Session[] {
    return sessions.map((session) => this.recoverOne(session));
  }

  private recoverOne(session: Session): Session {
    if (session.agent !== "claude" || session.status !== "idle" || !session.transcriptPath) return session;
    try {
      const file = statSync(session.transcriptPath);
      if (!file.isFile()) return session;
      let cached = this.cache.get(session.transcriptPath);
      if (!cached || cached.mtime !== file.mtimeMs || cached.size !== file.size) {
        // Head is empty unless the entire file fits the window: never reuse an old completion
        // across an unsampled middle. Partial leading records are removed by readHeadTail.
        const sample = readHeadTail(session.transcriptPath, 0, TAIL_BYTES);
        const lines = sample.size <= TAIL_BYTES ? sample.head : sample.tail;
        cached = { mtime: file.mtimeMs, size: file.size, state: claudeTurnState(lines) ?? null };
        this.cache.set(session.transcriptPath, cached);
      }
      return cached.state ? { ...session, ...cached.state } : session;
    } catch {
      return session;
    }
  }
}

let recovery: TranscriptStateRecovery | undefined;

/** Fill idle display state from bounded local evidence; live hooks remain authoritative. */
export function recoverIdleSessionStates(sessions: Session[]): Session[] {
  recovery ??= new TranscriptStateRecovery();
  return recovery.recover(sessions);
}
