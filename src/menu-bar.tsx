import { Color, Icon, launchCommand, LaunchType, MenuBarExtra } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { rowTime } from "./core/format";
import { groupInbox, waitingCount } from "./core/status";
import { agentIcon } from "./components/icons";
import { locale } from "./lib/env";
import { activeSessions, jumpBack } from "./lib/sessions";

/**
 * When enabled in Settings, shows subscribed sessions and their waiting count.
 * Refreshed by Raycast's background refresh (interval in package.json) — hooks write the database,
 * this only reads it.
 */
export default function MenuBar() {
  const { t, config } = locale();
  const { data, isLoading } = useCachedPromise(activeSessions, [], { execute: config.menuBarEnabled });
  const sessions = (data ?? []).filter((s) => s.subscribed);
  const groups = groupInbox(sessions);
  const count = waitingCount(sessions);

  if (!config.menuBarEnabled) return null;

  return (
    <MenuBarExtra
      isLoading={isLoading}
      icon={{ source: Icon.Bell, tintColor: count > 0 ? Color.Orange : undefined }}
      title={count > 0 ? String(count) : undefined}
      tooltip={t("nav.menuBar")}
    >
      {sessions.length === 0 && <MenuBarExtra.Item title={t("empty.menu")} />}
      {(["needs_input", "subscribed", "done"] as const).map(
        (section) =>
          groups[section].length > 0 && (
            <MenuBarExtra.Section
              key={section}
              title={t(section === "needs_input" ? "section.needsInput" : section === "done" ? "section.done" : "section.subscribed")}
            >
              {groups[section].map((s) => (
                <MenuBarExtra.Item
                  key={`${s.agent}:${s.sessionId}`}
                  icon={agentIcon(s.agent)}
                  title={s.title || s.sessionId}
                  subtitle={rowTime(s, t)}
                  onAction={() => jumpBack(s, config, t)}
                />
              ))}
            </MenuBarExtra.Section>
          ),
      )}
      <MenuBarExtra.Section>
        <MenuBarExtra.Item
          title={t("action.openInbox")}
          shortcut={{ modifiers: ["cmd", "shift"], key: "i" }}
          onAction={() => launchCommand({ name: "inbox", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title={t("action.openAll")}
          icon={Icon.List}
          onAction={() => launchCommand({ name: "all-sessions", type: LaunchType.UserInitiated })}
        />
        <MenuBarExtra.Item
          title={t("nav.settings")}
          icon={Icon.Gear}
          onAction={() => launchCommand({ name: "settings", type: LaunchType.UserInitiated })}
        />
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}
