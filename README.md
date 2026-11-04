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

「全部会话」中的「已订阅」与状态筛选可重叠。「订阅列表」按待输入、已订阅、已完成三个互斥分区展示；运行中、本轮结束和状态尚未确认的订阅会话归入「已订阅」，运行状态仍用蓝灯表示。「已完成」只包含明确完成的会话，不再有「其他会话」分区。

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
- **系统通知**：可在设置面板直接开关；仅已订阅会话进入待输入或出现新待处理请求时提醒。已处理、取消订阅、已回答或关闭通知后，尚未投递的提醒会取消。

## 状态与订阅

- **运行中**：Agent 正在执行；**待输入**：有待回答、待授权或失败/额度/中断需要处理。
- **本轮结束**：这一轮已停止，可以继续输入。`Stop`、`agent-turn-complete`、`end_turn` 都不会直接标成任务已完成。
- **已完成**：只接受来源明确上报的 `completed`。旧版本由 Claude/Codex 停止事件推断的已完成记录，会迁移为本轮结束，保留订阅和已处理标记。
- **状态未确认**：执行期间进程退出，但没有可靠的正常结束证据。不会按超时猜成已完成。
- 结构化问题/授权按请求 ID 保存；停止、其他工具活动或新回合不会清除它。只有对应回复、请求取消/结束的解析事件才解除。Codex 桌面异步提问的 `accepted: true` 只代表已发出问题；多问题逐项等待真正回复。
- 自然语言请求（例如“请确认后继续”“请选择”）只是备用提示，不用来证明任务完成；新用户输入会清除这类提示。
- **订阅**：进入订阅列表，待处理时提醒。**取消订阅**：停止采集和提醒，仍可在全部会话中找到。
- **已处理（⌘D）**：暂时离开订阅列表；状态变化或新的待处理请求会恢复显示。重新订阅也会恢复。
- 订阅列表约 2 秒刷新，全部会话约 5 秒刷新；Raycast 菜单栏遵循宿主的 1 分钟刷新周期。

接入时安装用户级后台采集服务 `com.fango.agent-inbox.collector`：只处理已订阅会话。首次分块读取其本地 transcript 恢复未回答请求，不建立全文搜索索引、不补发历史通知；随后保存读取位置并增量采集。单次读取最多 1 MB，超大单行跳过，不加载整份大文件进内存。缺失、未写完整或不支持的记录不能作为完成证据。纯云端、无本地 transcript 且未发 Hook 的会话仍无法可靠监测。

列表的临时状态恢复使用相同来源解析器和状态机，只读末尾最多 96 KB；已有结构化待处理请求不会被不完整的尾部样本清除。后台采集负责完整的订阅状态恢复。两者都不会改写 Agent 自身的对话文件。

### 标题同步

标题按会话 ID 同步，独立于运行状态。后台持续更新已订阅会话；打开列表时也会刷新其中的会话标题。订阅列表约 2 秒、全部会话约 5 秒刷新，菜单栏遵循 Raycast 的约 1 分钟周期。

- **Claude 本地桌面端**：读取桌面会话 metadata 中的当前名称。
- **Claude CLI**：优先读取会话旁的 `custom-title.json`；旧版从 transcript 中增量提取 `custom-title` / `ai-title`。旧记录首次恢复采用有界分块，可能需要多个刷新周期；有明确自定义名称时不会被生成标题覆盖。
- **Codex CLI / 桌面端**：读取本地会话目录的当前名称，兼容 `state*.sqlite` 与旧版 `session_index.jsonl`。
- **Claude Cloud**：被动读取 Claude 已打开窗口的外层文档 ID 和标题，不激活或切换窗口、不遍历对话内容。只有 ID 精确匹配的会话才更新；未打开的纯云端会话要等客户端展示后才能同步。窗口不可访问或来源暂时缺失时保留最后确认的名称。

新名称单独持久化，较旧的读取结果不能覆盖较新的结果；改名不会改变订阅、已处理、运行状态和最近活动时间，也不会触发新通知。已排队的通知在发送时使用最新名称。云端标题同步不代表云端运行状态已接入。

### 订阅当前窗口对话

从目标 Agent 窗口唤出 Raycast，打开「全部会话」，执行首项「订阅当前窗口对话」。插件关闭 Raycast 后识别前台窗口，再读取会话，按以下信息匹配：

