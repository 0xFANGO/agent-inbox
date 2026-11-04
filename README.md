# Agent Inbox

一个轻量的 Raycast 插件，用来管你自己开的 Claude Code / Codex 会话。它不托管、不派发任务，只做三件事：**看得到、分得清、跳得回**。

> 设计与范围见 [issue #1](https://github.com/0xFANGO/agent-inbox/issues/1)。

## 命令

| 命令 | 作用 | 快捷键 |
|---|---|---|
| **全部会话** | 默认展示全部会话，顶部筛选「已订阅 / 待输入 / 已完成」。列表首项为「订阅当前窗口对话」 | ↵ 或 ⌘S 订阅/取消订阅 · ⌘↵ 跳转 · ⌘I 详情 · ⌘R 刷新 |
| **订阅列表** | 只显示已订阅且未标记已处理的会话，分为待输入 / 已订阅 / 已完成 | ↵ 跳转 · ⌘D 已处理 · ⌘S 取消订阅 · ⌘I 详情 · ⌘⇧D 归档已完成 |
| **设置** | 集中管理 Agent 接入、语言、内容搜索、菜单栏显示、恢复终端与系统通知 | ↵ 打开所选设置 |
| **刷新菜单栏** | 刷新菜单栏中的订阅会话与待输入计数；显示开关位于设置 | — |

「全部会话」中的「已订阅」与状态筛选可重叠。「订阅列表」按待输入、已订阅、已完成三个互斥分区展示；运行中和状态尚未确认的订阅会话归入「已订阅」，运行状态仍用蓝灯表示。「已完成」只包含明确完成的会话，不再有「其他会话」分区。

Raycast 的原生底栏只常驻一个主操作。会话行默认显示「订阅」，「跳转」可直接按 ⌘↵ 执行；点 Actions（⌘K）会同时看到前两项。订阅后列表保持打开，方便连续处理。

返回上一级可按 Mac 的 **⌫ Delete**：搜索框为空时返回，有内容时先删字；Esc 仍遵循 Raycast 自身设置。接入面板通过原生导航栈返回。

### 搜索

默认只搜索会话标题、项目与会话 ID，**不自动加载或索引完整对话**。需要搜索正文时，点击搜索结果底部的「启用会话内容搜索」，或在设置中开启「会话全文搜索」，确认读取范围与本地索引开销后才开始。取消确认不会启用；关闭设置会中止索引并停止检索内容，已有索引留在本机缓存目录且不会自动更新。

启用后可检索完整的用户与 Agent 消息，支持中文短词、大小写归一和多个关键词；工具输出、思考过程和系统注入内容不纳入正文索引。首次流式读取本机记录，随后仅重新索引修改时间或大小变化的文件。查询使用本地 SQLite 索引，不逐次扫描原文件，也不会上传对话。索引过程中标题搜索仍可用；退出列表、刷新或关闭内容搜索可正常中止读取。

本机样本为 237 个文件、约 1.39 GB 原始记录：首次索引约 4.38 秒、索引约 17.9 MB；热刷新约 44 ms，查询约 3–9 ms，另有 180 ms 输入防抖。冷索引峰值进程内存约 308 MB；不同机器和记录量会有差异。索引位于 `~/.sessions/cache/conversation-search.sqlite`，只有云端而没有本地记录的对话内容不能检索。

### 偏好设置

- **语言 / Language**：在「设置 → 语言 / Language」打开扩展偏好，可选中文（默认）或 English。界面和系统通知都会切换。
- **默认终端**：在「设置 → 默认终端」中按 ↵ 打开扩展设置，可选 Terminal / iTerm2 / Ghostty。优先跳回原会话所在的窗口；无法定位原窗口时，才在所选终端执行 `claude --resume <id>` 或 `codex resume <id>`。

- **接入 Agent**：选择 Claude Code / Codex 并执行接入，直接显示进度与成功／失败结果；原配置备份为 `*.agent-inbox.bak`。Codex 首次仍需在应用内执行 `/hooks` 确认。面板不再提供新增 Adapter 入口。
- **在菜单栏显示订阅会话**：控制菜单栏订阅列表显示。「刷新菜单栏」用于手动更新状态；关闭显示后不加载订阅数据。Raycast 要求菜单栏组件有宿主命令，执行该命令会启动或刷新组件，见 [菜单栏命令生命周期](https://developers.raycast.com/api-reference/menu-bar-commands)。
- **系统通知**：可在设置面板直接开关；仅已订阅会话进入待输入状态时提醒。

## 状态与订阅

- 订阅列表按状态分区；运行中蓝灯，待输入橙灯，已完成和没有实时状态的历史记录不亮。
- **订阅**：会话进入订阅列表，待输入时弹通知并计入菜单栏数字。**取消订阅**：立即离开订阅列表和通知菜单，不再提醒；仍可在全部会话中找到。
- **已处理（⌘D）**：会话暂时离开订阅列表和通知菜单，在「全部会话 → 已订阅」里仍能找到；状态再变化时会自动回来。取消后重新订阅也会恢复显示。归档已完成只影响已订阅会话。
- 只有「等输入」会弹系统通知；「完成」不打扰，只改菜单栏数字。
- 「需要注意」包括：等输入、等授权、失败、额度用完。另外，回合结束时如果最后一句是问句（`?` / `？`），也算等输入。

对于接入 Hook 前就已结束的 Claude 会话，只从 transcript 末尾最多 96 KB 查找明确的 `end_turn`，补齐尚未确定的状态；后续对话或工具活动会使旧结束标记失效。已有运行中、待输入、已完成状态仍以 Hook 为准。恢复结果仅用于显示与操作，不写回 Claude 文件或伪造 Hook 事件，也不启动全文索引。归档已完成同样支持这些历史会话，并跳过已被新 Hook 更新的记录。

### 订阅当前窗口对话

从目标 Agent 窗口唤出 Raycast，打开「全部会话」，执行首项「订阅当前窗口对话」。插件关闭 Raycast 后识别前台窗口，再读取会话，按以下信息匹配：

- **Claude / Codex 桌面端**：优先通过原生 Accessibility 读取前台窗口文档 URL 中的会话 ID。URL 不能标识会话时使用当前文档的唯一标题；原生读取失败时才降级到 System Events。只有唯一匹配才订阅；Claude 的标题匹配仅接受以 `- Claude Code` 结尾的页面。普通 Claude 聊天、主页、标题有歧义或缺少窗口信息时，不会按最近活动时间猜一个会话。
- **Terminal / iTerm2 / Ghostty 1.4**：读取选中标签页或焦点分屏的 tty。tmux 会同时匹配前台客户端 tty、服务器 socket 和 pane，避免订阅后台的其他会话。没有可靠 tty 或出现多个匹配时会提示无法识别。

Codex 额外保留原生窗口标题，避免 Electron 的通用页面标题覆盖实际会话名；支持外部 thread 链接以及本地、独立窗口和 hash 会话路由。按实际表结构读取本地 `state*.sqlite` 的会话名称，不固定数据库版本；不支持时退到 `session_index.jsonl`。实际窗口匹配成功后才纠正旧记录的 CLI/App 来源，同时保留 Hook 的实时状态。关闭 Raycast 后会短暂等待焦点恢复，不按最近活动时间猜测。

Claude 的本地 metadata 还用于把 `bridgeSessionIds` 关联到 `local_*` 和 CLI 会话 ID；兼容旧版字符串与新版数组，`session_*` / `cse_*` 的同后缀 ID 按同一映射处理。多个本地记录指向同一 ID 时拒绝匹配。纯云端页面的 `session_*` ID 也能读取，但没有对应本地记录时，不能自动匹配到 Hook 会话或获得实时通知，也不会直接订阅未知云端会话。

CLI 的「订阅当前窗口对话」需要先接入 Hook，并由 Hook 采集原会话的 tty / tmux 定位信息。仅扫描到的历史文件通常不含这些信息，可在「全部会话」中手动选择并订阅。

之前已切换 Claude 本地与云端会话，只读验证原生 `AXURL` + `CFURLGetString` 能取得当前 `local_*` 和 `session_*` ID。旧 System Events 对同一 Claude 窗口读取 URL 时返回「AppleEvent 处理程序失败」，被吞掉的异常曾导致空 URL。本轮 Codex 修复依据安装包静态证据、本地目录和回归测试；客户端禁止直接操作 Codex 自身窗口，尚未完成当前版本的实机订阅／跳转验收，见 [Codex 调查记录](docs/codex-session-investigation.md)。窗口信息和终端 tty 查询依赖 macOS 自动化/辅助功能权限；不支持相关接口或权限不足时，可以在「全部会话」中手动选择并订阅。

## 跳回

| 来源 | 跳回方式 | 兜底 |
|---|---|---|
| Claude 桌面端 | 将 CLI transcript ID 映射到桌面端 `local_*` ID，再打开 `claude://code/continue?session=<local_id>` | 打开 Claude 并复制会话 ID，提示需要手动定位 |
| Claude CLI | 聚焦 tmux pane，或按 tty 匹配 Terminal / iTerm2 标签页、Ghostty 1.4 的终端分屏；旧版或不支持脚本的终端只能激活应用 | 在所选终端执行 `claude --resume <id>` |
| Codex CLI | 同上 | 新开终端执行 `codex resume <id>` |
| Codex 桌面端 | `codex://threads/<threadId>`（有 `hostId` 时一并带上） | `codex://launch` 并把 ID 复制到剪贴板 |

Claude 桌面端的 `local_*` ID 和 CLI transcript UUID 不同，不能直接把 CLI UUID 放进桌面端的 continue 链接。本机已验证映射后能跳回对应的 Claude Code 对话。仅激活应用或复制 ID 是兜底行为，不代表已精确到达目标会话。

点通知会打开 `raycast://…/inbox?context=…`，Raycast 先弹窗确认（↵ 跳回，esc 取消）。在订阅列表里按 ↵ 直接跳，不弹确认。点通知跳回需要先装 `terminal-notifier`（`brew install terminal-notifier`），没装的话通知只能看、不能点。

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
- **历史会话**：不会自动导入订阅数据库。打开「全部会话」时扫描 `~/.claude/projects`、`~/.codex/sessions` 和桌面端本地会话 metadata，和 hook 库合并显示。基础信息只采样 transcript 首尾，结果按文件修改时间与大小缓存在 `~/.sessions/cache`；全文索引须另行确认启用。没有本地记录的云端会话不会自动被发现。
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

自动化测试不包含 Raycast 原生界面、macOS 系统通知和终端跳转的交互验收。开发安装后需在 Raycast 中检查：内容搜索确认与取消、订阅列表分组、订阅与已处理操作、菜单栏计数、接入结果，以及通知点击和各终端的跳回行为。

本轮验证结果与待验收范围见 [测试记录](TESTING.md)。

## 设计技能

仓库里已经装好 [Impeccable](https://github.com/pbakaus/impeccable) 设计技能（`.claude/skills/impeccable` 给 Claude Code 用，`.agents/skills/impeccable` 给 Codex 用），可以用 `/impeccable critique …`、`/impeccable polish …` 等命令。
