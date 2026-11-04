import { Language } from "./types";

const zh = {
  // sections
  "section.needsInput": "待输入",
  "section.running": "运行中",
  "section.done": "已完成",
  "section.subscribed": "已订阅",
  "section.general": "通用",
  "section.agents": "Agent",
  "section.dataAndAlerts": "显示与提醒",

  // nav titles
  "nav.inbox": "订阅列表",
  "nav.all": "全部会话",
  "nav.setup": "接入 Agent",
  "nav.settings": "设置",
  "nav.menuBar": "Agent Inbox · 订阅会话",
  "filter.title": "筛选会话",
  "search.settingsPlaceholder": "搜索设置",
  "search.placeholder": "搜索",
  "search.allPlaceholder": "搜索标题、会话内容",
  "search.titlesPlaceholder": "搜索会话标题、项目",
  "search.enable": "启用会话全文搜索",
  "search.enableTitle": "加载全部本地会话内容？",
  "search.enableDescription":
    "将读取全部本地会话的用户与 Agent 消息，并在本机建立搜索索引，不上传内容。首次加载会占用时间和磁盘空间，后续只更新有变化的记录。可随时在设置中关闭。",
  "search.disabledDescription": "确认后才加载全部对话；当前仅搜索标题、项目和会话 ID",
  "settings.contentSearch": "会话全文搜索",
  "settings.contentSearchSub": "检索本地会话的完整对话内容",
  "search.indexing": "正在索引会话内容 {n}/{total}",
  "search.indexingDesc": "标题搜索可立即使用，内容搜索会随索引完成而补全",
  "search.indexFailed": "部分会话内容未能索引",
  "search.indexFailedDesc": "{n} 个记录无法读取；仍可搜标题，按 ⌘R 重试",
  "search.contentMatch": "命中会话内容",

  // actions
  "action.jump": "跳转",
  "action.handled": "已处理",
  "action.unhandled": "移回订阅列表",
  "action.subscribe": "订阅",
  "action.subscribeCurrent": "订阅当前窗口对话",
  "subscribe.currentSub": "识别前台窗口中的 Agent 会话",
  "action.openAll": "浏览全部会话",
  "action.unsubscribe": "取消订阅",
  "action.detail": "详情",
  "action.hideDetail": "收起详情",
  "action.archiveDone": "归档已完成",
  "action.openInbox": "打开订阅列表",
  "action.openSetup": "接入 Agent",
  "action.install": "接入",
  "action.reinstall": "重新接入",
  "action.uninstall": "移除 hooks",
  "action.openFolder": "打开目录",
  "action.toggleOn": "打开",
  "action.toggleOff": "关闭",
  "action.refresh": "刷新",
  "action.preferences": "打开扩展设置",

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
  "empty.inbox.title": "没有已订阅的会话",
  "empty.inbox.desc": "在「全部会话」中订阅，随时查看进展或跳转回对话",
  "empty.onboard.title": "还没接入任何 Agent",
  "empty.onboard.desc": "在设置中接入 Claude Code 或 Codex，再选择会话订阅",
  "empty.all.title": "没有找到会话",
  "empty.all.desc": "~/.claude/projects 和 ~/.codex/sessions 里没有会话记录",
  "empty.menu": "没有已订阅的会话",
  "empty.filter.desc": "试试其他分类或搜索词",

  // toasts / hud
  "hud.subscribed": "已订阅 · {title}",
  "hud.unsubscribed": "已取消订阅 · {title}",
  "hud.handled": "已处理 · {title}",
  "hud.archived": "已归档 {n} 个已完成会话",
  "hud.notFound": "无法确定当前会话，请到「全部会话」选择并订阅",
  "hud.focusPermission": "无法读取当前窗口，请检查 Raycast 的辅助功能与自动化权限",
  "hud.alreadySubscribed": "已在订阅中 · {title}",
  "toast.jumpFailed": "跳回失败",
  "toast.copiedId": "已复制会话 ID，请在 App 里粘贴打开",
  "toast.resumed": "已在新终端恢复会话",
  "toast.installing": "正在接入 {name}",
  "toast.installed": "{name} 接入成功",
  "toast.uninstalled": "已移除 {name} 的 hooks",
  "toast.installFailed": "接入失败",
  "toast.uninstallFailed": "移除失败",
  "toast.menuBarFailed": "无法更新菜单栏显示",
  "toast.error": "出错了",

  // confirm
  "confirm.jumpTitle": "跳回 {target}？",
  "confirm.cancel": "取消",

  // settings
  "settings.agentsSub": "Claude Code 与 Codex",
  "settings.menuBar": "在菜单栏显示订阅会话",
  "settings.menuBarSub": "快速查看订阅列表和待输入数量",
  "settings.menuBarUnavailable": "请在扩展设置中启用「刷新菜单栏」后重试",
  "settings.language": "语言 / Language",
  "settings.languageSub": "界面和系统通知使用的语言",

  // setup
  "setup.ready": "就绪",
  "setup.install": "未接入",
  "setup.installing": "接入中",
  "setup.installNotDetected": "未能确认接入状态，请重试",
  "setup.notFound": "未检测到",
  "setup.on": "开",
  "setup.off": "关",
  "setup.claudeHosts": "CLI · 桌面端",
  "setup.codexHosts": "CLI · 桌面端",
  "setup.notifications": "系统通知",
  "setup.notificationsSub": "仅已订阅的会话待输入时提醒",
  "setup.resumeTerminal": "默认终端",
  "setup.resumeTerminalSub": "无法定位原窗口时，用于恢复会话",
  "setup.history": "历史会话",
  "setup.historySub": "打开「全部会话」时扫描，不导入",
  "setup.uninstallIntro": "将移除本插件写入的条目，其余配置保持不变。",
  "setup.nodeMissing": "没找到 node，hook 需要 Node.js 才能运行。",
  "setup.codexHooksNote": "Codex 首次加载新 hook 时，需要在 Codex 里运行 /hooks 确认。",

  // notifications (hook CLI)
  "notify.waiting": "等你输入",
} as const;

