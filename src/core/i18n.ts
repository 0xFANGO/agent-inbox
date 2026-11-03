import { Language } from "./types";

const zh = {
  // sections
  "section.needsInput": "等我输入",
  "section.running": "运行中",
  "section.done": "已完成",
  "section.working": "工作中",
  "section.ended": "已结束",
  "section.agents": "Agent",
  "section.dataAndAlerts": "数据与提醒",

  // nav titles
  "nav.inbox": "收件箱",
  "nav.all": "全部会话",
  "nav.setup": "接入",
  "search.placeholder": "搜索",
  "search.allPlaceholder": "搜标题、项目、最后一句",

  // actions
  "action.jump": "跳回",
  "action.handled": "已处理",
  "action.unhandled": "移回收件箱",
  "action.subscribe": "订阅",
  "action.unsubscribe": "取消订阅",
  "action.detail": "详情",
  "action.hideDetail": "收起详情",
  "action.archiveDone": "归档已完成",
  "action.openInbox": "打开收件箱",
  "action.openSetup": "接入 Agent",
  "action.install": "接入",
  "action.write": "写入",
  "action.uninstall": "移除 hooks",
  "action.openFolder": "打开目录",
  "action.toggleOn": "打开",
  "action.toggleOff": "关闭",
  "action.copyInstall": "复制安装命令",
  "action.refresh": "刷新",

  // hosts & agents
  "host.app": "桌面端",
  "host.cli": "CLI",
  "agent.claude": "Claude",
  "agent.codex": "Codex",

  // detail metadata
  "meta.agent": "Agent",
  "meta.project": "项目",
  "meta.started": "开始",
  "meta.activity": "最近活动",
  "meta.noSummary": "还没有消息",

  // attention
  "attention.input": "等你输入",
  "attention.question": "等你回答",
  "attention.permission": "等你授权",
  "attention.failed": "失败了",
  "attention.quota": "额度用完",

  // time
  "time.justNow": "刚刚",
  "time.minutes": "{n} 分钟前",
  "time.hours": "{n} 小时前",
  "time.yesterday": "昨天",
  "time.days": "{n} 天前",
  "time.since": "{t} 起",
  "time.today": "今天 {t}",

  // empty states
  "empty.inbox.title": "没有要处理的会话",
  "empty.inbox.desc": "订阅的会话等你输入时会出现在这里",
  "empty.onboard.title": "还没接入任何 Agent",
  "empty.onboard.desc": "接入 Claude Code 或 Codex 后，会话会自动出现在这里",
  "empty.all.title": "没有找到会话",
  "empty.all.desc": "~/.claude/projects 和 ~/.codex/sessions 里没有会话记录",
  "empty.menu": "没有等你输入的会话",

  // toasts / hud
  "hud.subscribed": "已订阅 · {title}",
  "hud.unsubscribed": "已取消订阅 · {title}",
  "hud.handled": "已处理 · {title}",
  "hud.archived": "已归档 {n} 个已完成会话",
  "hud.notFound": "没认出前台窗口对应的会话",
  "hud.alreadySubscribed": "已在订阅中 · {title}",
  "toast.jumpFailed": "跳回失败",
  "toast.copiedId": "已复制会话 ID，请在 App 里粘贴打开",
  "toast.resumed": "已在新终端恢复会话",
  "toast.installed": "已写入 {name} 的 hooks",
  "toast.uninstalled": "已移除 {name} 的 hooks",
  "toast.installFailed": "写入失败",
  "toast.error": "出错了",

  // confirm
  "confirm.jumpTitle": "跳回 {target}？",
  "confirm.cancel": "取消",

  // setup
  "setup.ready": "就绪",
  "setup.install": "安装",
  "setup.notFound": "未检测到",
  "setup.on": "开",
  "setup.off": "关",
  "setup.fallback": "兜底",
  "setup.claudeHosts": "CLI · 桌面端",
  "setup.codexHosts": "CLI · 桌面端（会话深链）",
  "setup.addAgent": "添加 Agent",
  "setup.notifications": "系统通知",
  "setup.notificationsSub": "仅等输入时",
  "setup.clickToJump": "点通知跳回",
  "setup.clickToJumpReady": "terminal-notifier",
  "setup.clickToJumpMissing": "未安装 terminal-notifier，通知无法点击跳回",
  "setup.history": "历史会话",
  "setup.historySub": "打开「全部会话」时扫描，不导入",
  "setup.previewTitle": "将要写入的内容",
  "setup.previewIntro": "确认后才会写入。原文件会备份为 `*.agent-inbox.bak`。",
  "setup.uninstallIntro": "将移除本插件写入的条目，其余配置保持不变。",
  "setup.nodeMissing": "没找到 node，hook 需要 Node.js 才能运行。",
  "setup.codexHooksNote": "Codex 首次加载新 hook 时，需要在 Codex 里运行 /hooks 确认。",
  "setup.customAdapter": "自定义 adapter",

  // notifications (hook CLI)
  "notify.waiting": "等你输入",
} as const;

export type MessageKey = keyof typeof zh;

