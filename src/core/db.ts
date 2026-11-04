import { exec, q } from "./sqlite";
import { DB_PATH } from "./paths";
import { applyEvent, Transition } from "./status";
import { AgentEvent, Attention, Host, Locator, Session, Status } from "./types";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  agent TEXT NOT NULL,
  session_id TEXT NOT NULL,
  host TEXT NOT NULL DEFAULT 'cli',
  title TEXT NOT NULL DEFAULT '',
  cwd TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'idle',
  attention TEXT,
  summary TEXT NOT NULL DEFAULT '',
  locator TEXT NOT NULL DEFAULT '{}',
  subscribed INTEGER NOT NULL DEFAULT 0,
  handled_at INTEGER,
  started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  transcript_path TEXT NOT NULL DEFAULT '',
  PRIMARY KEY (agent, session_id)
);
CREATE INDEX IF NOT EXISTS sessions_updated ON sessions(updated_at DESC);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent TEXT NOT NULL,
  session_id TEXT NOT NULL,
  type TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS events_session ON events(agent, session_id, at DESC);
`;

interface Row {
  agent: string;
  session_id: string;
  host: string;
  title: string;
  cwd: string;
  status: string;
  attention: string | null;
  summary: string;
  locator: string;
  subscribed: number;
  handled_at: number | null;
  started_at: number;
  updated_at: number;
  transcript_path: string;
}

const COLUMNS =
  "agent, session_id, host, title, cwd, status, attention, summary, locator, subscribed, handled_at, started_at, updated_at, transcript_path";

function fromRow(r: Row): Session {
  let locator: Locator = {};
  try {
    locator = JSON.parse(r.locator || "{}");
  } catch {
    locator = {};
  }
  return {
    agent: r.agent,
    sessionId: r.session_id,
    host: (r.host === "app" ? "app" : "cli") as Host,
    title: r.title ?? "",
    cwd: r.cwd ?? "",
    status: r.status as Status,
    attention: (r.attention as Attention | null) ?? null,
    summary: r.summary ?? "",
    locator,
    subscribed: r.subscribed === 1,
    handledAt: r.handled_at ?? null,
    startedAt: r.started_at,
    updatedAt: r.updated_at,
    transcriptPath: r.transcript_path ?? "",
  };
}

function values(s: Session): string {
  return [
    q(s.agent),
    q(s.sessionId),
    q(s.host),
    q(s.title),
    q(s.cwd),
    q(s.status),
    q(s.attention),
    q(s.summary),
    q(JSON.stringify(s.locator ?? {})),
    q(s.subscribed),
    q(s.handledAt),
    q(s.startedAt),
    q(s.updatedAt),
    q(s.transcriptPath),
  ].join(", ");
}

export class Store {
  private ready: Promise<void> | null = null;
  constructor(readonly path: string = DB_PATH) {}

  private init(): Promise<void> {
    if (!this.ready) {
      this.ready = exec(this.path, "PRAGMA journal_mode=WAL;").then(() => exec(this.path, SCHEMA).then(() => undefined));
      this.ready.catch(() => (this.ready = null));
    }
    return this.ready;
  }

  private async run<T = Row>(sql: string): Promise<T[]> {
    await this.init();
    return exec<T>(this.path, sql);
  }

  async get(agent: string, sessionId: string): Promise<Session | undefined> {
    const rows = await this.run(`SELECT ${COLUMNS} FROM sessions WHERE agent=${q(agent)} AND session_id=${q(sessionId)};`);
    return rows[0] ? fromRow(rows[0]) : undefined;
  }

  async all(limit = 500): Promise<Session[]> {
    const rows = await this.run(`SELECT ${COLUMNS} FROM sessions ORDER BY updated_at DESC LIMIT ${q(limit)};`);
    return rows.map(fromRow);
  }

  /** Rows that can appear in the inbox or the menu bar. */
  async active(): Promise<Session[]> {
    const rows = await this.run(`SELECT ${COLUMNS} FROM sessions WHERE subscribed=1 AND handled_at IS NULL ORDER BY updated_at DESC;`);
    return rows.map(fromRow);
  }

  async put(s: Session): Promise<void> {
    await this.run(`INSERT OR REPLACE INTO sessions (${COLUMNS}) VALUES (${values(s)});`);
  }

  /** Apply an adapter event through the state machine and persist it. */
  async record(ev: AgentEvent): Promise<Transition | null> {
    const prev = await this.get(ev.agent, ev.sessionId);
    const t = applyEvent(prev, ev);
    if (!t) return null;
    await this.run(
      `BEGIN; INSERT OR REPLACE INTO sessions (${COLUMNS}) VALUES (${values(t.next)});` +
        `INSERT INTO events (agent, session_id, type, summary, at) VALUES (${q(ev.agent)}, ${q(ev.sessionId)}, ${q(ev.type)}, ${q(t.next.summary)}, ${q(ev.at)});` +
        `DELETE FROM events WHERE at < ${q(ev.at - 30 * 24 * 3600 * 1000)}; COMMIT;`,
    );
    return t;
  }

  async setSubscribed(agent: string, sessionId: string, subscribed: boolean): Promise<void> {
    await this.run(
      `UPDATE sessions SET subscribed=${q(subscribed)}${subscribed ? ", handled_at=NULL" : ""} WHERE agent=${q(agent)} AND session_id=${q(sessionId)};`,
    );
  }

  /** Subscribe to a session that may only exist as a transcript on disk (history). */
  async subscribeEntry(s: Session, options: { focused?: boolean } = {}): Promise<void> {
    // A hook may create the row concurrently. Never replace its state with an old history snapshot.
    // A positively identified desktop window can correct old CLI ownership without touching
    // status, timestamps or terminal locators recorded by a newer hook.
    const identity =
      options.focused && s.host === "app"
        ? `, host='app', title=CASE WHEN excluded.title<>'' THEN excluded.title ELSE sessions.title END, ` +
          `locator=json_patch(CASE WHEN json_valid(sessions.locator) THEN sessions.locator ELSE '{}' END, ${q(
            JSON.stringify({
              ...(s.locator.hostId ? { hostId: s.locator.hostId } : {}),
              ...(s.locator.claudeDesktopId ? { claudeDesktopId: s.locator.claudeDesktopId } : {}),
            }),
          )})`
        : "";
    await this.run(
      `INSERT INTO sessions (${COLUMNS}) VALUES (${values({ ...s, subscribed: true, handledAt: null })}) ` +
        `ON CONFLICT(agent, session_id) DO UPDATE SET subscribed=1, handled_at=NULL${identity};`,
    );
  }

  async markHandled(agent: string, sessionId: string, at = Date.now()): Promise<void> {
    await this.run(`UPDATE sessions SET handled_at=${q(at)} WHERE agent=${q(agent)} AND session_id=${q(sessionId)};`);
  }

  async unmarkHandled(agent: string, sessionId: string): Promise<void> {
    await this.run(`UPDATE sessions SET handled_at=NULL WHERE agent=${q(agent)} AND session_id=${q(sessionId)};`);
  }

  /** "Archive Completed": every finished session leaves the inbox. */
  async archiveDone(at = Date.now(), observed?: Session[]): Promise<number> {
    // The view can recover completed turns from bounded transcript tails even when a
    // pre-install session is still idle in the hook DB. Archive the observed rows only,
    // without persisting inferred state or hiding a newer hook update.
    const snapshots = observed?.filter((s) => s.subscribed && s.handledAt === null && s.status === "done");
    if (snapshots?.length === 0) return 0;
    const state = snapshots
      ? `status IN ('idle','done') AND (${snapshots.map((s) => `(agent=${q(s.agent)} AND session_id=${q(s.sessionId)} AND updated_at=${q(s.updatedAt)})`).join(" OR ")})`
      : "status='done'";
    const rows = await this.run<{ n: number }>(
      `UPDATE sessions SET handled_at=${q(at)} WHERE subscribed=1 AND ${state} AND handled_at IS NULL; SELECT changes() AS n;`,
    );
    return rows[0]?.n ?? 0;
  }
}
