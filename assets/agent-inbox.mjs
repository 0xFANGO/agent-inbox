#!/usr/bin/env node

// cli/agent-inbox.ts
import { appendFileSync, mkdirSync as mkdirSync5, readFileSync as readFileSync6 } from "node:fs";

// src/core/adapters/claude.ts
import { existsSync as existsSync2, readFileSync } from "node:fs";

// src/core/paths.ts
import { homedir } from "node:os";
import { join } from "node:path";
var HOME = homedir();
var ROOT = process.env.AGENT_INBOX_HOME || join(HOME, ".sessions");
var DB_PATH = join(ROOT, "db.sqlite");
var CONFIG_PATH = join(ROOT, "config.json");
var BIN_DIR = join(ROOT, "bin");
var CLI_PATH = join(BIN_DIR, "agent-inbox.mjs");
var ADAPTERS_DIR = join(ROOT, "adapters");
var CACHE_DIR = join(ROOT, "cache");
var LOG_PATH = join(ROOT, "log.txt");
var CLAUDE_DIR = process.env.CLAUDE_CONFIG_DIR || join(HOME, ".claude");
var CLAUDE_PROJECTS = join(CLAUDE_DIR, "projects");
var CLAUDE_SETTINGS = join(CLAUDE_DIR, "settings.json");
var CODEX_DIR = process.env.CODEX_HOME || join(HOME, ".codex");
var CODEX_SESSIONS = join(CODEX_DIR, "sessions");
var CODEX_CONFIG = join(CODEX_DIR, "config.toml");
var CODEX_HOOKS = join(CODEX_DIR, "hooks.json");
var CODEX_SESSION_INDEX = join(CODEX_DIR, "session_index.jsonl");