export type MessageKey = keyof typeof zh;

const en: Record<MessageKey, string> = {
  "section.needsInput": "Waiting for You",
  "section.running": "Running",
  "section.done": "Completed",
  "section.subscribed": "Subscribed",
  "section.general": "General",
  "section.agents": "Agents",
  "section.dataAndAlerts": "Display & Alerts",

  "nav.inbox": "Subscriptions",
  "nav.all": "All Sessions",
  "nav.setup": "Connect an Agent",
  "nav.settings": "Settings",
  "nav.menuBar": "Agent Inbox · Subscribed Sessions",
  "filter.title": "Filter Sessions",
  "search.settingsPlaceholder": "Search settings",
  "search.placeholder": "Search",
  "search.allPlaceholder": "Search titles and conversation content",
  "search.titlesPlaceholder": "Search conversation titles and projects",
  "search.enable": "Enable Full-Text Search",
  "search.enableTitle": "Load All Local Conversations?",
  "search.enableDescription":
    "Read user and agent messages from all local conversations and build a search index on this Mac. Nothing is uploaded. The initial load takes time and disk space; later refreshes only process changed files. You can turn this off in Settings.",
  "search.disabledDescription": "Content loads only after confirmation. Currently searching titles, projects, and session IDs",
  "settings.contentSearch": "Full-Text Session Search",
  "settings.contentSearchSub": "Search the complete dialogue in local sessions",
  "search.indexing": "Indexing conversation content {n}/{total}",
  "search.indexingDesc": "Titles are searchable now; content results fill in as indexing completes",
  "search.indexFailed": "Some conversations could not be indexed",
  "search.indexFailedDesc": "{n} transcripts could not be read; title search is available. Press ⌘R to retry",
  "search.contentMatch": "Conversation content match",

  "action.jump": "Jump to Session",
  "action.handled": "Mark as Handled",
  "action.unhandled": "Move Back to Subscriptions",
  "action.subscribe": "Subscribe",
  "action.subscribeCurrent": "Subscribe to Current Conversation",
  "subscribe.currentSub": "Find the Agent session in the front window",
  "action.openAll": "Browse All Sessions",
  "action.unsubscribe": "Unsubscribe",
  "action.detail": "Show Details",
  "action.hideDetail": "Hide Details",
  "action.archiveDone": "Archive Completed",
  "action.openInbox": "Open Subscriptions",
  "action.openSetup": "Connect an Agent",
  "action.install": "Connect",
  "action.reinstall": "Reconnect",
  "action.uninstall": "Remove Hooks",
  "action.openFolder": "Open Folder",
  "action.toggleOn": "Turn On",
  "action.toggleOff": "Turn Off",
  "action.refresh": "Refresh",
  "action.preferences": "Open Extension Preferences",

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

  "empty.inbox.title": "No subscribed sessions",
  "empty.inbox.desc": "Subscribe in All Sessions to follow progress and jump back",
  "empty.onboard.title": "No agent connected yet",
  "empty.onboard.desc": "Connect Claude Code or Codex in Settings, then subscribe to a session",
  "empty.all.title": "No sessions found",
  "empty.all.desc": "Nothing in ~/.claude/projects or ~/.codex/sessions",
  "empty.menu": "No subscribed sessions",
  "empty.filter.desc": "Try another filter or search term",

  "hud.subscribed": "Subscribed · {title}",
  "hud.unsubscribed": "Unsubscribed · {title}",
  "hud.handled": "Handled · {title}",
  "hud.archived": "Archived {n} completed sessions",
  "hud.notFound": "Couldn't identify the current session; select it in All Sessions",
  "hud.focusPermission": "Can't read the window; check Raycast's Accessibility and Automation permissions",
  "hud.alreadySubscribed": "Already subscribed · {title}",
  "toast.jumpFailed": "Couldn't jump back",
  "toast.copiedId": "Session ID copied — paste it in the app",
  "toast.resumed": "Resumed in a new terminal",
  "toast.installing": "Connecting {name}",
  "toast.installed": "{name} connected",
  "toast.uninstalled": "Hooks removed for {name}",
  "toast.installFailed": "Connection failed",
  "toast.uninstallFailed": "Removal failed",
  "toast.menuBarFailed": "Couldn't update menu bar visibility",
  "toast.error": "Something went wrong",

  "confirm.jumpTitle": "Jump back to {target}?",
  "confirm.cancel": "Cancel",

  "settings.agentsSub": "Claude Code and Codex",
  "settings.menuBar": "Show Subscribed Sessions in Menu Bar",
  "settings.menuBarSub": "Quick access to subscriptions and the waiting count",
  "settings.menuBarUnavailable": "Enable Refresh Menu Bar in extension preferences, then try again",
  "settings.language": "Language / 语言",
  "settings.languageSub": "Language for the interface and system notifications",

  "setup.ready": "Ready",
  "setup.install": "Not Connected",
  "setup.installing": "Connecting",
  "setup.installNotDetected": "Connection could not be verified. Try again.",
  "setup.notFound": "Not found",
  "setup.on": "On",
  "setup.off": "Off",
  "setup.claudeHosts": "CLI · Desktop",
  "setup.codexHosts": "CLI · Desktop",
  "setup.notifications": "System Notifications",
  "setup.notificationsSub": "Only subscribed sessions waiting for input",
  "setup.resumeTerminal": "Default Terminal",
  "setup.resumeTerminalSub": "Used to resume a session when its original window is unavailable",
  "setup.history": "Past Sessions",
  "setup.historySub": "Scanned when All Sessions opens, never imported",
  "setup.uninstallIntro": "Only the entries written by this extension are removed.",
  "setup.nodeMissing": "Node.js was not found. Hooks need it to run.",
  "setup.codexHooksNote": "Codex asks you to approve new hooks once: run /hooks inside Codex.",

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
