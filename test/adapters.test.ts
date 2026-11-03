import { strict as assert } from "node:assert";
import { test } from "node:test";
import { parseClaudeHook } from "../src/core/adapters/claude";
import { findNotify, originalNotify, ourNotify, parseCodexNotify, setNotify } from "../src/core/adapters/codex";
import { hasOurHooks, withOurHooks, withoutOurHooks } from "../src/core/adapters/json";

const ctx = { node: "/opt/homebrew/bin/node", cli: "/Users/me/.sessions/bin/agent-inbox.mjs" };

test("codex notify: wrap an existing notify program and restore it", () => {
  const toml = `model = "gpt-5"\nnotify = ["bash", "-lc", 'say "done"']\n\n[profiles.fast]\nnotify = ["nope"]\n`;
  const span = findNotify(toml)!;
  assert.deepEqual(span.items, ["bash", "-lc", 'say "done"']);
  const ours = ourNotify(ctx, span.items);
  assert.deepEqual(ours, [ctx.node, ctx.cli, "hook", "codex-notify", "--then", "bash", "-lc", 'say "done"']);
  const installed = setNotify(toml, ours);
  assert.ok(installed.includes('[profiles.fast]\nnotify = ["nope"]'), "tables are untouched");
  // reinstall is idempotent
  assert.equal(setNotify(installed, ourNotify(ctx, findNotify(installed)!.items)), installed);
  const restored = setNotify(installed, originalNotify(findNotify(installed)!.items));
  assert.deepEqual(findNotify(restored)!.items, span.items);
});

test("codex notify: insert at top level when missing, remove cleanly", () => {
  const toml = `[mcp_servers.x]\ncommand = "y"\n`;
  const out = setNotify(toml, ourNotify(ctx, []));
  assert.ok(out.startsWith("notify = ["));
  assert.deepEqual(findNotify(out)!.items, [ctx.node, ctx.cli, "hook", "codex-notify"]);
  assert.equal(setNotify(out, null).trim(), toml.trim());
  assert.equal(findNotify(toml), null, "notify inside a table is not top level");
});

test("codex notify payload", () => {
  const e = parseCodexNotify(
    {
      type: "agent-turn-complete",
      "thread-id": "0199a0c2-1111-2222-3333-444455556666",
      cwd: "/p",
      "input-messages": ["fix ci"],
      "last-assistant-message": "Should I push?",
    },
    {},
    5,
  )!;
  assert.equal(e.type, "needs_input");
  assert.equal(e.attention, "question");
  assert.equal(e.title, "fix ci");
  assert.equal(e.host, "cli");
  assert.equal(
    parseCodexNotify(
      { type: "agent-turn-complete", "thread-id": "t", "last-assistant-message": "Pushed." },
      { __CFBundleIdentifier: "com.openai.codex" },
    )!.host,
    "app",
  );
});

test("claude hook payloads", () => {
  const base = { session_id: "abc", cwd: "/p", transcript_path: "" };
  assert.equal(parseClaudeHook({ ...base, hook_event_name: "UserPromptSubmit", prompt: "hi" }, {})!.type, "progress");
  assert.equal(
    parseClaudeHook(
      { ...base, hook_event_name: "Notification", notification_type: "idle_prompt", message: "Claude is waiting for your input" },
      {},
    ),
    null,
  );
  const perm = parseClaudeHook({ ...base, hook_event_name: "Notification", message: "Claude needs your permission to use Bash" }, {})!;
  assert.equal(perm.attention, "permission");
  assert.equal(parseClaudeHook({ ...base, hook_event_name: "Stop", last_assistant_message: "要不要继续？" }, {})!.type, "needs_input");
  assert.equal(parseClaudeHook({ ...base, hook_event_name: "Stop", last_assistant_message: "完成了。" }, {})!.type, "stopped");
  assert.equal(parseClaudeHook({ ...base, hook_event_name: "SessionStart" }, { CLAUDE_CODE_ENTRYPOINT: "claude-desktop" })!.host, "app");
  assert.equal(parseClaudeHook({ hook_event_name: "Stop" }, {}), null);
});

test("json hooks merge keeps user hooks and is idempotent", () => {
  const user = { model: "opus", hooks: { Stop: [{ hooks: [{ type: "command", command: "afplay x.aiff" }] }] } };
  const ours = { Stop: { hooks: [{ type: "command", command: "node /x/agent-inbox.mjs hook claude" }] } };
  const once = withOurHooks(user, ours);
  const twice = withOurHooks(once, ours);
  assert.deepEqual(once, twice);
  assert.equal(once.hooks!.Stop.length, 2);
  assert.ok(hasOurHooks(once));
  assert.deepEqual(withoutOurHooks(once), user);
});
