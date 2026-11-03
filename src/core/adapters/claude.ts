import { existsSync, readFileSync } from "node:fs";
import { CLAUDE_DIR, CLAUDE_SETTINGS } from "../paths";
import { shQuote } from "../exec";
import { activateBundle } from "../terminal";
import { jumpToCli, openUrl } from "../jump";
import { endsWithQuestion } from "../status";
import { lastClaudeAssistant } from "../transcript";
import { AgentEvent, Attention, Config, Host, Session } from "../types";
import { Adapter, DetectResult, HookContext, InstallPlan } from "./types";
import { hasOurHooks, HookEntry, parseJsonFile, stringify, withOurHooks, withoutOurHooks } from "./json";

export const CLAUDE_APP_BUNDLE = "com.anthropic.claudefordesktop";
const CLAUDE_APP_PATHS = ["/Applications/Claude.app"];

/** Events this adapter listens to. PostToolUse only moves "needs permission" back to "running". */
export const CLAUDE_EVENTS = ["SessionStart", "UserPromptSubmit", "PostToolUse", "Notification", "Stop", "SessionEnd"] as const;

function read(path: string): string {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}

function hookEntries(ctx: HookContext): Record<string, HookEntry> {
  const command = `${shQuote(ctx.node)} ${shQuote(ctx.cli)} hook claude`;
  const out: Record<string, HookEntry> = {};
  for (const ev of CLAUDE_EVENTS) out[ev] = { hooks: [{ type: "command", command, timeout: 5 }] };
  return out;
}

const s = (v: unknown): string => (typeof v === "string" ? v : "");

function hostFromEnv(env: NodeJS.ProcessEnv): Host {
  const entry = env.CLAUDE_CODE_ENTRYPOINT ?? "";
  if (/desktop/i.test(entry)) return "app";
  if (env.__CFBundleIdentifier === CLAUDE_APP_BUNDLE) return "app";
  return "cli";
}

function attentionFor(type: string, message: string): Attention | null {
  if (type === "idle_prompt" || type === "auth_success") return null;
  if (type === "permission_prompt" || /permission/i.test(message)) return "permission";
  if (type === "elicitation_dialog") return "question";
  if (/usage limit|rate limit|quota/i.test(message)) return "quota";
  // Older Claude Code versions send no type; "waiting for your input" is the idle reminder.
  if (!type && /waiting for your input/i.test(message)) return null;
  return "input";
}

export function parseClaudeHook(payload: Record<string, unknown>, env: NodeJS.ProcessEnv, now = Date.now()): AgentEvent | null {
  const sessionId = s(payload.session_id);
  const name = s(payload.hook_event_name);
  if (!sessionId || !name) return null;
  const base = {
    agent: "claude",
    sessionId,
    host: hostFromEnv(env),
    cwd: s(payload.cwd),
    transcriptPath: s(payload.transcript_path),
    at: now,
  };
  switch (name) {
    case "SessionStart":
      return { ...base, type: "started" };
    case "UserPromptSubmit":
      return { ...base, type: "progress", title: s(payload.prompt) };
    case "PostToolUse":
      return { ...base, type: "tool" };
    case "Notification": {
      const message = s(payload.message);
      const attention = attentionFor(s(payload.notification_type), message);
      if (!attention) return null;
      return { ...base, type: attention === "quota" ? "quota" : "needs_input", attention, summary: message };
    }
    case "Stop":
    case "SubagentStop": {
      if (name === "SubagentStop") return null;
      const last = s(payload.last_assistant_message) || (base.transcriptPath ? lastClaudeAssistant(base.transcriptPath) : "");
      if (endsWithQuestion(last)) return { ...base, type: "needs_input", attention: "question", summary: last };
      return { ...base, type: "stopped", summary: last };
    }
    case "StopFailure":
      return { ...base, type: "failed", summary: s(payload.error) || s(payload.message) };
    case "SessionEnd":
      return { ...base, type: "ended" };
    default:
      return null;
  }
}

export const claudeAdapter: Adapter = {
  id: "claude",
  name: "Claude Code",
  icon: "claude.svg",

  detect(): DetectResult {
    const cli = existsSync(CLAUDE_DIR);
    const app = CLAUDE_APP_PATHS.some(existsSync);
    let hooked = false;
    try {
      hooked = hasOurHooks(parseJsonFile(read(CLAUDE_SETTINGS), CLAUDE_SETTINGS));
    } catch {
      hooked = false;
    }
    const hosts: Host[] = [];
    if (cli) hosts.push("cli");
    if (app) hosts.push("app");
    return { present: cli || app, hooked, hosts };
  },

  planInstall(ctx: HookContext): InstallPlan {
    const before = read(CLAUDE_SETTINGS);
    const entries = hookEntries(ctx);
    const after = stringify(withOurHooks(parseJsonFile(before, CLAUDE_SETTINGS), entries));
    return {
      changes: [
        {
          path: CLAUDE_SETTINGS,
          before,
          after,
          summary: CLAUDE_EVENTS.join(" · "),
          preview: JSON.stringify({ hooks: Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, [v]])) }, null, 2),
          previewLang: "json",
        },
      ],
      notes: [],
    };
  },

  planUninstall(): InstallPlan {
    const before = read(CLAUDE_SETTINGS);
    if (!before) return { changes: [], notes: [] };
    const after = stringify(withoutOurHooks(parseJsonFile(before, CLAUDE_SETTINGS)));
    return {
      changes: [{ path: CLAUDE_SETTINGS, before, after, summary: CLAUDE_EVENTS.join(" · "), preview: "", previewLang: "json" }],
      notes: [],
    };
  },

  parseHook(_kind, payload, env) {
    return parseClaudeHook(payload, env);
  },

  async jump(session: Session, config: Config) {
    if (session.host === "app") {
      if (await openUrl(`claude://code/continue?session=${encodeURIComponent(session.sessionId)}`)) return { ok: true, method: "url" };
      return { ok: await activateBundle(CLAUDE_APP_BUNDLE), method: "activate" };
    }
    return jumpToCli(session, `claude --resume ${shQuote(session.sessionId)}`, config);
  },
};
