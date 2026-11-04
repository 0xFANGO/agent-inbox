import { strict as assert } from "node:assert";
import { join } from "node:path";
import { test, TestContext } from "node:test";
import { Store } from "../src/core/db";
import { tempDir } from "./helpers";

const tmp = (t: TestContext) => new Store(join(tempDir(t), "db.sqlite"));

test("record, subscribe, handle, archive", async (context) => {
  const store = tmp(context);
  await store.record({
    agent: "claude",
    sessionId: "a",
    type: "progress",
    title: '它\'s "quoted"',
    cwd: "/x",
    at: 1,
    locator: { tty: "/dev/ttys001" },
  });
  await store.record({ agent: "codex", sessionId: "b", type: "needs_input", summary: "要不要？", at: 2 });
  assert.equal((await store.active()).length, 1, "unsubscribed running session is not active; waiting one is");

  await store.setSubscribed("claude", "a", true);
  let a = (await store.get("claude", "a"))!;
  assert.equal(a.title, '它\'s "quoted"');
  assert.deepEqual(a.locator, { tty: "/dev/ttys001" });
  assert.equal(a.subscribed, true);

  const t = await store.record({ agent: "claude", sessionId: "a", type: "needs_input", at: 3 });
  assert.equal(t!.notify, true);
  await store.record({ agent: "claude", sessionId: "a", type: "stopped", summary: "done", at: 4 });
  assert.equal((await store.active()).length, 2);

  assert.equal(await store.archiveDone(10), 1);
  a = (await store.get("claude", "a"))!;
  assert.equal(a.handledAt, 10);
  assert.equal((await store.active()).length, 1);

  await store.markHandled("codex", "b", 11);
  assert.equal((await store.active()).length, 0);
  await store.record({ agent: "codex", sessionId: "b", type: "progress", at: 12 });
  assert.equal((await store.get("codex", "b"))!.handledAt, null);
});

test("subscribing to a history entry creates the row", async (context) => {
  const store = tmp(context);
  await store.subscribeEntry({
    agent: "codex",
    sessionId: "h",
    host: "cli",
    title: "old",
    cwd: "/y",
    status: "idle",
    attention: null,
    summary: "",
    locator: {},
    subscribed: false,
    handledAt: null,
    startedAt: 1,
    updatedAt: 1,
    transcriptPath: "/t.jsonl",
  });
  const row = (await store.get("codex", "h"))!;
  assert.equal(row.subscribed, true);
  assert.equal(row.status, "idle");
});

test("sessions with the same ID stay independent across agents and quoted IDs remain data", async (t) => {
  const store = tmp(t);
  const sessionId = "s'); DROP TABLE sessions; --";
  await store.record({ agent: "claude", sessionId, type: "progress", at: 1 });
  await store.record({ agent: "codex", sessionId, type: "needs_input", at: 2 });
  await store.setSubscribed("claude", sessionId, true);
  await store.markHandled("codex", sessionId, 3);
  assert.equal((await store.get("claude", sessionId))!.subscribed, true);
  assert.equal((await store.get("claude", sessionId))!.handledAt, null);
  assert.equal((await store.get("codex", sessionId))!.subscribed, false);
  assert.deepEqual(
    (await store.active()).map((s) => s.agent),
    ["claude"],
  );
  await store.unmarkHandled("codex", sessionId);
  assert.equal((await store.active()).length, 2);
  assert.equal((await store.all(1))[0].agent, "codex");
});

test("subscribing stale history preserves a live session's state and locator", async (t) => {
  const store = tmp(t);
  await store.record({ agent: "claude", sessionId: "s", type: "started", at: 1 });
  const stale = (await store.get("claude", "s"))!;
  await store.record({ agent: "claude", sessionId: "s", type: "progress", title: "Live title", locator: { tty: "/dev/ttys007" }, at: 2 });
  await store.subscribeEntry(stale);
  const current = (await store.get("claude", "s"))!;
  assert.equal(current.subscribed, true);
  assert.equal(current.status, "running");
  assert.equal(current.title, "Live title");
  assert.deepEqual(current.locator, { tty: "/dev/ttys007" });
  assert.equal(current.updatedAt, 2);
});

test("subscribing history cannot overwrite a hook row after a stale absence check", async (t) => {
  const store = tmp(t);
  await store.record({ agent: "claude", sessionId: "s", type: "started", at: 1 });
  const stale = (await store.get("claude", "s"))!;
  await store.record({ agent: "claude", sessionId: "s", type: "progress", title: "New live prompt", cwd: "/live", at: 20 });
  // Reproduce the stale result a separate existence check can return while a hook creates the row.
  store.get = async () => undefined;
  await store.subscribeEntry(stale);
  const current = (await new Store(store.path).get("claude", "s"))!;
  assert.equal(current.subscribed, true);
  assert.equal(current.status, "running");
  assert.equal(current.title, "New live prompt");
  assert.equal(current.cwd, "/live");
  assert.equal(current.updatedAt, 20);
});
