# 通知与扩展架构调查

> 本文记录修改前的调查快照。随后已实施状态模型、采集与通知分层修复，当前接口与边界见 [扩展接口](integrations.md)；以下旧代码行号对应调查时版本。

调查日期：2026-11-04（Asia/Shanghai）。对象为本仓库 Agent Inbox，以及本机 `/Applications/Vibe Island.app` 1.0.55，build `8eca15ab18e1`。

仓库 `assets/agent-inbox.mjs` 与实际安装的 `~/.sessions/bin/agent-inbox.mjs` SHA-256 一致：`8837090385e47e60bdd32c5c52432a43da76875b35bf63aedcdb82639869e695`；已核对安装产物中的相关状态/Hook 分支。Vibe Island 的原生深层反编译未完成，已关闭分析会话；下文不声称恢复了其完整状态机源码。

## 结论

Agent Inbox 的状态误判可以在当前代码中直接复现：把“回合结束”当成“任务已完成”，只用最后一个字符是不是问号来补救；同时缺少结构化提问、权限请求与事件顺序保护。通知只在进入 `needs_input` 时产生，所以状态误判会进一步变成漏提醒。

Vibe Island 的本机配置和已有运行日志显示，它采用更丰富的 Hook、Codex rollout 读取、提问生命周期跟踪及通知展示策略。尤其要区分它的 `taskComplete` 通知意图与 `waiting_for_input` 会话状态：本机日志中两者同时出现，不能把“播放了完成提示”直接理解成“会话不再等用户”。这不代表它所有场景都正确；本次没有定位用户描述的某一次错误对应的完整事件序列。

项目已有输入适配器、统一状态核心、Raycast 展示层；输出通知渠道尚未插件化。能继续扩展，无须重写，但“新增一个 JSON 就自动支持新 Agent 的全部能力”目前不成立。

## 已确认的 Agent Inbox 问题

### 1. 回合结束不等于任务完成

- `src/core/adapters/codex.ts:119`：`agent-turn-complete` → 末尾问号则 `needs_input`，否则 `stopped`。
- `src/core/adapters/claude.ts:96`：`Stop` 同样只检查最后消息的末尾问号。
- `src/core/status.ts:30`：只检查去除部分 Markdown/引号后的末尾 `?` / `？`。
- `src/core/status.ts:63`：`stopped` 无条件变 `done`，覆盖已有待输入/待授权；运行中的 `ended` 也变 `done`。
- `src/core/transcript.ts:90`：Claude 历史恢复同样把 `end_turn` 加末尾标点映射到 done / needs_input。`end_turn` 只能证明回合结束，不能证明用户目标完成。

用临时脚本直接调用仓库实际解析器与纯状态机，结果如下。没有发送 Hook、写入会话数据库或触发通知。

| 输入/顺序 | 当前结果 |
|---|---|
| `请确认后我再继续。` → 回合结束 | Codex、Claude 都是 `done` |
| `请选择 A 或 B` → 回合结束 | Codex、Claude 都是 `done` |
| `是否继续？` → 回合结束 | 两者都是 `needs_input` |
| `是否继续？\n选择后我将开始执行。` → 回合结束 | 两者都是 `done` |
| 待授权 → 新停止事件 | `done` |
| 待授权，时间 20 → 旧停止事件，时间 10 | `done` |
| Codex `PermissionRequest` → 当前 Hook parser | `null`，忽略 |
| Claude `PreToolUse` / `AskUserQuestion` → 当前 Hook parser | `null`，忽略 |

复现脚本位于 `/tmp/agent-inbox-vibe-audit/reproduce.mjs`，仅为本次调查的临时产物。

### 2. 关键事件未接入

