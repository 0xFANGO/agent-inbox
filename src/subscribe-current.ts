import { closeMainWindow, getFrontmostApplication, showHUD } from "@raycast/api";
import { captureForeground, sessionForForeground } from "./core/foreground";
import { FocusAccessError } from "./core/focused-window";
import { scanHistory } from "./core/history";
import { mergeSessions } from "./core/merge";
import { locale } from "./lib/env";
import { allSessions, store } from "./lib/sessions";

/**
 * Hotkey command (suggested ⌃⌥S), no UI: subscribe to the session in the front window.
 * This is the main way to pick one conversation out of many.
 */
export default async function SubscribeCurrent() {
  const { t } = locale();
  let bundleId: string | undefined;
  try {
    bundleId = (await getFrontmostApplication()).bundleId;
    await closeMainWindow();
    if (bundleId === "com.raycast.macos") bundleId = (await getFrontmostApplication()).bundleId;
  } catch {
    bundleId = undefined;
  }
  let session;
  try {
    const focused = await captureForeground(bundleId);
    const sessions = mergeSessions(await allSessions(1000), scanHistory({ limit: 400 }));
    session = await sessionForForeground(focused, sessions);
  } catch (error) {
    await showHUD(t(error instanceof FocusAccessError ? "hud.focusPermission" : "hud.notFound"));
    return;
  }
  if (!session) {
    await showHUD(t("hud.notFound"));
    return;
  }
  const title = session.title || session.sessionId;
  if (session.subscribed) {
    await showHUD(t("hud.alreadySubscribed", { title }));
    return;
  }
  await store.subscribeEntry(session);
  await showHUD(t("hud.subscribed", { title }));
}
