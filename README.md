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
- **恢复会话用的终端**：在「接入 Agent → 恢复 CLI 会话的终端」中按 ↵ 打开扩展设置，可选 Terminal / iTerm2 / Ghostty。优先跳回原会话所在的窗口；无法定位原窗口时，才在所选终端执行 `claude --resume <id>` 或 `codex resume <id>`。

## 状态与订阅

- 分区就是状态，列表行里没有状态文字，只有状态灯：运行中蓝色，等输入橙色，已完成不亮。
- **订阅**：会话进入收件箱，等输入时弹通知，计入菜单栏数字。**取消订阅**：离开收件箱，不再通知，但正在等输入的仍会灰显在顶部。
- **已处理（⌘D）**：会话离开收件箱，在「全部会话」里还能搜到；状态再变化时会自动回到收件箱。
- 只有「等输入」会弹系统通知；「完成」不打扰，只改菜单栏数字。
- 「需要注意」包括：等输入、等授权、失败、额度用完。另外，回合结束时如果最后一句是问句（`?` / `？`），也算等输入。

### 订阅当前会话

建议用热键从目标窗口触发。插件先记录前台窗口，再读取会话，按以下信息匹配：

- **Claude / Codex 桌面端**：优先通过原生 Accessibility 读取前台窗口文档 URL 中的会话 ID。URL 不能标识会话时使用当前文档的唯一标题；原生读取失败时才降级到 System Events。只有唯一匹配才订阅；Claude 的标题匹配仅接受以 `- Claude Code` 结尾的页面。普通 Claude 聊天、主页、标题有歧义或缺少窗口信息时，不会按最近活动时间猜一个会话。
- **Terminal / iTerm2 / Ghostty 1.4**：读取选中标签页或焦点分屏的 tty。tmux 会同时匹配前台客户端 tty、服务器 socket 和 pane，避免订阅后台的其他会话。没有可靠 tty 或出现多个匹配时会提示无法识别。

Claude 的本地 metadata 还用于把 `bridgeSessionIds` 关联到 `local_*` 和 CLI 会话 ID；兼容旧版字符串与新版数组，`session_*` / `cse_*` 的同后缀 ID 按同一映射处理。多个本地记录指向同一 ID 时拒绝匹配。纯云端页面的 `session_*` ID 也能读取，但没有对应本地记录时，不能自动匹配到 Hook 会话或获得实时通知，也不会直接订阅未知云端会话。

CLI 的「订阅当前会话」需要先接入 Hook，并由 Hook 采集原会话的 tty / tmux 定位信息。仅扫描到的历史文件通常不含这些信息，可在「全部会话」中手动选择并订阅。

本机已切换 Claude 本地与云端会话，只读验证原生 `AXURL` + `CFURLGetString` 能取得当前 `local_*` 和 `session_*` ID；Codex 的前台会话匹配也已实测。旧 System Events 对同一 Claude 窗口读取 URL 时返回「AppleEvent 处理程序失败」，被吞掉的异常曾导致空 URL。窗口信息和终端 tty 查询依赖 macOS 自动化/辅助功能权限；不支持相关接口或权限不足时，可以在「全部会话」中手动选择并订阅。

## 跳回

| 来源 | 跳回方式 | 兜底 |
|---|---|---|
| Claude 桌面端 | 将 CLI transcript ID 映射到桌面端 `local_*` ID，再打开 `claude://code/continue?session=<local_id>` | 打开 Claude 并复制会话 ID，提示需要手动定位 |
| Claude CLI | 聚焦 tmux pane，或按 tty 匹配 Terminal / iTerm2 标签页、Ghostty 1.4 的终端分屏；旧版或不支持脚本的终端只能激活应用 | 在所选终端执行 `claude --resume <id>` |
| Codex CLI | 同上 | 新开终端执行 `codex resume <id>` |
| Codex 桌面端 | `codex://threads/<threadId>`（有 `hostId` 时一并带上） | `codex://launch` 并把 ID 复制到剪贴板 |

Claude 桌面端的 `local_*` ID 和 CLI transcript UUID 不同，不能直接把 CLI UUID 放进桌面端的 continue 链接。本机已验证映射后能跳回对应的 Claude Code 对话。仅激活应用或复制 ID 是兜底行为，不代表已精确到达目标会话。

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
- **会话来源**：Claude Hook 优先使用明确的 `CLAUDE_CODE_ENTRYPOINT` 和 transcript 中的来源信息，并通过桌面端本地会话 metadata 关联 `cliSessionId` 与 `local_*` ID，修正历史记录被误判为 CLI 的情况。明确在终端中恢复的会话仍按 CLI 处理。
- **历史会话**：不导入。打开「全部会话」时扫描 `~/.claude/projects`、`~/.codex/sessions` 和 Claude 桌面端本地会话 metadata，和 hook 库合并显示。transcript 解析结果按文件修改时间与大小缓存在 `~/.sessions/cache`，桌面端 metadata 也按文件变化更新。没有本地记录的云端会话不会自动被发现。
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
npm test           # 先重新打包 CLI，再运行状态机、数据库、adapter、历史扫描、安装与 CLI 端到端测试
npm run typecheck
npm run lint:code  # ESLint + 源码和测试的格式检查，不访问 Raycast Store
npm run check      # 一次运行测试、类型检查、代码检查和 Raycast 构建
npm run lint       # 额外校验 Raycast 清单、作者账号和图标，需要联网
```

> `package.json` 里的 `author` 必须是你的 Raycast Store 用户名，否则 `ray lint` 和发布会失败。

测试使用临时数据库和配置文件，并在结束后清理；不会接入或移除你实际使用的 Agent hooks。CLI 测试覆盖异常输入、数据库失败和原有 Codex notify 命令转发。`npm run check` 只做本地检查，不发布到 Store。

自动化测试不包含 Raycast 原生界面、macOS 系统通知和终端跳转的交互验收。开发安装后需在 Raycast 中检查：收件箱分组、订阅与已处理操作、菜单栏计数、接入预览，以及通知点击和各终端的跳回行为。

本轮验证结果与待验收范围见 [测试记录](TESTING.md)。

## 设计技能

仓库里已经装好 [Impeccable](https://github.com/pbakaus/impeccable) 设计技能（`.claude/skills/impeccable` 给 Claude Code 用，`.agents/skills/impeccable` 给 Codex 用），可以用 `/impeccable critique …`、`/impeccable polish …` 等命令。
