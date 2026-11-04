import { strict as assert } from "node:assert";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { CLAUDE_BUNDLE, ClaudeDesktopSession } from "../src/core/claude-desktop";
import { CODEX_APP_BUNDLE } from "../src/core/adapters/codex";
import { FocusAccessError, readFocusedWindow } from "../src/core/focused-window";
import { sessionForForeground } from "../src/core/foreground";
import { Store } from "../src/core/db";
import { TERMINAL_BUNDLE, GHOSTTY_BUNDLE, TmuxClient } from "../src/core/terminal";
import { Session } from "../src/core/types";
import { join } from "node:path";
import { tempDir } from "./helpers";

const base: Session = {
  agent: "claude",
  sessionId: "cli-one",
  host: "app",
  title: "Focused session",
  cwd: "/project",
  status: "idle",
  attention: null,
  summary: "",
  locator: { claudeDesktopId: "local_one" },
  subscribed: false,
  handledAt: null,
  startedAt: 1,
  updatedAt: 1,
  transcriptPath: "",
};
const record: ClaudeDesktopSession = {
  sessionId: "local_one",
  cliSessionId: "cli-one",
  title: base.title,
  cwd: base.cwd,
  createdAt: 1,
  lastActivityAt: 1,
  lastFocusedAt: 1,
  isArchived: false,
};
const noIO = { readClaudeDesktopSessions: (): ClaudeDesktopSession[] => [], tmuxClients: async (): Promise<TmuxClient[]> => [] };

test("current Claude document ID wins over a newer background session and duplicate titles", async () => {
  const background = { ...base, sessionId: "other", locator: { claudeDesktopId: "local_other" }, updatedAt: 999 };
  const focused = { bundleId: CLAUDE_BUNDLE, window: { title: base.title, url: "https://claude.ai/epitaxy/local_one?artifact=123" } };
  assert.equal((await sessionForForeground(focused, [background, base], noIO))?.sessionId, base.sessionId);
  assert.equal(
    await sessionForForeground(
      { ...focused, window: { title: base.title, url: "https://claude.ai/epitaxy/local_absent" } },
      [background, base],
      noIO,
    ),
    undefined,
  );
});

test("unique current Claude Code title works without AXURL; ambiguity and ordinary chat do not", async () => {
  const focused = { bundleId: CLAUDE_BUNDLE, window: { title: `${base.title} - Claude Code`, url: "" } };
  assert.equal((await sessionForForeground(focused, [base], noIO))?.sessionId, base.sessionId);
  assert.equal(await sessionForForeground(focused, [base, { ...base, sessionId: "duplicate" }], noIO), undefined);
  for (const window of [
    { title: "Claude", url: "" },
    { title: `${base.title} - Claude`, url: "" },
    { title: focused.window.title, url: "https://claude.ai/chat/ordinary" },
    { title: focused.window.title, url: "https://example.com/epitaxy/local_one" },
  ])
    assert.equal(await sessionForForeground({ ...focused, window }, [base], noIO), undefined);
});

test("switching documents changes the selected session without any hook activity", async () => {
  const other = { ...base, sessionId: "cli-two", title: "Other session", locator: { claudeDesktopId: "local_two" } };
  for (const current of [base, other, base]) {
    const result = await sessionForForeground(
      { bundleId: CLAUDE_BUNDLE, window: { title: `${current.title} - Claude Code`, url: "" } },
      [base, other],
      noIO,
    );
    assert.equal(result?.sessionId, current.sessionId);
  }
});

test("a focused desktop session outside the database/history limit can be subscribed", async (t) => {
  const session = await sessionForForeground({ bundleId: CLAUDE_BUNDLE, window: { title: `${record.title} - Claude Code`, url: "" } }, [], {
    ...noIO,
    readClaudeDesktopSessions: () => [record],
  });
  assert.equal(session?.sessionId, record.cliSessionId);
  const store = new Store(join(tempDir(t), "sessions.sqlite"));
  await store.subscribeEntry(session!);
  assert.equal((await store.get("claude", record.cliSessionId))?.subscribed, true);
  assert.equal((await store.get("claude", record.cliSessionId))?.locator.claudeDesktopId, record.sessionId);
});

test("desktop enrichment does not create duplicate candidates from an existing hook row", async () => {
  const result = await sessionForForeground(
    { bundleId: CLAUDE_BUNDLE, window: { title: `${record.title} - Claude Code`, url: "" } },
    [{ ...base, locator: {} }],
    { ...noIO, readClaudeDesktopSessions: () => [record] },
  );
  assert.equal(result?.sessionId, base.sessionId);
});

test("Codex uses the focused title, and never guesses from last updated when no window is available", async () => {
  const current = { ...base, agent: "codex", locator: {} };
  assert.equal(
    (await sessionForForeground({ bundleId: CODEX_APP_BUNDLE, window: { title: base.title, url: "" } }, [current], noIO))?.sessionId,
    base.sessionId,
  );
  assert.equal(await sessionForForeground({ bundleId: CODEX_APP_BUNDLE }, [current], noIO), undefined);
  assert.equal(await sessionForForeground({ bundleId: "unrelated.app" }, [base], noIO), undefined);
});

