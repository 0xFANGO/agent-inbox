import { closeSync, openSync, readSync, statSync } from "node:fs";

/** Read the first and last chunk of a (potentially huge) JSONL transcript. */
export function readHeadTail(path: string, headBytes = 64 * 1024, tailBytes = 48 * 1024): { head: string[]; tail: string[]; size: number } {
  const size = statSync(path).size;
  const fd = openSync(path, "r");
  try {
    // If both windows cover the file, read it together so a record spanning their boundary survives.
    const headLen = size <= headBytes + tailBytes ? size : Math.min(size, headBytes);
    const hb = Buffer.alloc(headLen);
    readSync(fd, hb, 0, headLen, 0);
    let head = hb.toString("utf8").split("\n");
    if (headLen < size) head = head.slice(0, -1); // drop the partial last line
    let tail: string[] = [];
    if (size > headLen) {
      const start = Math.max(headLen, size - tailBytes);
      const tb = Buffer.alloc(size - start);
      readSync(fd, tb, 0, size - start, start);
      tail = tb.toString("utf8").split("\n");
      if (start > headLen) tail = tail.slice(1); // drop the partial first line
    }
    return { head, tail, size };
  } finally {
    closeSync(fd);
  }
}

export function parseLines(lines: string[]): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = [];
  for (const l of lines) {
    const s = l.trim();
    if (!s || s[0] !== "{") continue;
    try {
      out.push(JSON.parse(s));
    } catch {
      // partial line
    }
  }
  return out;
}

type J = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v : "");
const obj = (v: unknown): J => (v && typeof v === "object" ? (v as J) : {});

/** Messages that are scaffolding, not something a person typed. */
export function isScaffolding(text: string): boolean {
  const t = text.trimStart();
  return (
    t.length === 0 ||
    t.startsWith("<command-") ||
    t.startsWith("<local-command") ||
    t.startsWith("<system-reminder>") ||
    t.startsWith("<environment_context>") ||
    t.startsWith("<user_instructions>") ||
    t.startsWith("<user-prompt-submit-hook>") ||
    t.startsWith("# AGENTS.md") ||
    t.startsWith("Caveat:") ||
    t.startsWith("[Request interrupted")
  );
}

function textOf(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => {
        const o = obj(c);
        const type = str(o.type);
        if (type === "text" || type === "input_text" || type === "output_text") return str(o.text);
        return "";
      })
      .filter(Boolean)
      .join("\n");
  }
  return "";
}

export interface TranscriptInfo {
  sessionId: string;
  cwd: string;
  title: string;
  firstPrompt: string;
  lastAssistant: string;
  startedAt: number;
  entrypoint: string;
  originator: string;
}

function ts(v: unknown): number {
  const n = Date.parse(str(v));
  return Number.isFinite(n) ? n : 0;
}

/** Claude Code transcript: ~/.claude/projects/<encoded cwd>/<session id>.jsonl */
export function parseClaude(head: J[], tail: J[]): TranscriptInfo {
  const info: TranscriptInfo = {
    sessionId: "",
    cwd: "",
    title: "",
    firstPrompt: "",
    lastAssistant: "",
    startedAt: 0,
    entrypoint: "",
    originator: "",
  };
  for (const e of [...head, ...tail]) {
    if (!info.sessionId && str(e.sessionId)) info.sessionId = str(e.sessionId);
    if (!info.cwd && str(e.cwd)) info.cwd = str(e.cwd);
    if (str(e.entrypoint)) info.entrypoint = str(e.entrypoint);
    if (!info.startedAt && e.timestamp) info.startedAt = ts(e.timestamp);
    if (e.type === "user" && !info.firstPrompt && !e.isMeta) {
      const text = textOf(obj(e.message).content);
      if (!isScaffolding(text)) info.firstPrompt = text;
    }
  }
  for (const e of [...head, ...tail]) {
    // Explicit titles win: /rename (custom-title), then generated summaries.
    if (e.type === "custom-title" && str(e.customTitle)) info.title = str(e.customTitle);
    else if (e.type === "summary" && str(e.summary) && !info.title) info.title = str(e.summary);
    else if (e.type === "ai-title" && str(e.title) && !info.title) info.title = str(e.title);
  }
  for (let i = tail.length - 1; i >= 0 && !info.lastAssistant; i--) {
    const e = tail[i];
    if (e.type === "assistant") info.lastAssistant = textOf(obj(e.message).content);
  }
  if (!info.lastAssistant) {
    for (let i = head.length - 1; i >= 0 && !info.lastAssistant; i--) {
      if (head[i].type === "assistant") info.lastAssistant = textOf(obj(head[i].message).content);
    }
  }
  return info;
}

/** Codex rollout: ~/.codex/sessions/YYYY/MM/DD/rollout-<time>-<thread id>.jsonl */
export function parseCodex(head: J[], tail: J[]): TranscriptInfo {
  const info: TranscriptInfo = {
    sessionId: "",
    cwd: "",
    title: "",
    firstPrompt: "",
    lastAssistant: "",
    startedAt: 0,
    entrypoint: "",
    originator: "",
  };
  for (const e of head) {
    const p = obj(e.payload);
    if (e.type === "session_meta") {
      info.sessionId = str(p.id) || info.sessionId;
      info.cwd = str(p.cwd) || info.cwd;
      info.originator = str(p.originator) || str(p.source);
      info.startedAt = ts(p.timestamp) || ts(e.timestamp);
    }
    if (!info.firstPrompt) {
      if (e.type === "event_msg" && p.type === "user_message" && !isScaffolding(str(p.message))) info.firstPrompt = str(p.message);
      else if (e.type === "response_item" && p.type === "message" && p.role === "user") {
        const text = textOf(p.content);
        if (!isScaffolding(text)) info.firstPrompt = text;
      }
    }
  }
  const scan = (list: J[]) => {
    for (let i = list.length - 1; i >= 0 && !info.lastAssistant; i--) {
      const p = obj(list[i].payload);
      if (list[i].type === "event_msg" && p.type === "agent_message") info.lastAssistant = str(p.message);
      else if (list[i].type === "response_item" && p.type === "message" && p.role === "assistant") info.lastAssistant = textOf(p.content);
    }
  };
  scan(tail);
  scan(head);
  return info;
}

/** Last assistant message of a Claude transcript (used by the Stop hook). */
export function lastClaudeAssistant(path: string): string {
  try {
    const { head, tail } = readHeadTail(path, 0, 96 * 1024);
    return parseClaude(parseLines(head), parseLines(tail)).lastAssistant;
  } catch {
    return "";
  }
}
