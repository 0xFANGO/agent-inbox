import { Action, ActionPanel, Color, Icon, Keyboard, List, showHUD } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState } from "react";
import { hostTag, rowTime } from "./core/format";
import { scanHistory } from "./core/history";
import { Translator } from "./core/i18n";
import { projectName } from "./core/paths";
import { mergeSessions } from "./core/merge";
import { Config, Session } from "./core/types";
import { agentIcon, statusDot } from "./components/icons";
import { SessionDetail } from "./components/SessionDetail";
import { locale } from "./lib/env";
import { jumpBack, store } from "./lib/sessions";

const key = (s: { agent: string; sessionId: string }) => `${s.agent}:${s.sessionId}`;

export default function AllSessions() {
  const { t, config } = locale();
  const [showDetail, setShowDetail] = useState(false);
  const { data, isLoading, mutate } = useCachedPromise(
    async () => {
      const [rows, history] = await Promise.all([store.all(1000), Promise.resolve().then(() => scanHistory({ limit: 400 }))]);
      return mergeSessions(rows, history);
    },
    [],
    { keepPreviousData: true },
  );

  const sessions = data ?? [];
  const working = sessions.filter((s) => s.status === "running" || s.status === "needs_input");
  const ended = sessions.filter((s) => s.status !== "running" && s.status !== "needs_input");

  async function toggle(s: Session) {
    const next = !s.subscribed;
    await mutate(next ? store.subscribeEntry(s) : store.setSubscribed(s.agent, s.sessionId, false), {
      optimisticUpdate: (list) => (list ?? []).map((x) => (key(x) === key(s) ? { ...x, subscribed: next } : x)),
      shouldRevalidateAfter: false,
    });
    await showHUD(t(next ? "hud.subscribed" : "hud.unsubscribed", { title: s.title || s.sessionId }));
  }

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail && sessions.length > 0}
      navigationTitle={t("nav.all")}
      searchBarPlaceholder={t("search.allPlaceholder")}
    >
      <List.EmptyView icon={Icon.MagnifyingGlass} title={t("empty.all.title")} description={t("empty.all.desc")} />
      <List.Section title={t("section.working")}>
        {working.map((s) => (
          <Row
            key={key(s)}
            s={s}
            t={t}
            config={config}
            showDetail={showDetail}
            onToggleDetail={() => setShowDetail((v) => !v)}
            onToggle={() => toggle(s)}
          />
        ))}
      </List.Section>
      <List.Section title={t("section.ended")}>
        {ended.map((s) => (
          <Row
            key={key(s)}
            s={s}
            t={t}
            config={config}
            showDetail={showDetail}
            onToggleDetail={() => setShowDetail((v) => !v)}
            onToggle={() => toggle(s)}
          />
        ))}
      </List.Section>
    </List>
  );
}

function Row(props: { s: Session; t: Translator; config: Config; showDetail: boolean; onToggle: () => void; onToggleDetail: () => void }) {
  const { s, t, config, showDetail } = props;
  const project = projectName(s.cwd);
  const accessories: List.Item.Accessory[] = [];
  if (s.subscribed) accessories.push({ icon: { source: Icon.Bell, tintColor: Color.Yellow }, tooltip: t("action.subscribe") });
  const dot = statusDot(s);
  if (dot) accessories.push({ icon: dot });
  if (!showDetail) accessories.push({ text: rowTime(s, t) });
  const subtitle = [hostTag(s.host), project, s.summary].filter(Boolean).join(" · ");

  return (
    <List.Item
      icon={agentIcon(s.agent)}
      title={s.title || s.sessionId}
      subtitle={showDetail ? undefined : subtitle}
      keywords={[project, s.summary, s.cwd].filter(Boolean)}
      accessories={accessories}
      detail={<SessionDetail session={s} t={t} />}
      actions={
        <ActionPanel title={s.title}>
          <Action title={t("action.jump")} icon={Icon.ArrowNe} onAction={() => jumpBack(s, config, t)} />
          <Action
            title={s.subscribed ? t("action.unsubscribe") : t("action.subscribe")}
            icon={s.subscribed ? Icon.BellDisabled : Icon.Bell}
            shortcut={Keyboard.Shortcut.Common.Save}
            onAction={props.onToggle}
          />
          <Action
            title={showDetail ? t("action.hideDetail") : t("action.detail")}
            icon={Icon.Sidebar}
            shortcut={{ modifiers: ["cmd"], key: "i" }}
            onAction={props.onToggleDetail}
          />
        </ActionPanel>
      }
    />
  );
}
