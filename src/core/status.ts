import { AgentEvent, Attention, Session, Status } from "./types";

export const TITLE_MAX = 80;

/** Turn a prompt or message into a one-line title. */
export function toTitle(text: string | undefined): string {
  if (!text) return "";
  const line = text
    .replace(/<[^>]+>/g, " ")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!line) return "";
  const clean = line.replace(/\s+/g, " ").replace(/^[#>*\-\s]+/, "");
  return clean.length > TITLE_MAX ? clean.slice(0, TITLE_MAX - 1) + "…" : clean;
}

/** The last sentence of an agent message, single line, for the detail view and notifications. */
export function lastSentence(text: string | undefined, max = 240): string {
  if (!text) return "";
  const flat = text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!flat) return "";
  if (flat.length <= max) return flat;
  return "…" + flat.slice(flat.length - max + 1);
}

/** Heuristic: a turn that ends with a question is waiting for the user, not finished. */
export function endsWithQuestion(text: string | undefined): boolean {
  if (!text) return false;
  const t = text
    .replace(/```[\s\S]*?```/g, "")
    .trim()
    .replace(/[\s*_`)"'」』）]+$/u, "");
  return /[?？]$/u.test(t);
}

export interface Transition {
  next: Session;
  /** True when this event should pop a system notification (subscribed session just started waiting). */
  notify: boolean;
  changed: boolean;
}

function statusFor(ev: AgentEvent, prev: Session | undefined): { status: Status; attention: Attention | null } | null {
  const prevStatus = prev?.status;
  switch (ev.type) {
    case "started":
      return prev ? { status: prev.status, attention: prev.attention } : { status: "idle", attention: null };
    case "progress":
      return { status: "running", attention: null };
    case "tool":
      // Only meaningful after a permission prompt was answered.
      return prevStatus === "needs_input" ? { status: "running", attention: null } : null;
    case "needs_input":
      return { status: "needs_input", attention: ev.attention ?? "input" };
    case "failed":
      return { status: "needs_input", attention: "failed" };
    case "quota":
      return { status: "needs_input", attention: "quota" };
    case "stopped":
      return { status: "done", attention: null };
    case "ended":
      return prevStatus === "running"
        ? { status: "done", attention: null }
        : prev
          ? { status: prev.status, attention: prev.attention }
          : null;
  }
}

/** Pure state machine: apply one event to the previous row. Returns null when nothing should be written. */
export function applyEvent(prev: Session | undefined, ev: AgentEvent): Transition | null {
  const st = statusFor(ev, prev);
  if (!st) return null;

  const base: Session = prev ?? {
    agent: ev.agent,
    sessionId: ev.sessionId,
    host: ev.host ?? "cli",
    title: "",
    cwd: ev.cwd ?? "",
    status: "idle",
    attention: null,
    summary: "",
    locator: {},
    subscribed: false,
    handledAt: null,
    startedAt: ev.at,
    updatedAt: ev.at,
    transcriptPath: "",
  };

  const statusChanged = base.status !== st.status || base.attention !== st.attention;
  const next: Session = {
    ...base,
    host: ev.host ?? base.host,
    cwd: ev.cwd || base.cwd,
    title: base.title || toTitle(ev.title),
    summary: ev.summary !== undefined && ev.summary !== "" ? lastSentence(ev.summary) : base.summary,
    status: st.status,
    attention: st.attention,
    locator: { ...base.locator, ...stripEmpty(ev.locator) },
    transcriptPath: ev.transcriptPath || base.transcriptPath,
    // A status change brings a handled session back into the inbox.
    handledAt: statusChanged ? null : base.handledAt,
    updatedAt: ev.at,
  };

  const notify = next.subscribed && st.status === "needs_input" && statusChanged;
  return { next, notify, changed: true };
}

function stripEmpty<T extends object>(o: T | undefined): Partial<T> {
  if (!o) return {};
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== undefined && v !== null && v !== "") (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

export type InboxSection = "needs_input" | "subscribed" | "done";

export type SessionFilter = "all" | "subscribed" | "needs_input" | "done";

/** Subscription and status filters overlap; the default view keeps every session discoverable. */
export function filterSessions(sessions: Session[], filter: SessionFilter): Session[] {
  if (filter === "all") return sessions;
  return sessions.filter((s) => (filter === "subscribed" ? s.subscribed : s.status === filter));
}

/**
 * Inbox rules:
 * - only subscribed sessions, including history without a live status
 * - waiting for input is always on top
 * - handled sessions leave the inbox until their status changes
 */
export function inboxSection(s: Session): InboxSection | null {
  if (!s.subscribed || s.handledAt !== null) return null;
  if (s.status === "needs_input") return "needs_input";
  if (s.status === "done") return "done";
  return "subscribed";
}

export function groupInbox(sessions: Session[]): Record<InboxSection, Session[]> {
  const groups: Record<InboxSection, Session[]> = { needs_input: [], subscribed: [], done: [] };
  for (const s of sessions) {
    const sec = inboxSection(s);
    if (sec) groups[sec].push(s);
  }
  groups.needs_input.sort((a, b) => b.updatedAt - a.updatedAt);
  groups.subscribed.sort((a, b) => b.updatedAt - a.updatedAt);
  groups.done.sort((a, b) => b.updatedAt - a.updatedAt);
  return groups;
}

/** Menu bar count: subscribed sessions waiting for input. */
export function waitingCount(sessions: Session[]): number {
  return sessions.filter((s) => s.subscribed && s.handledAt === null && s.status === "needs_input").length;
}
