# Session Manager（agent-inbox）

一个轻量的 Raycast 插件，用来管你自己开的 Claude Code / Codex 会话。它不托管、不派发任务，只做三件事：**看得到、分得清、跳得回**。

> 设计与范围见 [issue #1](https://github.com/0xFANGO/agent-inbox/issues/1)。

## 命令

| 命令 | 作用 | 快捷键 |
|---|---|---|
| **收件箱** | 只看该处理的会话：等我输入 / 运行中 / 已完成。等输入永远置顶（不看是否订阅，未订阅的灰显）；其余只显示订阅的 | ↵ 跳回 · ⌘D 已处理 · ⌘S 订阅/取消订阅 · ⌘I 详情 · ⌘⇧D 归档已完成 |
| **全部会话** | 找到任意会话并订阅。两段：工作中 / 已结束（含扫描到的历史会话）。可搜标题、项目、最后一句 | ↵ 跳回 · ⌘S 订阅 |
| **订阅当前会话** | 没有界面，订阅前台窗口里的会话，用 HUD 提示结果 | 建议在 Raycast 里绑定 ⌃⌥S |
| **菜单栏** | 一直显示有几个订阅的会话在等你输入，有的话铃铛变橙；下拉列出等输入和运行中的会话 | — |
| **接入 Agent** | 写入 Claude Code / Codex 的 hooks。**写入前先展示具体内容，确认后才写**，原文件备份为 `*.agent-inbox.bak` | ↵ 接入 · ⌃X 移除 |

### 偏好设置

- **语言 / Language**：中文（默认）或 English。界面和系统通知都会切换。
- **恢复会话用的终端**：原窗口已经关掉时，在 Terminal / iTerm2 / Ghostty 里执行 `claude --resume <id>` 或 `codex resume <id>`。

## 状态与订阅

- 分区就是状态，列表行里没有状态文字，只有状态灯：运行中蓝色，等输入橙色，已完成不亮。
- **订阅**：会话进入收件箱，等输入时弹通知，计入菜单栏数字。**取消订阅**：离开收件箱，不再通知，但正在等输入的仍会灰显在顶部。
- **已处理（⌘D）**：会话离开收件箱，在「全部会话」里还能搜到；状态再变化时会自动回到收件箱。
- 只有「等输入」会弹系统通知；「完成」不打扰，只改菜单栏数字。
- 「需要注意」包括：等输入、等授权、失败、额度用完。另外，回合结束时如果最后一句是问句（`?` / `？`），也算等输入。

## 跳回

| 来源 | 跳回方式 | 兜底 |
|---|---|---|
| Claude 桌面端 | `claude://code/continue?session=<id>` | 打开 Claude 桌面端 |
| Claude CLI | 聚焦 tmux pane，或 Terminal / iTerm2 里对应的标签页（按 tty 匹配）；Ghostty 等终端只能激活应用 | 新开终端执行 `claude --resume <id>` |
| Codex CLI | 同上 | 新开终端执行 `codex resume <id>` |
| Codex 桌面端 | `codex://threads/<threadId>`（有 `hostId` 时一并带上） | `codex://launch` 并把 ID 复制到剪贴板 |

点通知会打开 `raycast://…/inbox?context=…`，Raycast 先弹窗确认（↵ 跳回，esc 取消）。在收件箱里按 ↵ 直接跳，不弹确认。点通知跳回需要先装 `terminal-notifier`（`brew install terminal-notifier`），没装的话通知只能看、不能点。

## 架构

```
adapters（采集）   →   核心（SQLite + CLI）   →   视图（Raycast）
Claude hooks             ~/.sessions/db.sqlite        只读数据库
Codex notify/hooks       ~/.sessions/bin/agent-inbox.mjs   写操作只有订阅 / 已处理
```

- **adapter**（`src/core/adapters/`）：每个 agent 一份，声明四件事：检测、装 hook、定位会话（把 hook 数据转成统一事件）、跳回。接入面板就是从 adapter 列表生成的。
  - Claude Code：在 `~/.claude/settings.json` 里注册 `SessionStart / UserPromptSubmit / PostToolUse / Notification / Stop / SessionEnd`。
  - Codex：在 `~/.codex/config.toml` 的 `notify` 里接管回合结束事件。如果原来已经配了 notify 程序，会用 `--then` 继续调用它，不会顶掉。另外在 `~/.codex/hooks.json` 里加 `SessionStart / UserPromptSubmit`，用来显示「运行中」，首次需要在 Codex 里运行 `/hooks` 确认。
  - 自定义：在 `~/.sessions/adapters/<id>.json` 里放一个清单（写明跳回 URL 或 resume 命令），事件用 `agent-inbox event …` 上报，格式见该目录下的 README。
- **核心**：用 macOS 自带的 `/usr/bin/sqlite3`，没有原生依赖，也不需要常驻进程。hook 在事件发生时写库并发通知，不轮询。统一事件格式包含：agent、session_id、cwd、事件类型、一句摘要、定位符（tty / tmux pane / 终端 bundle id）。
- **历史会话**：不导入。打开「全部会话」时扫描 `~/.claude/projects` 和 `~/.codex/sessions`，和 hook 库合并显示，解析结果只按文件修改时间缓存在 `~/.sessions/cache`。
- **语言**：`src/core/i18n.ts`，中英两份词典，键名由 TypeScript 保证一致。语言设置会同步到 `~/.sessions/config.json`，hook 发通知时用同一种语言。

### CLI

```bash
node ~/.sessions/bin/agent-inbox.mjs list
node ~/.sessions/bin/agent-inbox.mjs jump claude <session-id>
node ~/.sessions/bin/agent-inbox.mjs event --agent t3code --session <id> --type needs_input --summary "…"
```

hook 出错不会影响 agent 本身：异常写进 `~/.sessions/log.txt`，进程照常以 0 退出。

## 开发

```bash
npm install
npm run dev        # 先打包 CLI 到 assets/agent-inbox.mjs，再 ray develop
npm test           # 状态机、数据库、adapter、历史扫描、CLI 端到端测试
npm run typecheck
npm run lint
```

> `package.json` 里的 `author` 必须是你的 Raycast Store 用户名，否则 `ray lint` 和发布会失败。

## 设计技能

仓库里已经装好 [Impeccable](https://github.com/pbakaus/impeccable) 设计技能（`.claude/skills/impeccable` 给 Claude Code 用，`.agents/skills/impeccable` 给 Codex 用），可以用 `/impeccable critique …`、`/impeccable polish …` 等命令。
