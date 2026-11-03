import { getFrontmostApplication, showHUD } from "@raycast/api";
import { sessionForForeground } from "./core/foreground";
import { locale } from "./lib/env";
import { store } from "./lib/sessions";

/**
 * Hotkey command (suggested ⌃⌥S), no UI: subscribe to the session in the front window.
 * This is the main way to pick one conversation out of many.
 */
export default async function SubscribeCurrent() {
  const { t } = locale();
  let bundleId: string | undefined;
  try {
    bundleId = (await getFrontmostApplication()).bundleId;
  } catch {
    bundleId = undefined;
  }
  const session = await sessionForForeground(bundleId, await store.all(300));
  if (!session) {
    await showHUD(t("hud.notFound"));
    return;
  }
  const title = session.title || session.sessionId;
  if (session.subscribed) {
    await showHUD(t("hud.alreadySubscribed", { title }));
    return;
  }
  await store.setSubscribed(session.agent, session.sessionId, true);
  await showHUD(t("hud.subscribed", { title }));
}
