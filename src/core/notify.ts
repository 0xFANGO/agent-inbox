import { asString, detach } from "./exec";
import { translator } from "./i18n";
import { terminalNotifierPath } from "./install";
import { Config, Session } from "./types";

export function jumpDeeplink(config: Config, s: Pick<Session, "agent" | "sessionId">): string {
  const context = encodeURIComponent(JSON.stringify({ jump: { agent: s.agent, sessionId: s.sessionId } }));
  return `${config.deeplinkBase}/inbox?context=${context}`;
}

/**
 * Only "waiting for input" pops a notification. Clicking it opens the inbox through a raycast://
 * deeplink, which asks once before jumping. Needs terminal-notifier for the click; otherwise a
 * plain osascript notification is shown.
 */
export function sendWaitingNotification(config: Config, s: Session): void {
  if (!config.notifications || !s.subscribed || s.status !== "needs_input") return;
  const t = translator(config.language);
  const title = t(s.attention && s.attention !== "input" ? (`attention.${s.attention}` as const) : "notify.waiting");
  const subtitle = s.title || s.sessionId;
  const message = s.summary || " ";
  const tn = terminalNotifierPath();
  if (tn) {
    detach(tn, [
      "-title",
      title,
      "-subtitle",
      subtitle,
      "-message",
      message,
      "-sound",
      "default",
      "-group",
      `${s.agent}:${s.sessionId}`,
      "-open",
      jumpDeeplink(config, s),
    ]);
    return;
  }
  detach("/usr/bin/osascript", [
    "-e",
    `display notification ${asString(message)} with title ${asString(title)} subtitle ${asString(subtitle)} sound name "Glass"`,
  ]);
}
