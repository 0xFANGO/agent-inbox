export type AgentId = string; // "claude" | "codex" | custom adapter id
export type Host = "cli" | "app";

/** Sections are the status: running / needs_input / done. "idle" = opened but nothing asked yet. */
export type Status = "running" | "needs_input" | "done" | "idle";

/** Why a session needs attention (borrowed from t3code: input / permission / failed / quota). */
export type Attention = "input" | "question" | "permission" | "failed" | "quota";

/**
 * Unified event format written by every adapter.
 * - started: a session was opened or resumed
 * - progress: the user sent a prompt, the agent is working
 * - tool: the agent ran a tool (only moves needs_input -> running, e.g. after a permission was granted)
 * - needs_input: the agent is blocked on the user
 * - stopped: the agent finished its turn
 * - failed / quota: the turn ended abnormally
 * - ended: the process exited
 */
export type EventType = "started" | "progress" | "tool" | "needs_input" | "stopped" | "failed" | "quota" | "ended";

export interface Locator {
  /** Controlling terminal of the agent process, e.g. /dev/ttys003 */
  tty?: string;
  /** $TMUX_PANE, e.g. %12 */
  tmuxPane?: string;
  /** tmux server socket path (first field of $TMUX) */
  tmuxSocket?: string;
  /** Bundle id of the terminal / app that hosts the session (from $__CFBundleIdentifier) */
  bundleId?: string;
  /** $TERM_PROGRAM */
  termProgram?: string;
  /** Codex desktop host id, when known */
  hostId?: string;
}

export interface AgentEvent {
  agent: AgentId;
  sessionId: string;
  type: EventType;
  host?: Host;
  cwd?: string;
  /** Candidate title (e.g. first prompt). Only used when the session has no title yet. */
  title?: string;
  /** Last sentence from the agent, or the notification message. */
  summary?: string;
  attention?: Attention;
  locator?: Locator;
  transcriptPath?: string;
  at: number;
}

export interface Session {
  agent: AgentId;
  sessionId: string;
  host: Host;
  title: string;
  cwd: string;
  status: Status;
  attention: Attention | null;
  summary: string;
  locator: Locator;
  subscribed: boolean;
  /** Set by "Mark as Handled" (⌘D). Cleared when the status changes. */
  handledAt: number | null;
  startedAt: number;
  updatedAt: number;
  transcriptPath: string;
}

/** A transcript found on disk by the history scan (not in the hook database). */
export interface HistoryEntry {
  agent: AgentId;
  sessionId: string;
  host: Host;
  title: string;
  cwd: string;
  summary: string;
  startedAt: number;
  updatedAt: number;
  transcriptPath: string;
}

export type Language = "zh" | "en";

export interface Config {
  language: Language;
  notifications: boolean;
  /** raycast://extensions/<owner>/<extension> — written by the extension so the CLI can build deeplinks. */
  deeplinkBase: string;
  /** Terminal used when a CLI session has to be resumed in a new window. */
  resumeTerminal: ResumeTerminal;
}

export type ResumeTerminal = "terminal" | "iterm" | "ghostty";
