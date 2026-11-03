import {
  Action,
  ActionPanel,
  Alert,
  Color,
  confirmAlert,
  Detail,
  environment,
  Icon,
  List,
  showToast,
  Toast,
  useNavigation,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { join } from "node:path";
import { useState } from "react";
import { allAdapters, Adapter, InstallPlan } from "./core/adapters";
import { ensureAdaptersDir } from "./core/adapters/custom";
import { readConfig, writeConfig } from "./core/config";
import { Translator } from "./core/i18n";
import { applyPlan, installCli, resolveNode, terminalNotifierPath } from "./core/install";
import { ADAPTERS_DIR, CLI_PATH, tildify } from "./core/paths";
import { locale } from "./lib/env";
import { agentIcon } from "./components/icons";

type Tag = { value: string; color: Color.ColorLike };

function hostsLabel(a: Adapter, t: Translator): string {
  if (a.id === "claude") return t("setup.claudeHosts");
  if (a.id === "codex") return t("setup.codexHosts");
  return t("setup.customAdapter");
}

/**
 * First run: one row per adapter (generated from the adapter list), plus notifications.
 * Nothing is written before the exact content is shown and confirmed.
 */
export default function Setup() {
  const { t } = locale();
  const [notifications, setNotifications] = useState(readConfig().notifications);
  const { data, isLoading, revalidate } = useCachedPromise(async () => allAdapters().map((a) => ({ adapter: a, detect: a.detect() })));
  const notifier = terminalNotifierPath();

  const tagFor = (d: { present: boolean; hooked: boolean }): Tag =>
    d.hooked
      ? { value: t("setup.ready"), color: Color.Green }
      : d.present
        ? { value: t("setup.install"), color: Color.Blue }
        : { value: t("setup.notFound"), color: Color.SecondaryText };

  return (
    <List isLoading={isLoading} navigationTitle={t("nav.setup")}>
      <List.Section title={t("section.agents")}>
        {(data ?? []).map(({ adapter, detect }) => (
          <List.Item
            key={adapter.id}
            icon={agentIcon(adapter.id)}
            title={adapter.name}
            subtitle={hostsLabel(adapter, t)}
            accessories={[{ tag: tagFor(detect) }]}
            actions={
              <ActionPanel>
                {adapter.id === "claude" || adapter.id === "codex" ? (
                  <Action.Push
                    title={t("action.install")}
                    icon={Icon.Plug}
                    target={<InstallPreview adapter={adapter} t={t} onDone={revalidate} />}
                  />
                ) : (
                  <Action.ShowInFinder title={t("action.openFolder")} path={join(ADAPTERS_DIR, `${adapter.id}.json`)} />
                )}
                {detect.hooked && <UninstallAction adapter={adapter} t={t} onDone={revalidate} />}
              </ActionPanel>
            }
          />
        ))}
        <List.Item
          icon={Icon.PlusCircle}
          title={t("setup.addAgent")}
          subtitle={tildify(ADAPTERS_DIR)}
          accessories={[{ tag: { value: t("action.openFolder"), color: Color.SecondaryText } }]}
          actions={
            <ActionPanel>
              <Action.Open title={t("action.openFolder")} icon={Icon.Folder} target={ensureAdaptersDir()} />
            </ActionPanel>
          }
        />
      </List.Section>
      <List.Section title={t("section.dataAndAlerts")}>
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
        <List.Item
          icon={Icon.ArrowNe}
          title={t("setup.clickToJump")}
          subtitle={notifier ? t("setup.clickToJumpReady") : t("setup.clickToJumpMissing")}
          accessories={[
            { tag: notifier ? { value: t("setup.ready"), color: Color.Green } : { value: t("setup.fallback"), color: Color.Orange } },
          ]}
          actions={
            notifier ? undefined : (
              <ActionPanel>
                <Action.CopyToClipboard title={t("action.copyInstall")} content="brew install terminal-notifier" />
              </ActionPanel>
            )
          }
        />
      </List.Section>
    </List>
  );
}

function bundledCli(): string {
  return join(environment.assetsPath, "agent-inbox.mjs");
}

function planMarkdown(plan: InstallPlan, intro: string, t: Translator, extra: string[] = []): string {
  const parts = [`## ${t("setup.previewTitle")}`, intro, ...extra.map((e) => `> ${e}`)];
  for (const c of plan.changes) {
    parts.push(`**${tildify(c.path)}** — ${c.summary}`);
    if (c.preview) parts.push("```" + c.previewLang + "\n" + c.preview + "\n```");
  }
  for (const n of plan.notes) parts.push(`> ${t(n as Parameters<Translator>[0])}`);
  return parts.join("\n\n");
}

function InstallPreview({ adapter, t, onDone }: { adapter: Adapter; t: Translator; onDone: () => void }) {
  const { pop } = useNavigation();
  const { data, isLoading, error } = useCachedPromise(
    async (id: string) => {
      const node = await resolveNode();
      const plan = adapter.planInstall({ node: node ?? "node", cli: CLI_PATH });
      return { id, node, plan };
    },
    [adapter.id],
  );

  const markdown = error
    ? `## ${t("toast.error")}\n\n${error.message}`
    : data
      ? planMarkdown(data.plan, t("setup.previewIntro"), t, data.node ? [] : [t("setup.nodeMissing")])
      : "";

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={adapter.name}
      markdown={markdown}
      actions={
        data && !error ? (
          <ActionPanel>
            <Action
              title={t("action.write")}
              icon={Icon.Download}
              onAction={async () => {
                try {
                  installCli(bundledCli());
                  applyPlan(data.plan);
                  await showToast({ style: Toast.Style.Success, title: t("toast.installed", { name: adapter.name }) });
                  onDone();
                  pop();
                } catch (e) {
                  await showToast({
                    style: Toast.Style.Failure,
                    title: t("toast.installFailed"),
                    message: String((e as Error).message ?? e),
                  });
                }
              }}
            />
          </ActionPanel>
        ) : undefined
      }
    />
  );
}

function UninstallAction({ adapter, t, onDone }: { adapter: Adapter; t: Translator; onDone: () => void }) {
  return (
    <Action
      title={t("action.uninstall")}
      icon={Icon.Trash}
      style={Action.Style.Destructive}
      shortcut={{ modifiers: ["ctrl"], key: "x" }}
      onAction={async () => {
        try {
          const plan = adapter.planUninstall();
          const ok = await confirmAlert({
            title: t("action.uninstall"),
            message: [t("setup.uninstallIntro"), ...plan.changes.map((c) => tildify(c.path))].join("\n"),
            primaryAction: { title: t("action.uninstall"), style: Alert.ActionStyle.Destructive },
            dismissAction: { title: t("confirm.cancel") },
          });
          if (!ok) return;
          applyPlan(plan);
          await showToast({ style: Toast.Style.Success, title: t("toast.uninstalled", { name: adapter.name }) });
          onDone();
        } catch (e) {
          await showToast({ style: Toast.Style.Failure, title: t("toast.installFailed"), message: String((e as Error).message ?? e) });
        }
      }}
    />
  );
}