- Codex 安装列表只有 `SessionStart`、`UserPromptSubmit`，结束依赖 `notify`。`parseCodexHook` 也只处理上述两种事件。没有结构化待输入/待批准的完整路径。见 `src/core/adapters/codex.ts:13`、`:136`。
- Claude 未注册 `PreToolUse`、`PermissionRequest`、`PostToolUseFailure`、`StopFailure`。其中 `StopFailure` 已有解析分支却未注册；`AskUserQuestion` 的开始无法经当前 parser 转成待输入。见 `src/core/adapters/claude.ts:23`、`:83`。
- Claude 明确忽略 `idle_prompt`。空闲提醒本身不一定意味着用户必须处理，不能简单全部改成待输入；应由产品定义“可继续输入”和“必须回答/授权”的区别。

本机只读检查 `~/.sessions/db.sqlite` 时，events 表中的 Codex 记录为 **18 个 stopped，0 个 started/progress/needs_input**；Claude 为 6 个 started、5 个 ended。这里证明当前保留事件的覆盖缺失，不能单凭它断定是 Hook 信任、配置重载、桌面隔离还是其他原因。

本机 Hook 配置同时存在 Vibe Island 与 Agent Inbox 的注册。Codex `notify` 由 Agent Inbox 接收，再用 `--then` 转发既有通知程序。因此“Hook 配置文件里有条目”与“当前会话实际加载、发送了该事件”需要分别验证。

### 3. 能识别桌面会话，不等于有实时状态

- `src/core/codex-desktop.ts:17` 读取 ID、标题、目录、rollout 路径、时间，未读取审批或提问状态。
- `src/core/claude-desktop.ts` 主要完成 CLI/桌面 ID 关联和来源校正。
- `src/core/transcript-state.ts:21` 仅补 Claude 的 idle 状态；已有 done/running/needs_input 不会被 transcript 恢复纠正，也没有 Codex 对应恢复。

因此跳回、订阅窗口匹配和实时状态识别必须分别验收，不能以其中一项成功作为另一项已完成的证据。

### 4. 顺序与并发保护不足

`AgentEvent` 缺少 turnId、requestId、来源序号、事件唯一 ID；`applyEvent` 不拒绝旧时间事件。旧 stopped 覆盖新 needs_input 已经通过纯函数复现。

`src/core/db.ts:138` 先读旧状态，再进入写事务。并发 Hook 可能分别读取同一个旧状态，再覆盖彼此的结果；本次只确认代码风险，未复现多进程竞态。

## Vibe Island 的可核实机制

以下来自本机现有配置、日志和已安装插件；没有主动执行待批准操作、回答问题或向任何外部服务发消息。

| 机制 | 证据与边界 |
|---|---|
| Hook → bridge → 本地 socket | `~/.vibe-island/bin/vibe-island-bridge` 启动包内 helper，检查目标应用进程与 socket；本机 Claude/Codex Hook 配置实际指向该 bridge。 |
| Claude 结构化问题识别 | `~/Library/Logs/VibeIsland/vibe-island.log:1271`、`:1278`：`PreToolUse` 与 `PermissionRequest` 产生 `userQuestion`；附近明确记录 `tool=AskUserQuestion`。 |
| 审批与问题不同分类 | `vibe-island.log.1:9727`：Bash 权限请求产生 `approvalRequest`；与上一行机制中的 userQuestion 不同。 |
| 问题生命周期 | `vibe-island.log:1293` 附近记录回答发送，后续 `post_received`；Codex 在 `:2922` 接纳异步问题，`:2938` 收到 reply 后移除 pending，保留 question/turn/call 标识。 |
| Codex rollout 补充 | `vibe-island.log:3896`：读取 `event_msg.task_complete`，启动标为 `8.0s` 的完成兜底。日志证明该实例的补充路径，不证明所有版本都使用固定延迟。 |
| 完成通知与会话状态分开 | Codex `vibe-island.log:3891` 是 `taskComplete`，紧接 `:3892` 是 `waiting_for_input`、bundle 为 `com.openai.codex`。Claude `:1309` / `:1310` 也有对应组合。 |
| 展示/声音有独立判断 | `vibe-island.log:1281` 附近出现 `semantic sound suppressed without live transition`；`:3894` 是声音 gate；`vibe-island.log.1:9729` 附近显示前台上下文导致 reveal 延后。通知意图不保证每次都会播放或展开。 |

