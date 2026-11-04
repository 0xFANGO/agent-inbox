import {
  Action,
  ActionPanel,
  Color,
  Icon,
  launchCommand,
  LaunchType,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
} from "@raycast/api";
import { useState } from "react";
import { AgentSetup } from "./components/AgentSetup";
import { writeConfig } from "./core/config";
import { locale } from "./lib/env";
import { useContentSearch } from "./lib/content-search";

export default function Settings() {
  const { t, config } = locale();
  const contentSearch = useContentSearch(t);
  const [notifications, setNotifications] = useState(config.notifications);
  const [menuBarEnabled, setMenuBarEnabled] = useState(config.menuBarEnabled);
  const [updatingMenuBar, setUpdatingMenuBar] = useState(false);

  async function toggleMenuBar() {
    if (updatingMenuBar) return;
    setUpdatingMenuBar(true);
    const next = !menuBarEnabled;
    let saved = false;
    try {
      writeConfig({ menuBarEnabled: next });
      saved = true;
      await launchCommand({ name: "menu-bar", type: LaunchType.Background });
      setMenuBarEnabled(next);
    } catch (error) {
      // Keep the displayed preference consistent with a refresh that actually succeeded.
      if (saved) {
        try {
          writeConfig({ menuBarEnabled });
        } catch {
          // Still surface the original failure if the configuration became unwritable.
        }
      }
      await showToast({
        style: Toast.Style.Failure,
        title: t("toast.menuBarFailed"),
        message: saved ? t("settings.menuBarUnavailable") : String((error as Error).message ?? error),
        primaryAction: { title: t("action.preferences"), onAction: openExtensionPreferences },
      });
      console.error("Unable to refresh menu bar", error);
    } finally {
      setUpdatingMenuBar(false);
    }
  }

  return (
    <List isLoading={updatingMenuBar} navigationTitle={t("nav.settings")} searchBarPlaceholder={t("search.settingsPlaceholder")}>
      <List.Section title={t("section.general")}>
        <List.Item
          icon={Icon.Plug}
          title={t("action.openSetup")}
          subtitle={t("settings.agentsSub")}
          actions={
            <ActionPanel>
              <Action.Push title={t("action.openSetup")} icon={Icon.Plug} target={<AgentSetup />} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Globe}
          title={t("settings.language")}
          subtitle={t("settings.languageSub")}
          accessories={[{ text: config.language === "en" ? "English" : "中文" }]}
          actions={
            <ActionPanel>
              <Action title={t("action.preferences")} icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title={t("section.dataAndAlerts")}>
        <List.Item
          icon={Icon.MagnifyingGlass}
          title={t("settings.contentSearch")}
          subtitle={t("settings.contentSearchSub")}
          accessories={[
            {
              tag: contentSearch.enabled
                ? { value: t("setup.on"), color: Color.Green }
                : { value: t("setup.off"), color: Color.SecondaryText },
            },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={contentSearch.enabled ? t("action.toggleOff") : t("search.enable")}
                onAction={() => contentSearch.setEnabled(!contentSearch.enabled)}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.AppWindow}
          title={t("settings.menuBar")}
          subtitle={t("settings.menuBarSub")}
          accessories={[
            { tag: menuBarEnabled ? { value: t("setup.on"), color: Color.Green } : { value: t("setup.off"), color: Color.SecondaryText } },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={menuBarEnabled ? t("action.toggleOff") : t("action.toggleOn")}
                icon={menuBarEnabled ? Icon.EyeDisabled : Icon.Eye}
                onAction={toggleMenuBar}
              />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Terminal}
          title={t("setup.resumeTerminal")}
          subtitle={t("setup.resumeTerminalSub")}
          accessories={[
            { text: config.resumeTerminal === "iterm" ? "iTerm2" : config.resumeTerminal === "ghostty" ? "Ghostty" : "Terminal" },
          ]}
          actions={
            <ActionPanel>
              <Action title={t("action.preferences")} icon={Icon.Gear} onAction={openExtensionPreferences} />
            </ActionPanel>
          }
        />
        <List.Item
          icon={Icon.Bell}
          title={t("setup.notifications")}
          subtitle={t("setup.notificationsSub")}
          accessories={[
            { tag: notifications ? { value: t("setup.on"), color: Color.Green } : { value: t("setup.off"), color: Color.SecondaryText } },
          ]}
          actions={
            <ActionPanel>
              <Action
                title={notifications ? t("action.toggleOff") : t("action.toggleOn")}
                icon={notifications ? Icon.BellDisabled : Icon.Bell}
                onAction={() => setNotifications(writeConfig({ notifications: !notifications }).notifications)}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
