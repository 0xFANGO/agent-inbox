import { strict as assert } from "node:assert";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

const CLI = join(process.cwd(), "assets", "agent-inbox.mjs");

test("hook CLI writes events into the database (built bundle)", () => {
  const home = mkdtempSync(join(tmpdir(), "inbox-cli-"));
  const env = {
    ...process.env,
    AGENT_INBOX_HOME: home,
    TMUX_PANE: "%7",
    TMUX: "/tmp/tmux-501/default,1,0",
    __CFBundleIdentifier: "com.mitchellh.ghostty",
  };
  const hook = (payload: object) => execFileSync(process.execPath, [CLI, "hook", "claude"], { env, input: JSON.stringify(payload) });
  hook({ hook_event_name: "SessionStart", session_id: "s-1", cwd: "/work/chatcut" });
  hook({ hook_event_name: "UserPromptSubmit", session_id: "s-1", cwd: "/work/chatcut", prompt: "chatcut 转场 shader 修复" });
  hook({ hook_event_name: "Stop", session_id: "s-1", cwd: "/work/chatcut", last_assistant_message: "修好了，要我提交吗？" });
  // malformed input must not crash the agent
  execFileSync(process.execPath, [CLI, "hook", "claude"], { env, input: "not json" });

  execFileSync(
    process.execPath,
    [
      CLI,
      "hook",
      "codex-notify",
      JSON.stringify({ type: "agent-turn-complete", "thread-id": "t-9", cwd: "/w", "last-assistant-message": "ok." }),
    ],
    { env },
  );
  execFileSync(
    process.execPath,
    [CLI, "event", "--agent", "t3code", "--session", "x1", "--type", "needs_input", "--summary", "pick one", "--title", "Plan"],
    { env },
  );

  const rows = JSON.parse(execFileSync(process.execPath, [CLI, "list", "--json"], { env, encoding: "utf8" }));
  const s = rows.find((r: { sessionId: string }) => r.sessionId === "s-1");
  assert.equal(s.status, "needs_input");
  assert.equal(s.attention, "question");
  assert.equal(s.title, "chatcut 转场 shader 修复");
  assert.equal(s.locator.tmuxPane, "%7");
  assert.equal(s.locator.tmuxSocket, "/tmp/tmux-501/default");
  assert.equal(s.locator.bundleId, "com.mitchellh.ghostty");
  assert.equal(rows.find((r: { sessionId: string }) => r.sessionId === "t-9").status, "done");
  assert.equal(rows.find((r: { sessionId: string }) => r.sessionId === "x1").agent, "t3code");

  let log = "";
  try {
    log = readFileSync(join(home, "log.txt"), "utf8");
  } catch {
    log = "";
  }
  assert.equal(log, "", "no errors logged");
});