// src/core/exec.ts
import { execFile, spawn } from "node:child_process";
function run(file, args, input, timeoutMs = 5e3) {
  return new Promise((resolve) => {
    const child = execFile(file, args, { encoding: "utf8", timeout: timeoutMs, maxBuffer: 32 * 1024 * 1024 }, (err, stdout, stderr) => {
      resolve({ ok: !err, stdout: String(stdout ?? ""), stderr: String(stderr ?? (err ? String(err) : "")) });
    });
    if (input !== void 0) {
      child.stdin?.on("error", () => void 0);
      child.stdin?.end(input);
    }
  });
}
function detach(file, args) {
  try {
    const child = spawn(file, args, { detached: true, stdio: "ignore" });
    child.on("error", () => void 0);
    child.unref();
  } catch {
  }
}
function osascript(script, lang = "AppleScript") {
  return run("/usr/bin/osascript", ["-l", lang, "-e", script]);
}
function asString(s3) {
  return '"' + s3.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '"';
}
function shQuote(s3) {
  if (/^[A-Za-z0-9_\-./:=@%+]+$/.test(s3)) return s3;
  return "'" + s3.replace(/'/g, "'\\''") + "'";
}

// src/core/terminal.ts
import { existsSync } from "node:fs";
var TERMINAL_BUNDLE = "com.apple.Terminal";
var ITERM_BUNDLE = "com.googlecode.iterm2";
var GHOSTTY_BUNDLE = "com.mitchellh.ghostty";
var TERM_PROGRAM_BUNDLES = {
  Apple_Terminal: TERMINAL_BUNDLE,
  "iTerm.app": ITERM_BUNDLE,
  ghostty: GHOSTTY_BUNDLE,
  WezTerm: "com.github.wez.wezterm",
  vscode: "com.microsoft.VSCode",
  WarpTerminal: "dev.warp.Warp-Stable"
};
function bundleFor(loc) {
  if (loc.bundleId) return loc.bundleId;
  if (loc.termProgram && TERM_PROGRAM_BUNDLES[loc.termProgram]) return TERM_PROGRAM_BUNDLES[loc.termProgram];
  return void 0;
}
function tmuxBinary() {
  for (const p of ["/opt/homebrew/bin/tmux", "/usr/local/bin/tmux", "/usr/bin/tmux"]) if (existsSync(p)) return p;
  return "tmux";
}
function tmuxArgs(loc, args) {
  return loc.tmuxSocket ? ["-S", loc.tmuxSocket, ...args] : args;
}
async function tmuxPaneAlive(loc) {
  if (!loc.tmuxPane) return false;
  const r = await run(tmuxBinary(), tmuxArgs(loc, ["display-message", "-p", "-t", loc.tmuxPane, "#{pane_id}"]));
  return r.ok && r.stdout.trim() === loc.tmuxPane;
}
async function focusTmuxPane(loc) {
  if (!loc.tmuxPane) return false;
  const tmux = tmuxBinary();
  const pane = loc.tmuxPane;
  const switched = await run(tmux, tmuxArgs(loc, ["switch-client", "-t", pane]));
  await run(tmux, tmuxArgs(loc, ["select-window", "-t", pane]));
  await run(tmux, tmuxArgs(loc, ["select-pane", "-t", pane]));
  const bundle = bundleFor(loc);
  if (bundle && bundle !== "tmux") await activateBundle(bundle);
  return switched.ok || !!bundle;
}
async function ttyAlive(tty) {
  if (!tty) return false;
  const name = tty.replace(/^\/dev\//, "");
  const r = await run("/bin/ps", ["-t", name, "-o", "comm="]);
  if (!r.ok) return false;
  return r.stdout.split("\n").some((l) => /claude|codex|node/i.test(l));
}
async function activateBundle(bundleId) {
  const r = await run("/usr/bin/open", ["-b", bundleId]);
  return r.ok;
}
async function focusTty(tty, bundleId) {
  if (bundleId === TERMINAL_BUNDLE) {
    const r = await osascript(`
tell application "Terminal"
  repeat with w in windows
    repeat with t in tabs of w
      if tty of t is ${asString(tty)} then
        set selected of t to true
        set index of w to 1
        activate
        return "ok"
      end if
    end repeat
  end repeat
end tell
return "miss"`);
    return r.ok && r.stdout.trim() === "ok";
  }
  if (bundleId === ITERM_BUNDLE) {
    const r = await osascript(`
tell application "iTerm2"
  repeat with w in windows
    repeat with t in tabs of w
      repeat with s in sessions of t
        if tty of s is ${asString(tty)} then
          select w
          select t
          select s
          activate
          return "ok"
        end if
      end repeat
    end repeat
  end repeat
end tell
return "miss"`);
    return r.ok && r.stdout.trim() === "ok";
  }
  return false;
}
async function openInTerminal(command, cwd, terminal) {
  const line = cwd && existsSync(cwd) ? `cd ${shQuote(cwd)} && ${command}` : command;
  if (terminal === "iterm") {
    const r2 = await osascript(`
tell application "iTerm2"
  activate
  set w to (create window with default profile)
  tell current session of w to write text ${asString(line)}
end tell`);
    if (r2.ok) return true;
  }
  if (terminal === "ghostty") {
    const args = ["-na", "Ghostty", "--args"];
    if (cwd && existsSync(cwd)) args.push(`--working-directory=${cwd}`);
    args.push("-e", process.env.SHELL || "/bin/zsh", "-lc", command);
    const r2 = await run("/usr/bin/open", args);
    if (r2.ok) return true;
  }
  const r = await osascript(`
tell application "Terminal"
  activate
  do script ${asString(line)}
end tell`);
  return r.ok;
}

// src/core/jump.ts
async function openUrl(url) {
  const r = await run("/usr/bin/open", [url]);
  return r.ok;
}
async function copyToClipboard(text) {
  const r = await run("/usr/bin/pbcopy", [], text);
  return r.ok;
}
async function jumpToCli(session, resumeCommand, config) {
  const loc = session.locator ?? {};
  const alive = await ttyAlive(loc.tty);
  if (loc.tmuxPane && await tmuxPaneAlive(loc) && (alive || !loc.tty)) {
    if (await focusTmuxPane(loc)) return { ok: true, method: "tmux" };
  }
  if (alive && loc.tty) {
    const bundle = bundleFor(loc);
    if (await focusTty(loc.tty, bundle)) return { ok: true, method: "tab" };
    if (bundle && await activateBundle(bundle)) return { ok: true, method: "activate" };
  }
  const ok = await openInTerminal(resumeCommand, session.cwd, config.resumeTerminal);
  return { ok, method: "resume" };
}

// src/core/status.ts
var TITLE_MAX = 80;
function toTitle(text) {
  if (!text) return "";
  const line = text.replace(/<[^>]+>/g, " ").split(/\r?\n/).map((l) => l.trim()).find((l) => l.length > 0);
  if (!line) return "";
  const clean = line.replace(/\s+/g, " ").replace(/^[#>*\-\s]+/, "");
  return clean.length > TITLE_MAX ? clean.slice(0, TITLE_MAX - 1) + "\u2026" : clean;
}
function lastSentence(text, max = 240) {
  if (!text) return "";
  const flat = text.replace(/```[\s\S]*?```/g, " ").replace(/\s+/g, " ").trim();
  if (!flat) return "";
  if (flat.length <= max) return flat;
  return "\u2026" + flat.slice(flat.length - max + 1);
}
function endsWithQuestion(text) {
  if (!text) return false;
  const t = text.replace(/```[\s\S]*?```/g, "").trim().replace(/[\s*_`)"'」』）]+$/u, "");
  return /[?？]$/u.test(t);
}
function statusFor(ev, prev) {
  const prevStatus = prev?.status;
  switch (ev.type) {
    case "started":
      return prev ? { status: prev.status, attention: prev.attention } : { status: "idle", attention: null };
    case "progress":
      return { status: "running", attention: null };
    case "tool":
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
      return prevStatus === "running" ? { status: "done", attention: null } : prev ? { status: prev.status, attention: prev.attention } : null;
  }
}
function applyEvent(prev, ev) {
  const st = statusFor(ev, prev);
  if (!st) return null;
  const base = prev ?? {
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
    transcriptPath: ""
  };
  const statusChanged = base.status !== st.status || base.attention !== st.attention;
  const next = {
    ...base,
    host: ev.host ?? base.host,
    cwd: ev.cwd || base.cwd,
    title: base.title || toTitle(ev.title),
    summary: ev.summary !== void 0 && ev.summary !== "" ? lastSentence(ev.summary) : base.summary,
    status: st.status,
    attention: st.attention,
    locator: { ...base.locator, ...stripEmpty(ev.locator) },
    transcriptPath: ev.transcriptPath || base.transcriptPath,
    // A status change brings a handled session back into the inbox.
    handledAt: statusChanged ? null : base.handledAt,
    updatedAt: ev.at
  };
  const notify = next.subscribed && st.status === "needs_input" && statusChanged;
  return { next, notify, changed: true };
}
function stripEmpty(o) {
  if (!o) return {};
  const out = {};
  for (const [k, v] of Object.entries(o)) {
    if (v !== void 0 && v !== null && v !== "") out[k] = v;
  }
  return out;
}

// src/core/transcript.ts
import { closeSync, openSync, readSync, statSync } from "node:fs";
function readHeadTail(path, headBytes = 64 * 1024, tailBytes = 48 * 1024) {
  const size = statSync(path).size;
  const fd = openSync(path, "r");
  try {
    const headLen = Math.min(size, headBytes);
    const hb = Buffer.alloc(headLen);
    readSync(fd, hb, 0, headLen, 0);
    let head = hb.toString("utf8").split("\n");
    if (headLen < size) head = head.slice(0, -1);
    let tail = [];
    if (size > headLen) {
      const start = Math.max(headLen, size - tailBytes);
      const tb = Buffer.alloc(size - start);
      readSync(fd, tb, 0, size - start, start);
      tail = tb.toString("utf8").split("\n");
      if (start > headLen) tail = tail.slice(1);
    }
    return { head, tail, size };
  } finally {
    closeSync(fd);
  }
}
function parseLines(lines) {
  const out = [];
  for (const l of lines) {
    const s3 = l.trim();
    if (!s3 || s3[0] !== "{") continue;
    try {
      out.push(JSON.parse(s3));
    } catch {
    }
  }
  return out;
}
var str = (v) => typeof v === "string" ? v : "";
var obj = (v) => v && typeof v === "object" ? v : {};
function isScaffolding(text) {
  const t = text.trimStart();
  return t.length === 0 || t.startsWith("<command-") || t.startsWith("<local-command") || t.startsWith("<system-reminder>") || t.startsWith("<environment_context>") || t.startsWith("<user_instructions>") || t.startsWith("<user-prompt-submit-hook>") || t.startsWith("# AGENTS.md") || t.startsWith("Caveat:") || t.startsWith("[Request interrupted");
}
function textOf(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((c) => {
      const o = obj(c);
      const type = str(o.type);
      if (type === "text" || type === "input_text" || type === "output_text") return str(o.text);
      return "";
    }).filter(Boolean).join("\n");
  }
  return "";
}
function ts(v) {
  const n = Date.parse(str(v));
  return Number.isFinite(n) ? n : 0;
}
function parseClaude(head, tail) {
  const info = { sessionId: "", cwd: "", title: "", firstPrompt: "", lastAssistant: "", startedAt: 0, entrypoint: "", originator: "" };
  for (const e of head) {
    if (!info.sessionId && str(e.sessionId)) info.sessionId = str(e.sessionId);
    if (!info.cwd && str(e.cwd)) info.cwd = str(e.cwd);
    if (!info.entrypoint && str(e.entrypoint)) info.entrypoint = str(e.entrypoint);
    if (!info.startedAt && e.timestamp) info.startedAt = ts(e.timestamp);
    if (e.type === "user" && !info.firstPrompt && !e.isMeta) {
      const text = textOf(obj(e.message).content);
      if (!isScaffolding(text)) info.firstPrompt = text;
    }
  }
  for (const e of [...head, ...tail]) {
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
function lastClaudeAssistant(path) {
  try {
    const { head, tail } = readHeadTail(path, 0, 96 * 1024);
    return parseClaude(parseLines(head), parseLines(tail)).lastAssistant;
  } catch {
    return "";
  }
}

// src/core/adapters/types.ts
var HOOK_MARKER = "agent-inbox.mjs";

// src/core/adapters/json.ts
function parseJsonFile(text, path) {
  if (!text.trim()) return {};
  try {
    const v = JSON.parse(text);
    if (v && typeof v === "object" && !Array.isArray(v)) return v;
  } catch {
  }
  throw new Error(`${path} is not valid JSON; fix it before connecting.`);
}
function isOurs(entry) {
  return Array.isArray(entry?.hooks) && entry.hooks.some((h) => typeof h?.command === "string" && h.command.includes(HOOK_MARKER));
}
function withoutOurHooks(file) {
  const hooks = {};
  for (const [event2, entries] of Object.entries(file.hooks ?? {})) {
    const kept = (Array.isArray(entries) ? entries : []).filter((e) => !isOurs(e));
    if (kept.length) hooks[event2] = kept;
  }
  const next = { ...file };
  if (Object.keys(hooks).length) next.hooks = hooks;
  else delete next.hooks;
  return next;
}
function withOurHooks(file, ours) {
  const base = withoutOurHooks(file);
  const hooks = { ...base.hooks ?? {} };
  for (const [event2, entry] of Object.entries(ours)) hooks[event2] = [...hooks[event2] ?? [], entry];
  return { ...base, hooks };
}
function hasOurHooks(file) {
  return Object.values(file.hooks ?? {}).some((entries) => Array.isArray(entries) && entries.some(isOurs));
}
function stringify(file) {
  return JSON.stringify(file, null, 2) + "\n";
}

// src/core/adapters/claude.ts
var CLAUDE_APP_BUNDLE = "com.anthropic.claudefordesktop";
var CLAUDE_APP_PATHS = ["/Applications/Claude.app"];
var CLAUDE_EVENTS = ["SessionStart", "UserPromptSubmit", "PostToolUse", "Notification", "Stop", "SessionEnd"];
function read(path) {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return "";
  }
}
function hookEntries(ctx) {
  const command = `${shQuote(ctx.node)} ${shQuote(ctx.cli)} hook claude`;
  const out = {};
  for (const ev of CLAUDE_EVENTS) out[ev] = { hooks: [{ type: "command", command, timeout: 5 }] };
  return out;
}
var s = (v) => typeof v === "string" ? v : "";
function hostFromEnv(env) {
  const entry = env.CLAUDE_CODE_ENTRYPOINT ?? "";
  if (/desktop/i.test(entry)) return "app";
  if (env.__CFBundleIdentifier === CLAUDE_APP_BUNDLE) return "app";
  return "cli";
}
function attentionFor(type, message) {
  if (type === "idle_prompt" || type === "auth_success") return null;
  if (type === "permission_prompt" || /permission/i.test(message)) return "permission";
  if (type === "elicitation_dialog") return "question";
  if (/usage limit|rate limit|quota/i.test(message)) return "quota";
  if (!type && /waiting for your input/i.test(message)) return null;
  return "input";
}
function parseClaudeHook(payload, env, now = Date.now()) {
  const sessionId = s(payload.session_id);
  const name = s(payload.hook_event_name);
  if (!sessionId || !name) return null;
  const base = {
    agent: "claude",
    sessionId,
    host: hostFromEnv(env),
    cwd: s(payload.cwd),
    transcriptPath: s(payload.transcript_path),
    at: now
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
var claudeAdapter = {
  id: "claude",
  name: "Claude Code",
  icon: "claude.svg",
  detect() {
    const cli = existsSync2(CLAUDE_DIR);
    const app = CLAUDE_APP_PATHS.some(existsSync2);
    let hooked = false;
    try {
      hooked = hasOurHooks(parseJsonFile(read(CLAUDE_SETTINGS), CLAUDE_SETTINGS));
    } catch {
      hooked = false;
    }
    const hosts = [];
    if (cli) hosts.push("cli");
    if (app) hosts.push("app");
    return { present: cli || app, hooked, hosts };
  },
  planInstall(ctx) {
    const before = read(CLAUDE_SETTINGS);
    const entries = hookEntries(ctx);
    const after = stringify(withOurHooks(parseJsonFile(before, CLAUDE_SETTINGS), entries));
    return {
      changes: [
        {
          path: CLAUDE_SETTINGS,
          before,
          after,
          summary: CLAUDE_EVENTS.join(" \xB7 "),
          preview: JSON.stringify({ hooks: Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, [v]])) }, null, 2),
          previewLang: "json"
        }
      ],
      notes: []
    };
  },
  planUninstall() {
    const before = read(CLAUDE_SETTINGS);
    if (!before) return { changes: [], notes: [] };
    const after = stringify(withoutOurHooks(parseJsonFile(before, CLAUDE_SETTINGS)));
    return {
      changes: [{ path: CLAUDE_SETTINGS, before, after, summary: CLAUDE_EVENTS.join(" \xB7 "), preview: "", previewLang: "json" }],
      notes: []
    };
  },
  parseHook(_kind, payload, env) {
    return parseClaudeHook(payload, env);
  },
  async jump(session, config) {
    if (session.host === "app") {
      if (await openUrl(`claude://code/continue?session=${encodeURIComponent(session.sessionId)}`)) return { ok: true, method: "url" };
      return { ok: await activateBundle(CLAUDE_APP_BUNDLE), method: "activate" };
    }
    return jumpToCli(session, `claude --resume ${shQuote(session.sessionId)}`, config);
  }
};

// src/core/adapters/codex.ts
import { existsSync as existsSync3, readFileSync as readFileSync2 } from "node:fs";
var CODEX_APP_BUNDLE = "com.openai.codex";
var CODEX_APP_PATHS = ["/Applications/Codex.app", "/Applications/ChatGPT.app"];
var CODEX_HOOK_EVENTS = ["SessionStart", "UserPromptSubmit"];
var THREAD_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function read2(path) {
  try {
    return readFileSync2(path, "utf8");
  } catch {
    return "";
  }
}
var s2 = (v) => typeof v === "string" ? v : "";
function findNotify(toml) {
  const firstTable = toml.search(/^\s*\[/m);
  const region = firstTable === -1 ? toml : toml.slice(0, firstTable);
  const m = /^[ \t]*notify[ \t]*=[ \t]*\[/m.exec(region);
  if (!m) return null;
  let i = m.index + m[0].length;
  let inStr = null;
  for (; i < toml.length; i++) {
    const c = toml[i];
    if (inStr) {
      if (c === "\\" && inStr === '"') i++;
      else if (c === inStr) inStr = null;
    } else if (c === '"' || c === "'") inStr = c;
    else if (c === "]") break;
  }
  const body = toml.slice(m.index + m[0].length, i);
  const items = [];
  const re = /"((?:[^"\\]|\\.)*)"|'([^']*)'/g;
  let im;
  while (im = re.exec(body)) {
    if (im[1] !== void 0) {
      try {
        items.push(JSON.parse(`"${im[1]}"`));
      } catch {
        items.push(im[1]);
      }
    } else items.push(im[2]);
  }
  let end = i + 1;
  while (end < toml.length && toml[end] !== "\n") end++;
  return { start: m.index, end, items };
}
function setNotify(toml, items) {
  const span = findNotify(toml);
  const line = items ? `notify = [${items.map((x) => JSON.stringify(x)).join(", ")}]` : "";
  if (span) {
    const rest = toml.slice(span.end);
    if (!items) return toml.slice(0, span.start) + rest.replace(/^\n/, "");
    return toml.slice(0, span.start) + line + rest;
  }
  if (!items) return toml;
  return line + "\n" + (toml.startsWith("\n") || !toml ? "" : "\n") + toml;
}
function originalNotify(items) {
  if (!items.some((x) => x.includes(HOOK_MARKER))) return items;
  const i = items.indexOf("--then");
  return i === -1 ? [] : items.slice(i + 1);
}
function ourNotify(ctx, existing) {
  const orig = originalNotify(existing);
  const ours = [ctx.node, ctx.cli, "hook", "codex-notify"];
  return orig.length ? [...ours, "--then", ...orig] : ours;
}
function hostFromEnv2(env) {
  return env.__CFBundleIdentifier === CODEX_APP_BUNDLE ? "app" : "cli";
}
function parseCodexNotify(payload, env, now = Date.now()) {
  const type = s2(payload.type);
  const sessionId = s2(payload["thread-id"]) || s2(payload.thread_id) || s2(payload["session-id"]);
  if (!sessionId) return null;
  const inputs = Array.isArray(payload["input-messages"]) ? payload["input-messages"].map(s2) : [];
  const last = s2(payload["last-assistant-message"]);
  const base = { agent: "codex", sessionId, host: hostFromEnv2(env), cwd: s2(payload.cwd), title: inputs[0] ?? "", at: now };
  if (type === "agent-turn-complete") {
    if (endsWithQuestion(last)) return { ...base, type: "needs_input", attention: "question", summary: last };
    return { ...base, type: "stopped", summary: last };
  }
  if (/approval|permission/i.test(type)) return { ...base, type: "needs_input", attention: "permission", summary: last };
  return null;
}
function parseCodexHook(payload, env, now = Date.now()) {
  const sessionId = s2(payload.session_id) || s2(payload.thread_id) || s2(payload.conversation_id);
  const name = s2(payload.hook_event_name);
  if (!sessionId) return null;
  const base = { agent: "codex", sessionId, host: hostFromEnv2(env), cwd: s2(payload.cwd), transcriptPath: s2(payload.transcript_path), at: now };
  if (name === "SessionStart") return { ...base, type: "started" };
  if (name === "UserPromptSubmit") return { ...base, type: "progress", title: s2(payload.prompt) };
  return null;
}
function hookEntries2(ctx) {
  const command = `${shQuote(ctx.node)} ${shQuote(ctx.cli)} hook codex`;
  const out = {};
  for (const ev of CODEX_HOOK_EVENTS) out[ev] = { hooks: [{ type: "command", command, timeout: 5 }] };
  return out;
}
var codexAdapter = {
  id: "codex",
  name: "Codex",
  icon: "openai.svg",
  detect() {
    const cli = existsSync3(CODEX_DIR);
    const app = CODEX_APP_PATHS.some(existsSync3);
    const toml = read2(CODEX_CONFIG);
    const hooked = (findNotify(toml)?.items ?? []).some((x) => x.includes(HOOK_MARKER));
    const hosts = [];
    if (cli) hosts.push("cli");
    if (app) hosts.push("app");
    return { present: cli || app, hooked, hosts };
  },
  planInstall(ctx) {
    const changes = [];
    const toml = read2(CODEX_CONFIG);
    const existing = findNotify(toml)?.items ?? [];
    const notify = ourNotify(ctx, existing);
    changes.push({
      path: CODEX_CONFIG,
      before: toml,
      after: setNotify(toml, notify),
      summary: "notify",
      preview: `notify = [${notify.map((x) => JSON.stringify(x)).join(", ")}]`,
      previewLang: "toml"
    });
    const hooksText = read2(CODEX_HOOKS);
    const entries = hookEntries2(ctx);
    changes.push({
      path: CODEX_HOOKS,
      before: hooksText,
      after: stringify(withOurHooks(parseJsonFile(hooksText, CODEX_HOOKS), entries)),
      summary: CODEX_HOOK_EVENTS.join(" \xB7 "),
      preview: JSON.stringify({ hooks: Object.fromEntries(Object.entries(entries).map(([k, v]) => [k, [v]])) }, null, 2),
      previewLang: "json"
    });
    return { changes, notes: ["setup.codexHooksNote"] };
  },
  planUninstall() {
    const changes = [];
    const toml = read2(CODEX_CONFIG);
    const span = findNotify(toml);
    if (span && span.items.some((x) => x.includes(HOOK_MARKER))) {
      const orig = originalNotify(span.items);
      changes.push({ path: CODEX_CONFIG, before: toml, after: setNotify(toml, orig.length ? orig : null), summary: "notify", preview: "", previewLang: "toml" });
    }
    const hooksText = read2(CODEX_HOOKS);
    if (hooksText) {
      const file = parseJsonFile(hooksText, CODEX_HOOKS);
      if (hasOurHooks(file)) changes.push({ path: CODEX_HOOKS, before: hooksText, after: stringify(withoutOurHooks(file)), summary: "hooks", preview: "", previewLang: "json" });
    }
    return { changes, notes: [] };
  },
  parseHook(kind, payload, env) {
    return kind === "codex-notify" ? parseCodexNotify(payload, env) : parseCodexHook(payload, env);
  },
  async jump(session, config) {
    if (session.host === "app") {
      if (THREAD_ID.test(session.sessionId)) {
        const host = session.locator?.hostId ? `?hostId=${encodeURIComponent(session.locator.hostId)}` : "";
        if (await openUrl(`codex://threads/${session.sessionId}${host}`)) return { ok: true, method: "url" };
      }
      await openUrl("codex://launch");
      await copyToClipboard(session.sessionId);
      return { ok: true, method: "copied" };
    }
    return jumpToCli(session, `codex resume ${shQuote(session.sessionId)}`, config);
  }
};

// src/core/adapters/custom.ts
import { existsSync as existsSync4, mkdirSync, readdirSync, readFileSync as readFileSync3, writeFileSync } from "node:fs";
import { join as join2 } from "node:path";
var fill = (tpl, s3) => tpl.split("{sessionId}").join(s3.sessionId).split("{cwd}").join(s3.cwd);
function manifestAdapter(m) {
  return {
    id: m.id,
    name: m.name || m.id,
    detect: () => ({ present: true, hooked: true, hosts: [] }),
    planInstall: () => ({ changes: [], notes: [] }),
    planUninstall: () => ({ changes: [], notes: [] }),
    async jump(session, config) {
      if (m.jumpUrl && (session.host === "app" || !m.resumeCommand)) {
        if (await openUrl(fill(m.jumpUrl, session))) return { ok: true, method: "url" };
      }
      if (m.resumeCommand) return jumpToCli(session, fill(m.resumeCommand, session), config);
      if (m.bundleId) return { ok: await activateBundle(m.bundleId), method: "activate" };
      return { ok: false, method: "none" };
    }
  };
}
function loadManifests(dir = ADAPTERS_DIR) {
  const out = [];
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  } catch {
    return out;
  }
  for (const f of files) {
    try {
      const m = JSON.parse(readFileSync3(join2(dir, f), "utf8"));
      if (m && typeof m.id === "string" && /^[a-z0-9][a-z0-9_-]*$/i.test(m.id) && m.id !== "claude" && m.id !== "codex") out.push(m);
    } catch {
    }
  }
  return out;
}

// src/core/adapters/index.ts
var BUILTIN_ADAPTERS = [claudeAdapter, codexAdapter];
function allAdapters() {
  return [...BUILTIN_ADAPTERS, ...loadManifests().map(manifestAdapter)];
}
function getAdapter(id) {
  return allAdapters().find((a) => a.id === id);
}

// src/core/config.ts
import { existsSync as existsSync5, mkdirSync as mkdirSync2, readFileSync as readFileSync4, writeFileSync as writeFileSync2 } from "node:fs";
var DEFAULT_DEEPLINK_BASE = "raycast://extensions/fango/agent-inbox";
var DEFAULT_CONFIG = {
  language: "zh",
  notifications: true,
  deeplinkBase: DEFAULT_DEEPLINK_BASE,
  resumeTerminal: "terminal"
};
function readConfig(path = CONFIG_PATH) {
  try {
    const raw = JSON.parse(readFileSync4(path, "utf8"));
    return { ...DEFAULT_CONFIG, ...raw };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

// src/core/sqlite.ts
import { existsSync as existsSync6, mkdirSync as mkdirSync3 } from "node:fs";
import { dirname } from "node:path";
function sqliteBinary() {
  if (process.env.AGENT_INBOX_SQLITE) return process.env.AGENT_INBOX_SQLITE;
  for (const p of ["/usr/bin/sqlite3", "/opt/homebrew/bin/sqlite3", "/usr/local/bin/sqlite3"]) {
    if (existsSync6(p)) return p;
  }
  return "sqlite3";
}
function q(v) {
  if (v === null || v === void 0) return "NULL";
  if (typeof v === "boolean") return v ? "1" : "0";
  if (typeof v === "number") return Number.isFinite(v) ? String(Math.trunc(v)) : "NULL";
  return "'" + String(v).replace(/\u0000/g, "").replace(/'/g, "''") + "'";
}
var SqliteError = class extends Error {
};
async function exec(dbPath, statements) {
  if (!existsSync6(dirname(dbPath))) mkdirSync3(dirname(dbPath), { recursive: true });
  const res = await run(sqliteBinary(), ["-json", "-bail", "-cmd", ".timeout 4000", dbPath], statements, 1e4);
  if (!res.ok) throw new SqliteError(res.stderr.trim() || "sqlite3 failed");
  const out = res.stdout.trim();
  if (!out) return [];
  try {
    return JSON.parse(out);
  } catch {
    throw new SqliteError("Unexpected sqlite3 output: " + out.slice(0, 200));
  }
}

// src/core/db.ts
var SCHEMA = `
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
var COLUMNS = "agent, session_id, host, title, cwd, status, attention, summary, locator, subscribed, handled_at, started_at, updated_at, transcript_path";
function fromRow(r) {
  let locator = {};
  try {
    locator = JSON.parse(r.locator || "{}");
  } catch {
    locator = {};
  }
  return {
    agent: r.agent,
    sessionId: r.session_id,
    host: r.host === "app" ? "app" : "cli",
    title: r.title ?? "",
    cwd: r.cwd ?? "",
    status: r.status,
    attention: r.attention ?? null,
    summary: r.summary ?? "",
    locator,
    subscribed: r.subscribed === 1,
    handledAt: r.handled_at ?? null,
    startedAt: r.started_at,
    updatedAt: r.updated_at,
    transcriptPath: r.transcript_path ?? ""
  };
}
function values(s3) {
  return [
    q(s3.agent),
    q(s3.sessionId),
    q(s3.host),
    q(s3.title),
    q(s3.cwd),
    q(s3.status),
    q(s3.attention),
    q(s3.summary),
    q(JSON.stringify(s3.locator ?? {})),
    q(s3.subscribed),
    q(s3.handledAt),
    q(s3.startedAt),
    q(s3.updatedAt),
    q(s3.transcriptPath)
  ].join(", ");
}
var Store = class {
  constructor(path = DB_PATH) {
    this.path = path;
  }
  path;
  ready = null;
  init() {
    if (!this.ready) {
      this.ready = exec(this.path, "PRAGMA journal_mode=WAL;").then(() => exec(this.path, SCHEMA).then(() => void 0));
      this.ready.catch(() => this.ready = null);
    }
    return this.ready;
  }
  async run(sql) {
    await this.init();
    return exec(this.path, sql);
  }
  async get(agent, sessionId) {
    const rows = await this.run(`SELECT ${COLUMNS} FROM sessions WHERE agent=${q(agent)} AND session_id=${q(sessionId)};`);
    return rows[0] ? fromRow(rows[0]) : void 0;
  }
  async all(limit = 500) {
    const rows = await this.run(`SELECT ${COLUMNS} FROM sessions ORDER BY updated_at DESC LIMIT ${q(limit)};`);
    return rows.map(fromRow);
  }
  /** Rows that can appear in the inbox or the menu bar. */
  async active() {
    const rows = await this.run(
      `SELECT ${COLUMNS} FROM sessions WHERE handled_at IS NULL AND (status='needs_input' OR (subscribed=1 AND status IN ('running','done'))) ORDER BY updated_at DESC;`
    );
    return rows.map(fromRow);
  }
  async put(s3) {
    await this.run(`INSERT OR REPLACE INTO sessions (${COLUMNS}) VALUES (${values(s3)});`);
  }
  /** Apply an adapter event through the state machine and persist it. */
  async record(ev) {
    const prev = await this.get(ev.agent, ev.sessionId);
    const t = applyEvent(prev, ev);
    if (!t) return null;
    await this.run(
      `BEGIN; INSERT OR REPLACE INTO sessions (${COLUMNS}) VALUES (${values(t.next)});INSERT INTO events (agent, session_id, type, summary, at) VALUES (${q(ev.agent)}, ${q(ev.sessionId)}, ${q(ev.type)}, ${q(t.next.summary)}, ${q(ev.at)});DELETE FROM events WHERE at < ${q(ev.at - 30 * 24 * 3600 * 1e3)}; COMMIT;`
    );
    return t;
  }
  async setSubscribed(agent, sessionId, subscribed) {
    await this.run(`UPDATE sessions SET subscribed=${q(subscribed)} WHERE agent=${q(agent)} AND session_id=${q(sessionId)};`);
  }
  /** Subscribe to a session that may only exist as a transcript on disk (history). */
  async subscribeEntry(s3) {
    const existing = await this.get(s3.agent, s3.sessionId);
    if (existing) return this.setSubscribed(s3.agent, s3.sessionId, true);
    await this.put({ ...s3, subscribed: true });
  }
  async markHandled(agent, sessionId, at = Date.now()) {
    await this.run(`UPDATE sessions SET handled_at=${q(at)} WHERE agent=${q(agent)} AND session_id=${q(sessionId)};`);
  }
  async unmarkHandled(agent, sessionId) {
    await this.run(`UPDATE sessions SET handled_at=NULL WHERE agent=${q(agent)} AND session_id=${q(sessionId)};`);
  }
  /** "Archive Completed": every finished session leaves the inbox. */
  async archiveDone(at = Date.now()) {
    const rows = await this.run(
      `UPDATE sessions SET handled_at=${q(at)} WHERE status='done' AND handled_at IS NULL; SELECT changes() AS n;`
    );
    return rows[0]?.n ?? 0;
  }
};

// src/core/locate.ts
async function ttyOf(pid) {
  const r = await run("/bin/ps", ["-o", "tty=", "-p", String(pid)], void 0, 2e3);
  const tty = r.stdout.trim();
  if (!r.ok || !tty || tty.startsWith("?")) return void 0;
  return tty.startsWith("/dev/") ? tty : `/dev/${tty}`;
}
async function captureLocator(env, pid = process.ppid) {
  const loc = {};
  if (env.TMUX_PANE) loc.tmuxPane = env.TMUX_PANE;
  if (env.TMUX) loc.tmuxSocket = env.TMUX.split(",")[0];
  if (env.__CFBundleIdentifier) loc.bundleId = env.__CFBundleIdentifier;
  if (env.TERM_PROGRAM) loc.termProgram = env.TERM_PROGRAM;
  const tty = await ttyOf(pid);
  if (tty) loc.tty = tty;
  return loc;
}

// src/core/i18n.ts
var zh = {
  // sections
  "section.needsInput": "\u7B49\u6211\u8F93\u5165",
  "section.running": "\u8FD0\u884C\u4E2D",
  "section.done": "\u5DF2\u5B8C\u6210",
  "section.working": "\u5DE5\u4F5C\u4E2D",
  "section.ended": "\u5DF2\u7ED3\u675F",
  "section.agents": "Agent",
  "section.dataAndAlerts": "\u6570\u636E\u4E0E\u63D0\u9192",
  // nav titles
  "nav.inbox": "\u6536\u4EF6\u7BB1",
  "nav.all": "\u5168\u90E8\u4F1A\u8BDD",
  "nav.setup": "\u63A5\u5165",
  "search.placeholder": "\u641C\u7D22",
  "search.allPlaceholder": "\u641C\u6807\u9898\u3001\u9879\u76EE\u3001\u6700\u540E\u4E00\u53E5",
  // actions
  "action.jump": "\u8DF3\u56DE",
  "action.handled": "\u5DF2\u5904\u7406",
  "action.unhandled": "\u79FB\u56DE\u6536\u4EF6\u7BB1",
  "action.subscribe": "\u8BA2\u9605",
  "action.unsubscribe": "\u53D6\u6D88\u8BA2\u9605",
  "action.detail": "\u8BE6\u60C5",
  "action.hideDetail": "\u6536\u8D77\u8BE6\u60C5",
  "action.archiveDone": "\u5F52\u6863\u5DF2\u5B8C\u6210",
  "action.openInbox": "\u6253\u5F00\u6536\u4EF6\u7BB1",
  "action.openSetup": "\u63A5\u5165 Agent",
  "action.install": "\u63A5\u5165",
  "action.write": "\u5199\u5165",
  "action.uninstall": "\u79FB\u9664 hooks",
  "action.openFolder": "\u6253\u5F00\u76EE\u5F55",
  "action.toggleOn": "\u6253\u5F00",
  "action.toggleOff": "\u5173\u95ED",
  "action.copyInstall": "\u590D\u5236\u5B89\u88C5\u547D\u4EE4",
  "action.refresh": "\u5237\u65B0",
  // hosts & agents
  "host.app": "\u684C\u9762\u7AEF",
  "host.cli": "CLI",
  "agent.claude": "Claude",
  "agent.codex": "Codex",
  // detail metadata
  "meta.agent": "Agent",
  "meta.project": "\u9879\u76EE",
  "meta.started": "\u5F00\u59CB",
  "meta.activity": "\u6700\u8FD1\u6D3B\u52A8",
  "meta.noSummary": "\u8FD8\u6CA1\u6709\u6D88\u606F",
  // attention
  "attention.input": "\u7B49\u4F60\u8F93\u5165",
  "attention.question": "\u7B49\u4F60\u56DE\u7B54",
  "attention.permission": "\u7B49\u4F60\u6388\u6743",
  "attention.failed": "\u5931\u8D25\u4E86",
  "attention.quota": "\u989D\u5EA6\u7528\u5B8C",
  // time
  "time.justNow": "\u521A\u521A",
  "time.minutes": "{n} \u5206\u949F\u524D",
  "time.hours": "{n} \u5C0F\u65F6\u524D",
  "time.yesterday": "\u6628\u5929",
  "time.days": "{n} \u5929\u524D",
  "time.since": "{t} \u8D77",
  "time.today": "\u4ECA\u5929 {t}",
  // empty states
  "empty.inbox.title": "\u6CA1\u6709\u8981\u5904\u7406\u7684\u4F1A\u8BDD",
  "empty.inbox.desc": "\u8BA2\u9605\u7684\u4F1A\u8BDD\u7B49\u4F60\u8F93\u5165\u65F6\u4F1A\u51FA\u73B0\u5728\u8FD9\u91CC",
  "empty.onboard.title": "\u8FD8\u6CA1\u63A5\u5165\u4EFB\u4F55 Agent",
  "empty.onboard.desc": "\u63A5\u5165 Claude Code \u6216 Codex \u540E\uFF0C\u4F1A\u8BDD\u4F1A\u81EA\u52A8\u51FA\u73B0\u5728\u8FD9\u91CC",
  "empty.all.title": "\u6CA1\u6709\u627E\u5230\u4F1A\u8BDD",
  "empty.all.desc": "~/.claude/projects \u548C ~/.codex/sessions \u91CC\u6CA1\u6709\u4F1A\u8BDD\u8BB0\u5F55",
  "empty.menu": "\u6CA1\u6709\u7B49\u4F60\u8F93\u5165\u7684\u4F1A\u8BDD",
  // toasts / hud
  "hud.subscribed": "\u5DF2\u8BA2\u9605 \xB7 {title}",
  "hud.unsubscribed": "\u5DF2\u53D6\u6D88\u8BA2\u9605 \xB7 {title}",
  "hud.handled": "\u5DF2\u5904\u7406 \xB7 {title}",
  "hud.archived": "\u5DF2\u5F52\u6863 {n} \u4E2A\u5DF2\u5B8C\u6210\u4F1A\u8BDD",
  "hud.notFound": "\u6CA1\u8BA4\u51FA\u524D\u53F0\u7A97\u53E3\u5BF9\u5E94\u7684\u4F1A\u8BDD",
  "hud.alreadySubscribed": "\u5DF2\u5728\u8BA2\u9605\u4E2D \xB7 {title}",
  "toast.jumpFailed": "\u8DF3\u56DE\u5931\u8D25",
  "toast.copiedId": "\u5DF2\u590D\u5236\u4F1A\u8BDD ID\uFF0C\u8BF7\u5728 App \u91CC\u7C98\u8D34\u6253\u5F00",
  "toast.resumed": "\u5DF2\u5728\u65B0\u7EC8\u7AEF\u6062\u590D\u4F1A\u8BDD",
  "toast.installed": "\u5DF2\u5199\u5165 {name} \u7684 hooks",
  "toast.uninstalled": "\u5DF2\u79FB\u9664 {name} \u7684 hooks",
  "toast.installFailed": "\u5199\u5165\u5931\u8D25",
  "toast.error": "\u51FA\u9519\u4E86",
  // confirm
  "confirm.jumpTitle": "\u8DF3\u56DE {target}\uFF1F",
  "confirm.cancel": "\u53D6\u6D88",
  // setup
  "setup.ready": "\u5C31\u7EEA",
  "setup.install": "\u5B89\u88C5",
  "setup.notFound": "\u672A\u68C0\u6D4B\u5230",
  "setup.on": "\u5F00",
  "setup.off": "\u5173",
  "setup.fallback": "\u515C\u5E95",
  "setup.claudeHosts": "CLI \xB7 \u684C\u9762\u7AEF",
  "setup.codexHosts": "CLI \xB7 \u684C\u9762\u7AEF\uFF08\u4F1A\u8BDD\u6DF1\u94FE\uFF09",
  "setup.addAgent": "\u6DFB\u52A0 Agent",
  "setup.notifications": "\u7CFB\u7EDF\u901A\u77E5",
  "setup.notificationsSub": "\u4EC5\u7B49\u8F93\u5165\u65F6",
  "setup.clickToJump": "\u70B9\u901A\u77E5\u8DF3\u56DE",
  "setup.clickToJumpReady": "terminal-notifier",
  "setup.clickToJumpMissing": "\u672A\u5B89\u88C5 terminal-notifier\uFF0C\u901A\u77E5\u65E0\u6CD5\u70B9\u51FB\u8DF3\u56DE",
  "setup.history": "\u5386\u53F2\u4F1A\u8BDD",
  "setup.historySub": "\u6253\u5F00\u300C\u5168\u90E8\u4F1A\u8BDD\u300D\u65F6\u626B\u63CF\uFF0C\u4E0D\u5BFC\u5165",
  "setup.previewTitle": "\u5C06\u8981\u5199\u5165\u7684\u5185\u5BB9",
  "setup.previewIntro": "\u786E\u8BA4\u540E\u624D\u4F1A\u5199\u5165\u3002\u539F\u6587\u4EF6\u4F1A\u5907\u4EFD\u4E3A `*.agent-inbox.bak`\u3002",
  "setup.uninstallIntro": "\u5C06\u79FB\u9664\u672C\u63D2\u4EF6\u5199\u5165\u7684\u6761\u76EE\uFF0C\u5176\u4F59\u914D\u7F6E\u4FDD\u6301\u4E0D\u53D8\u3002",
  "setup.nodeMissing": "\u6CA1\u627E\u5230 node\uFF0Chook \u9700\u8981 Node.js \u624D\u80FD\u8FD0\u884C\u3002",
  "setup.codexHooksNote": "Codex \u9996\u6B21\u52A0\u8F7D\u65B0 hook \u65F6\uFF0C\u9700\u8981\u5728 Codex \u91CC\u8FD0\u884C /hooks \u786E\u8BA4\u3002",
  "setup.customAdapter": "\u81EA\u5B9A\u4E49 adapter",
  // notifications (hook CLI)
  "notify.waiting": "\u7B49\u4F60\u8F93\u5165"
};
var en = {
  "section.needsInput": "Waiting for You",
  "section.running": "Running",
  "section.done": "Completed",
  "section.working": "Active",
  "section.ended": "Ended",
  "section.agents": "Agents",
  "section.dataAndAlerts": "Data & Alerts",
  "nav.inbox": "Inbox",
  "nav.all": "All Sessions",
  "nav.setup": "Setup",
  "search.placeholder": "Search",
  "search.allPlaceholder": "Search titles, projects, last messages",
  "action.jump": "Jump Back",
  "action.handled": "Mark as Handled",
  "action.unhandled": "Move Back to Inbox",
  "action.subscribe": "Subscribe",
  "action.unsubscribe": "Unsubscribe",
  "action.detail": "Show Details",
  "action.hideDetail": "Hide Details",
  "action.archiveDone": "Archive Completed",
  "action.openInbox": "Open Inbox",
  "action.openSetup": "Connect an Agent",
  "action.install": "Connect",
  "action.write": "Write",
  "action.uninstall": "Remove Hooks",
  "action.openFolder": "Open Folder",
  "action.toggleOn": "Turn On",
  "action.toggleOff": "Turn Off",
  "action.copyInstall": "Copy Install Command",
  "action.refresh": "Refresh",
  "host.app": "Desktop",
  "host.cli": "CLI",
  "agent.claude": "Claude",
  "agent.codex": "Codex",
  "meta.agent": "Agent",
  "meta.project": "Project",
  "meta.started": "Started",
  "meta.activity": "Last Activity",
  "meta.noSummary": "No messages yet",
  "attention.input": "Waiting for input",
  "attention.question": "Asked you a question",
  "attention.permission": "Needs permission",
  "attention.failed": "Failed",
  "attention.quota": "Out of quota",
  "time.justNow": "just now",
  "time.minutes": "{n} min ago",
  "time.hours": "{n} h ago",
  "time.yesterday": "yesterday",
  "time.days": "{n} d ago",
  "time.since": "since {t}",
  "time.today": "today {t}",
  "empty.inbox.title": "Nothing needs you",
  "empty.inbox.desc": "Subscribed sessions show up here when they wait for you",
  "empty.onboard.title": "No agent connected yet",
  "empty.onboard.desc": "Connect Claude Code or Codex and sessions will show up here",
  "empty.all.title": "No sessions found",
  "empty.all.desc": "Nothing in ~/.claude/projects or ~/.codex/sessions",
  "empty.menu": "Nothing is waiting for you",
  "hud.subscribed": "Subscribed \xB7 {title}",
  "hud.unsubscribed": "Unsubscribed \xB7 {title}",
  "hud.handled": "Handled \xB7 {title}",
  "hud.archived": "Archived {n} completed sessions",
  "hud.notFound": "Couldn't match the front window to a session",
  "hud.alreadySubscribed": "Already subscribed \xB7 {title}",
  "toast.jumpFailed": "Couldn't jump back",
  "toast.copiedId": "Session ID copied \u2014 paste it in the app",
  "toast.resumed": "Resumed in a new terminal",
  "toast.installed": "Hooks written for {name}",
  "toast.uninstalled": "Hooks removed for {name}",
  "toast.installFailed": "Couldn't write the files",
  "toast.error": "Something went wrong",
  "confirm.jumpTitle": "Jump back to {target}?",
  "confirm.cancel": "Cancel",
  "setup.ready": "Ready",
  "setup.install": "Install",
  "setup.notFound": "Not found",
  "setup.on": "On",
  "setup.off": "Off",
  "setup.fallback": "Fallback",
  "setup.claudeHosts": "CLI \xB7 Desktop",
  "setup.codexHosts": "CLI \xB7 Desktop (thread links)",
  "setup.addAgent": "Add Agent",
  "setup.notifications": "System Notifications",
  "setup.notificationsSub": "Only when waiting for input",
  "setup.clickToJump": "Click to Jump Back",
  "setup.clickToJumpReady": "terminal-notifier",
  "setup.clickToJumpMissing": "terminal-notifier is missing, notifications can't jump back",
  "setup.history": "Past Sessions",
  "setup.historySub": "Scanned when All Sessions opens, never imported",
  "setup.previewTitle": "What will be written",
  "setup.previewIntro": "Nothing is written until you confirm. Originals are backed up as `*.agent-inbox.bak`.",
  "setup.uninstallIntro": "Only the entries written by this extension are removed.",
  "setup.nodeMissing": "Node.js was not found. Hooks need it to run.",
  "setup.codexHooksNote": "Codex asks you to approve new hooks once: run /hooks inside Codex.",
  "setup.customAdapter": "Custom adapter",
  "notify.waiting": "Waiting for you"
};
var dictionaries = { zh, en };
function translator(lang) {
  const dict = dictionaries[lang] ?? zh;
  return (key, vars) => {
    let s3 = dict[key] ?? zh[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s3 = s3.split(`{${k}}`).join(String(v));
    return s3;
  };
}

// src/core/install.ts
import { chmodSync, copyFileSync, existsSync as existsSync7, mkdirSync as mkdirSync4, readFileSync as readFileSync5, writeFileSync as writeFileSync3 } from "node:fs";
function terminalNotifierPath() {
  for (const p of ["/opt/homebrew/bin/terminal-notifier", "/usr/local/bin/terminal-notifier"]) if (existsSync7(p)) return p;
  return void 0;
}

// src/core/notify.ts
function jumpDeeplink(config, s3) {
  const context = encodeURIComponent(JSON.stringify({ jump: { agent: s3.agent, sessionId: s3.sessionId } }));
  return `${config.deeplinkBase}/inbox?context=${context}`;
}
function sendWaitingNotification(config, s3) {
  if (!config.notifications) return;
  const t = translator(config.language);
  const title = t(s3.attention && s3.attention !== "input" ? `attention.${s3.attention}` : "notify.waiting");
  const subtitle = s3.title || s3.sessionId;
  const message = s3.summary || " ";
  const tn = terminalNotifierPath();
  if (tn) {
    detach(tn, ["-title", title, "-subtitle", subtitle, "-message", message, "-sound", "default", "-group", `${s3.agent}:${s3.sessionId}`, "-open", jumpDeeplink(config, s3)]);
    return;
  }
  detach("/usr/bin/osascript", ["-e", `display notification ${asString(message)} with title ${asString(title)} subtitle ${asString(subtitle)} sound name "Glass"`]);
}

// cli/agent-inbox.ts
var EVENT_TYPES = ["started", "progress", "tool", "needs_input", "stopped", "failed", "quota", "ended"];
function log(msg) {
  try {
    mkdirSync5(ROOT, { recursive: true });
    appendFileSync(LOG_PATH, `${(/* @__PURE__ */ new Date()).toISOString()} ${msg}
`);
  } catch {
  }
}
function readStdin() {
  try {
    return readFileSync6(0, "utf8");
  } catch {
    return "";
  }
}
function parseJson(text) {
  try {
    const v = JSON.parse(text);
    return v && typeof v === "object" ? v : {};
  } catch {
    return {};
  }
}
async function record(ev) {
  const store = new Store();
  const t = await store.record(ev);
  if (t?.notify) sendWaitingNotification(readConfig(), t.next);
  return t;
}
async function hook(kind, args) {
  const adapterId = kind === "codex-notify" ? "codex" : kind;
  let payload;
  if (kind === "codex-notify") {
    const json = args[args.length - 1] ?? "{}";
    payload = parseJson(json);
    const then = args.indexOf("--then");
    if (then !== -1 && args.length - 1 > then + 1) {
      const cmd = args.slice(then + 1, -1);
      detach(cmd[0], [...cmd.slice(1), json]);
    }
  } else {
    payload = parseJson(readStdin());
  }
  const adapter = getAdapter(adapterId);
  if (!adapter?.parseHook) return;
  const ev = adapter.parseHook(kind, payload, process.env);
  if (!ev) return;
  if (ev.type !== "tool") ev.locator = await captureLocator(process.env);
  await record(ev);
}
function flag(args, name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : void 0;
}
async function event(args) {
  const agent = flag(args, "agent");
  const sessionId = flag(args, "session");
  const type = flag(args, "type");
  if (!agent || !sessionId || !type || !EVENT_TYPES.includes(type)) {
    process.stderr.write(`usage: agent-inbox event --agent <id> --session <id> --type <${EVENT_TYPES.join("|")}> [--summary s] [--title t] [--cwd dir] [--host cli|app]
`);
    process.exitCode = 2;
    return;
  }
  const host = flag(args, "host");
  await record({
    agent,
    sessionId,
    type,
    host: host === "app" ? "app" : host === "cli" ? "cli" : void 0,
    cwd: flag(args, "cwd") ?? process.cwd(),
    title: flag(args, "title"),
    summary: flag(args, "summary"),
    locator: await captureLocator(process.env),
    at: Date.now()
  });
}
async function jump(args) {
  const [agent, sessionId] = args;
  const store = new Store();
  const s3 = agent && sessionId ? await store.get(agent, sessionId) : void 0;
  const adapter = agent ? getAdapter(agent) : void 0;
  if (!s3 || !adapter) {
    process.stderr.write("session not found\n");
    process.exitCode = 1;
    return;
  }
  const r = await adapter.jump(s3, readConfig());
  process.stdout.write(`${r.method}
`);
  if (!r.ok) process.exitCode = 1;
}
async function list(args) {
  const rows = await new Store().all(100);
  if (args.includes("--json")) {
    process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
    return;
  }
  for (const s3 of rows) {
    process.stdout.write(`${s3.status.padEnd(11)} ${s3.subscribed ? "\u25CF" : " "} ${s3.agent}/${s3.host} ${s3.sessionId}  ${s3.title}
`);
  }
}
async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  switch (cmd) {
    case "hook":
      try {
        await hook(rest[0] ?? "", rest.slice(1));
      } catch (e) {
        log(`hook ${rest[0]}: ${e.stack ?? e}`);
      }
      return;
    case "event":
      return event(rest);
    case "jump":
      return jump(rest);
    case "list":
      return list(rest);
    case "engine-probe":
    case "version":
      process.stdout.write("agent-inbox 1\n");
      return;
    default:
      process.stderr.write("usage: agent-inbox <hook|event|jump|list> \u2026\n");
      process.exitCode = 2;
  }
}
main().catch((e) => {
  log(`fatal: ${e.stack ?? e}`);
});
