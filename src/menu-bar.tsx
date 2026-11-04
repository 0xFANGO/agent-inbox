import { Color, Icon, launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { relativeTime, rowTime } from "./core/format";
import { groupInbox, waitingCount } from "./core/status";
import { agentIcon } from "./components/icons";
import { locale } from "./lib/env";
import { activeSessions, jumpBack } from "./lib/sessions";

/**
 * Always shows how many subscribed sessions wait for you; the bell turns orange when one does.
 * Refreshed by Raycast's background refresh (interval in package.json) — hooks write the database,
 * this only reads it.
 */
export default function MenuBar() {
  const { t, config } = locale();
  const { data, isLoading } = useCachedPromise(activeSessions, []);
  const sessions = (data ?? []).filter((s) => s.subscribed);
  const groups = groupInbox(sessions);
  const count = waitingCount(sessions);

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: Icon.Bell, tintColor: count > 0 ? Color.Orange : undefined }}
      title={count > 0 ? String(count) : undefined}
      tooltip={t("nav.inbox")}
    >
      {groups.needs_input.length === 0 && groups.running.length === 0 && <MenuBarExtra.Item title={t("empty.menu")} />}
      {groups.needs_input.length > 0 && (
        <MenuBarExtra.Section title={t("section.needsInput")}>
          {groups.needs_input.map((s) => (
            <MenuBarExtra.Item
              key={`${s.agent}:${s.sessionId}`}
              icon={agentIcon(s.agent)}
              title={s.title || s.sessionId}
              subtitle={relativeTime(s.updatedAt, t)}
              onAction={() => jumpBack(s, config, t)}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      {groups.running.length > 0 && (
        <MenuBarExtra.Section title={t("section.running")}>
          {groups.running.map((s) => (
            <MenuBarExtra.Item
              key={`${s.agent}:${s.sessionId}`}
              icon={agentIcon(s.agent)}
              title={s.title || s.sessionId}
              subtitle={rowTime(s, t)}
              onAction={() => jumpBack(s, config, t)}
            />
          ))}
        </MenuBarExtra.Section>
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={t("action.openInbox")}
          shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          onAction={() => launchCommand({ name: "inbox", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