二进制包含 Codex 桌面审批/提问 transport、rollout monitor、Claude 桌面 conversation monitor 等类型名称。这仅支持“存在相关组件”的静态线索，不据此推断全部分支行为或兼容保证。主要结论以实际配置和运行日志为依据。

## 扩展边界

当前结构：

```text
Claude / Codex / 自定义事件上报
              ↓
         Agent Adapter
              ↓
      AgentEvent → 状态机 → SQLite
                       ├─ Raycast 列表 / 菜单栏
                       └─ macOS 通知 → Raycast 跳回链接
```

`src/core` 没有导入 `@raycast`；CLI 可独立处理事件。Adapter 的接口与注册见 `src/core/adapters/types.ts:47`、`index.ts:6`。

### 新 Agent / DeepSeek：输入扩展

`AgentId` 是任意字符串，CLI 已提供统一 `event` 上报。自定义 manifest 只定义跳回 URL / 恢复命令，不提供自动采集；见 `src/core/adapters/custom.ts:9`。

若 DeepSeek 指 DSH，已有一个很具体的本机参考：Vibe Island 安装的 `~/.vibe-island/dsh-plugin/index-adf78714a7972686.js` 在 `:740` 列出 turn、message、tool、approval 事件，在 `:374` 和 `:385` 接入 approval 与 user-questions 请求，在 `:822` 监听 session/event。说明本机这套集成采用宿主的结构化事件；不需要靠回复标点判断。它不是本项目已支持 DSH 的证据，也不保证其他 DSH 版本接口相同。

如果 DeepSeek 只是某 Agent 使用的模型，应该接入运行它的宿主。若指网页/桌面聊天，则需要该客户端专门的采集器。

完整新来源还需要扩展历史发现、transcript 解析/恢复、全文搜索与窗口识别。目前 `history.ts`、`search.ts`、`foreground.ts` 仍有 Claude/Codex 专用分支；设置入口也只列内置来源。

### 飞书：输出渠道或交互入口

若用于收提醒，应增加 `NotificationChannel`。现在 `cli/agent-inbox.ts:52` 直接调用 `sendWaitingNotification`，后者仅使用 terminal-notifier / osascript，点击链接拼接 Raycast inbox。没有渠道注册、送达记录、重试机制；见 `src/core/notify.ts:6`。

飞书网络投递建议经本地 outbox 异步完成，有去重与重试，避免网络延迟阻塞 Agent Hook。若还要在飞书回复、批准或派发任务，则需要额外的命令路由与响应关联，属于交互能力，不能只用通知发送接口代替。

## 建议顺序

1. 先定义状态语义：运行、等待回答、等待授权、回合结束/可继续、失败/中断、未知。将用户已处理、归档和任务完成意图单独保存；不要因 Stop 或进程退出自动断言任务目标达成。
2. 补齐结构化事件采集。保留未解决问题/授权请求，明确匹配的回复、取消、请求结束才清除；未知或失联不能猜成已完成。
3. 增加事件身份、来源、顺序与状态证据；同一会话串行/原子更新，处理去重、旧回合和重放。界面可显示状态来源与最近更新时间，接入检查区分“已安装”和“实际收到事件”。
4. 将输入来源、核心状态、输出渠道、交互入口分别定义接口，给来源声明 discover / watch / recover / jump 等能力。
5. 在上述基础上接飞书与 DSH/其他 Agent，避免把同一误判同步到更多渠道。

本次仅做分析和临时纯函数复现；未修改业务代码、Hook 配置、已安装应用或真实会话数据库。该文档为调查新增产物。