- **Claude / Codex 桌面端**：优先通过原生 Accessibility 读取前台窗口文档 URL 中的会话 ID。URL 不能标识会话时使用当前文档的唯一标题；原生读取失败时才降级到 System Events。只有唯一匹配才订阅；Claude 的标题匹配仅接受以 `- Claude Code` 结尾的页面。普通 Claude 聊天、主页、标题有歧义或缺少窗口信息时，不会按最近活动时间猜一个会话。
- **Terminal / iTerm2 / Ghostty 1.4**：读取选中标签页或焦点分屏的 tty。tmux 会同时匹配前台客户端 tty、服务器 socket 和 pane，避免订阅后台的其他会话。没有可靠 tty 或出现多个匹配时会提示无法识别。

Codex 额外保留原生窗口标题，避免 Electron 的通用页面标题覆盖实际会话名；支持外部 thread 链接以及本地、独立窗口和 hash 会话路由。按实际表结构读取本地 `state*.sqlite` 的会话名称，不固定数据库版本；不支持时退到 `session_index.jsonl`。实际窗口匹配成功后才纠正旧记录的 CLI/App 来源，同时保留 Hook 的实时状态。关闭 Raycast 后会短暂等待焦点恢复，不按最近活动时间猜测。

Claude 的本地 metadata 还用于把 `bridgeSessionIds` 关联到 `local_*` 和 CLI 会话 ID；兼容旧版字符串与新版数组，`session_*` / `cse_*` 的同后缀 ID 按同一映射处理。多个本地记录指向同一 ID 时拒绝匹配。纯云端 Code 页面没有本地记录时，也可按当前窗口的明确 `session_*` / `cse_*` ID 订阅并跳回；列表显示「云端状态未接入」，详情说明目前没有待输入提醒。未知的开始/活动时间显示为「—」，不会用订阅时间冒充会话活动，也不会推断为运行中或已完成。

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

```text
来源插件（Hook / transcript / 自定义事件）
                   ↓
       EventEngine → 状态机 → SQLite
                                ├─ Raycast 列表 / 菜单栏
                                └─ 持久化通知队列 → 通知渠道插件
                                                      └─ macOS（已实现）
```

- **采集来源**：`src/core/adapters/` 声明接入、解析、跳回；可选 `source` 能力包括 transcript 解析、历史发现及定位。`src/core/sources/` 管理分块读取与持久化位置，向 EventEngine 统一上报事件。
- **Claude Code**：接入会话开始、用户输入、工具调用前后、权限请求、工具失败、通知、回合停止、StopFailure、会话退出。仅观察，不代用户批准。
- **Codex CLI / 桌面端**：结构化 Hook 配合本地 rollout。保留原有 notify 的 `--then` 转发。支持同步/异步用户问题、真正回复、回合开始/结束/中断。Hook 安装范围依据本机 0.163.0 的可用事件；Codex 自身的 Hook 信任仍由其应用管理。
- **自定义来源**：JSON manifest 只定义跳回，来源通过 CLI `event` 或 `EventEngine.ingest` 上报。DeepSeek Harness 后续应接宿主的回合、审批、提问/回答事件。完整历史发现/搜索/前台识别仍需分别实现，不能仅靠一个 JSON 自动获得。
- **核心**：统一事件包含来源、事件 ID、回合 ID、请求 ID。SQLite 使用版本比较重试避免并发 Hook 丢失更新；状态、去重记录与通知队列在同一事务内写入。订阅/已处理操作也参与版本控制。
- **通知**：`src/core/notifications/` 定义渠道无关消息与 `NotificationChannel.send`。目前仅实现 macOS；Raycast 跳回链接封装在该渠道。飞书/其他网络渠道可独立添加，不修改 Agent parser 或状态机。队列支持租约、超时、退避重试和稳定通知 ID；崩溃恢复是至少一次投递，网络渠道应使用 ID 去重。
- **后台服务**：独立 CLI 每约 2 秒采集订阅状态并投递通知；Hook 只写入状态/队列，并启动独立投递进程。网络发送不占用 Hook 的等待时间。
- **数据**：数据库和队列在 `~/.sessions/db.sqlite`；Hook 错误在 `~/.sessions/log.txt`；历史发现缓存与用户主动开启的全文索引仍在 `~/.sessions/cache`。

接口、接入示例与兼容边界见 [扩展接口](docs/integrations.md)。

### CLI

```bash
node ~/.sessions/bin/agent-inbox.mjs list
node ~/.sessions/bin/agent-inbox.mjs jump claude <session-id>
node ~/.sessions/bin/agent-inbox.mjs event --agent dsh --session <id> --type needs_input --attention question --request <request-id> --event-id <event-id>
node ~/.sessions/bin/agent-inbox.mjs event --agent dsh --session <id> --type resolved --request <request-id> --event-id <reply-event-id>
node ~/.sessions/bin/agent-inbox.mjs watch --once
node ~/.sessions/bin/agent-inbox.mjs install claude codex --collector
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