test("current terminal tty selects the exact tab, without falling back to another tab", async () => {
  const current = { ...base, host: "cli" as const, locator: { bundleId: GHOSTTY_BUNDLE, tty: "/dev/ttys001" } };
  const other = { ...current, sessionId: "other", updatedAt: 999, locator: { ...current.locator, tty: "/dev/ttys002" } };
  assert.equal(
    (await sessionForForeground({ bundleId: GHOSTTY_BUNDLE, tty: "/dev/ttys001" }, [other, current], noIO))?.sessionId,
    current.sessionId,
  );
  assert.equal(await sessionForForeground({ bundleId: GHOSTTY_BUNDLE, tty: "/dev/ttys003" }, [other, current], noIO), undefined);
  assert.equal(await sessionForForeground({ bundleId: GHOSTTY_BUNDLE }, [other, current], noIO), undefined);
  assert.equal(
    await sessionForForeground({ bundleId: GHOSTTY_BUNDLE, tty: "/dev/ttys001" }, [current, { ...current, sessionId: "duplicate" }], noIO),
    undefined,
  );
});

test("tmux matches the current outer tty, server socket and pane together", async () => {
  const pane = (sessionId: string, tmuxSocket: string) => ({
    ...base,
    sessionId,
    host: "cli" as const,
    locator: { tty: "/dev/ttys090", tmuxPane: "%1", tmuxSocket, bundleId: TERMINAL_BUNDLE },
  });
  const sessions = [pane("current", "/tmp/one"), pane("background", "/tmp/two")];
  const queried: (string | undefined)[] = [];
  const result = await sessionForForeground({ bundleId: TERMINAL_BUNDLE, tty: "/dev/ttys001" }, sessions, {
    ...noIO,
    tmuxClients: async (socket?: string) => {
      queried.push(socket);
      return [{ tty: socket === "/tmp/one" ? "/dev/ttys001" : "/dev/ttys002", pane: "%1", activity: 999, socket: socket! }];
    },
  });
  assert.equal(result?.sessionId, "current");
  assert.deepEqual(queried.sort(), ["/tmp/one", "/tmp/two"]);
  assert.equal(
    await sessionForForeground({ bundleId: TERMINAL_BUNDLE, tty: "/dev/ttys090" }, sessions, noIO),
    undefined,
    "a pane tty is not a selected outer tab",
  );
});

interface FakeElement {
  attributes: { byName: (name: string) => { value: () => unknown } };
  uiElements: () => FakeElement[];
}
function element(attributes: Record<string, unknown>, children: FakeElement[] = []): FakeElement {
  return { attributes: { byName: (name) => ({ value: () => attributes[name] }) }, uiElements: () => children };
}

test("window probe skips the empty Electron shell and ignores nested artifact documents", async () => {
  const artifact = element({ AXRole: "AXWebArea", AXTitle: "Unrelated artifact", AXURL: "https://artifact.example" });
  const document = element({ AXRole: "AXWebArea", AXTitle: `${base.title} - Claude Code` }, [artifact]);
  const shell = element({ AXRole: "AXWebArea", AXTitle: "", AXURL: "" });
  const window = element({ AXRole: "AXWindow", AXTitle: "Claude" }, [shell, document]);
  const app = element({ AXFocusedWindow: window });
  const result = await readFocusedWindow(CLAUDE_BUNDLE, async (script) =>
    script.includes('ObjC.import("AppKit")')
      ? { ok: false, stdout: "", stderr: "native bridge unavailable" }
      : {
          ok: true,
          stderr: "",
          stdout: runInNewContext(script, { Application: () => ({ applicationProcesses: { whose: () => () => [app] } }) }),
        },
  );
  assert.deepEqual(result, { title: `${base.title} - Claude Code`, url: "" });
});

test("a current cloud URL maps through persisted bridge aliases rather than the page title", async () => {
  const context = {
    bundleId: CLAUDE_BUNDLE,
    window: { title: "Different or duplicate title - Claude Code", url: "https://claude.ai/epitaxy/cse_bridge1" },
  };
  const desktop = { ...record, bridgeSessionIds: ["session_bridge1"] };
  assert.equal(
    (await sessionForForeground(context, [base], { ...noIO, readClaudeDesktopSessions: () => [desktop] }))?.sessionId,
    base.sessionId,
  );
  assert.equal(
    await sessionForForeground(context, [base], {
      ...noIO,
      readClaudeDesktopSessions: () => [desktop, { ...desktop, sessionId: "local_two", cliSessionId: "cli-two" }],
    }),
    undefined,
  );
});

test("a successful native focus read is authoritative, including no focused window", async () => {
  for (const value of [null, { title: base.title, url: "https://claude.ai/epitaxy/local_one" }]) {
    let calls = 0;
    const result = await readFocusedWindow(CLAUDE_BUNDLE, async () => {
      calls++;
      return { ok: true, stdout: JSON.stringify(value), stderr: "" };
    });
    assert.deepEqual(result, value ?? undefined);
    assert.equal(calls, 1, "do not fall back to a background window when native AX reports no focus");
  }
});

test("window probe reports denied permissions and rejects malformed or failed output", async () => {
  await assert.rejects(
    readFocusedWindow(CLAUDE_BUNDLE, async () => ({ ok: false, stdout: "", stderr: "not allowed assistive access (-1719)" })),
    FocusAccessError,
  );
  assert.equal(await readFocusedWindow(CLAUDE_BUNDLE, async () => ({ ok: true, stdout: "not-json", stderr: "" })), undefined);
  assert.equal(await readFocusedWindow(CLAUDE_BUNDLE, async () => ({ ok: false, stdout: "", stderr: "timed out" })), undefined);
});
