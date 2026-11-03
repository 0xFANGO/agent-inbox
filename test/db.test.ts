import { strict as assert } from "node:assert";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Store } from "../src/core/db";

const tmp = () => new Store(join(mkdtempSync(join(tmpdir(), "inbox-db-")), "db.sqlite"));

test("record, subscribe, handle, archive", async () => {
  const store = tmp();
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

test("subscribing to a history entry creates the row", async () => {
  const store = tmp();
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