const en: Record<MessageKey, string> = {
  "section.needsInput": "Waiting for You",
  "section.running": "Running",
  "section.done": "Completed",
  "section.working": "Active",
  "section.ended": "Ended",
  "section.agents": "Agents",
  "section.dataAndAlerts": "Data & Alerts",

  "nav.inbox": "Inbox",
  "nav.all": "All Sessions",
  "nav.setup": "Setup",
  "search.placeholder": "Search",
  "search.allPlaceholder": "Search titles, projects, last messages",

  "action.jump": "Jump Back",
  "action.handled": "Mark as Handled",
  "action.unhandled": "Move Back to Inbox",
  "action.subscribe": "Subscribe",
  "action.unsubscribe": "Unsubscribe",
  "action.detail": "Show Details",
  "action.hideDetail": "Hide Details",
  "action.archiveDone": "Archive Completed",
  "action.openInbox": "Open Inbox",
  "action.openSetup": "Connect an Agent",
  "action.install": "Connect",
  "action.write": "Write",
  "action.uninstall": "Remove Hooks",
  "action.openFolder": "Open Folder",
  "action.toggleOn": "Turn On",
  "action.toggleOff": "Turn Off",
  "action.copyInstall": "Copy Install Command",
  "action.refresh": "Refresh",

  "host.app": "Desktop",
  "host.cli": "CLI",
  "agent.claude": "Claude",
  "agent.codex": "Codex",

  "meta.agent": "Agent",
  "meta.project": "Project",
  "meta.started": "Started",
  "meta.activity": "Last Activity",
  "meta.noSummary": "No messages yet",

  "attention.input": "Waiting for input",
  "attention.question": "Asked you a question",
  "attention.permission": "Needs permission",
  "attention.failed": "Failed",
  "attention.quota": "Out of quota",

  "time.justNow": "just now",
  "time.minutes": "{n} min ago",
  "time.hours": "{n} h ago",
  "time.yesterday": "yesterday",
  "time.days": "{n} d ago",
  "time.since": "since {t}",
  "time.today": "today {t}",

  "empty.inbox.title": "Nothing needs you",
  "empty.inbox.desc": "Subscribed sessions show up here when they wait for you",
  "empty.onboard.title": "No agent connected yet",
  "empty.onboard.desc": "Connect Claude Code or Codex and sessions will show up here",
  "empty.all.title": "No sessions found",
  "empty.all.desc": "Nothing in ~/.claude/projects or ~/.codex/sessions",
  "empty.menu": "Nothing is waiting for you",

  "hud.subscribed": "Subscribed · {title}",
  "hud.unsubscribed": "Unsubscribed · {title}",
  "hud.handled": "Handled · {title}",
  "hud.archived": "Archived {n} completed sessions",
  "hud.notFound": "Couldn't match the front window to a session",
  "hud.alreadySubscribed": "Already subscribed · {title}",
  "toast.jumpFailed": "Couldn't jump back",
  "toast.copiedId": "Session ID copied — paste it in the app",
  "toast.resumed": "Resumed in a new terminal",
  "toast.installed": "Hooks written for {name}",
  "toast.uninstalled": "Hooks removed for {name}",
  "toast.installFailed": "Couldn't write the files",
  "toast.error": "Something went wrong",

  "confirm.jumpTitle": "Jump back to {target}?",
  "confirm.cancel": "Cancel",

  "setup.ready": "Ready",
  "setup.install": "Install",
  "setup.notFound": "Not found",
  "setup.on": "On",
  "setup.off": "Off",
  "setup.fallback": "Fallback",
  "setup.claudeHosts": "CLI · Desktop",
  "setup.codexHosts": "CLI · Desktop (thread links)",
  "setup.addAgent": "Add Agent",
  "setup.notifications": "System Notifications",
  "setup.notificationsSub": "Only when waiting for input",
  "setup.clickToJump": "Click to Jump Back",
  "setup.clickToJumpReady": "terminal-notifier",
  "setup.clickToJumpMissing": "terminal-notifier is missing, notifications can't jump back",
  "setup.history": "Past Sessions",
  "setup.historySub": "Scanned when All Sessions opens, never imported",
  "setup.previewTitle": "What will be written",
  "setup.previewIntro": "Nothing is written until you confirm. Originals are backed up as `*.agent-inbox.bak`.",
  "setup.uninstallIntro": "Only the entries written by this extension are removed.",
  "setup.nodeMissing": "Node.js was not found. Hooks need it to run.",
  "setup.codexHooksNote": "Codex asks you to approve new hooks once: run /hooks inside Codex.",
  "setup.customAdapter": "Custom adapter",

  "notify.waiting": "Waiting for you",
};

const dictionaries: Record<Language, Record<MessageKey, string>> = { zh, en };

export type Translator = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function translator(lang: Language): Translator {
  const dict = dictionaries[lang] ?? zh;
  return (key, vars) => {
    let s = dict[key] ?? zh[key] ?? key;
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(String(v));
    return s;
  };
}

export function normalizeLanguage(v: unknown): Language {
  return v === "en" ? "en" : "zh";
}
