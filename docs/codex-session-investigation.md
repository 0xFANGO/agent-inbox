# Codex 当前会话订阅调查

日期：2026-11-04。用户反馈：执行「订阅当前窗口对话」提示「无法确定当前会话」。本轮使用 reverse-engineer-anything 对已安装包做范围明确的静态分析，并用合成窗口、临时数据库和流取消测试验证修复。

## 目标与证据边界

- 实际应用位于 `/Applications/ChatGPT.app`，Bundle ID 为 `com.openai.codex`，安装版本 `26.1027.61615`。应用名称不是定位依据。
- `Contents/Resources/app.asar`：674,615,301 bytes，SHA-256 `bb88615052255e79b5977885f9a0cc212c268589587c79d4d3b7c4b46e881a95`。
- 完整包分析最初遇到 unpacked native member 的完整性不一致；本报告只使用明确提取的 JS 成员和可定位的源字节，不将整包分析描述为成功运行。
- CUA 对 `com.openai.codex` 返回安全限制，禁止访问 Codex 自身界面；未通过其他实时 UI 通道绕过。以下静态证据不等于观察到当前窗口执行。

## REA 记录

从 ASAR 按头部目录的 offset/size 提取三份未修改 JS，附来源清单后交给 `analyze_javascript_application`：

| 成员 | SHA-256 |
| --- | --- |
| `webview/assets/document-title-eda5e1add916.js` | `c4b8b1359c480bc9dc0eb0d2471e812a82485a463f4fd196b78b37ce8feb8ef8` |
| `webview/assets/local-conversation-page-50ae20551907.js` | `b1293967bb28331c9b90c987c795a24f5ee9f93e1abe6a638e8b82d0bcad89d7` |
| `.vite/build/preload.js` | `aa8be920fd14a9b98eca16c91d97a55105b196698fda36d5063e966620a0c54a` |

保留的分析 Evidence：`ev_1c7627089a1ebbea66a5f51b8e1e000295e26923e2c07cdc91c354338d65f2f8`；摘要 `ev_e0eba6bc3befe0bc3950ffa2d01481aa38c9dc19fa431ecca4aec5c005466b8a`。标题模块选择视图：`ev_d47614a7c89ec6f2ebde62d6ad8a7c08826230387dae489c49a98c3c4e48b21d`。

覆盖仅限三份模块，无解析失败，但存在 6,377 项语义 unknown，不代表应用整体控制流完整。Evidence 视图确认模块与导出身份；下述具体行为来自对原始成员字节的定点阅读。会话 Evidence 已导出本机 `/tmp/agent-inbox-codex-evidence-20261104.json`，该文件未加入仓库。

## 发现与实现

| 发现 | 证据类型与位置 | 修改 |
| --- | --- | --- |
| 原生标题与文档标题可分别设置 | 静态：`document-title-eda5e1add916.js` 接受 `title` / `nativeTitle`；窗口服务在 `early-bootstrap-439-a0f25ba32c465de1.js` 约字符 4,064,397 调用原生 `setTitle` | 保留有意义的原生标题，不让通用 Codex / ChatGPT 页面标题覆盖；冲突标题不能唯一定位时拒绝猜测 |
| 当前页面使用 local / hotkey-window 路由 | 静态：`app-initial-18b189e867e7.js` 约字符 2,192,754 的路由解析 | 兼容 `/local/<id>`、`/hotkey-window/thread/<id>`、thread 与 hash 路由；拒绝设置页、未知 URL 与冲突 ID |
| 会话显示名称可能不同于原始提示 | 静态：`app-primary-75d53eef2374.js` 约字符 1,659,451 从会话目录解析标题；只读本地 `threads` schema 同时包含 `name` 和 `title`，实际数据两者不同 | 检测表字段，优先 name，兼容仅 title 的旧表和 session_index；搜索也展示新名称。目录记录本身不改变全部会话的 App/CLI 来源 |
| 原历史扫描范围并不覆盖全部目录 | 只读本地目录约 3,020 条，原始 transcript 样本 237 个文件 | 当前窗口匹配从完整可用目录补齐名称与 ID，不要求进入最近 400 条记录 |
| 外部会话链接独立于内部页面路由 | 静态：`app-initial-18b189e867e7.js` 约字符 7,659,976 的复制链接函数构造 `codex://threads/<id>`，约字符 6,170,554 的解析支持 hostId | 跳转使用该外部协议，并编码 hostId；不硬编码安装版本或 renderer 文件名；兜底启动／复制失败返回失败 |
| 旧订阅 upsert 只修改订阅标记，会保留错误 CLI 来源 | 仓库代码与临时数据库回归测试 | 仅在实际窗口匹配成功时保存桌面来源和定位 ID，同时保持 Hook 的状态、时间与终端信息 |
| 关闭 Raycast 时可能处于焦点过渡期 | 实现层时序假设，未直接观察本机 Codex 的失败瞬间 | 有界等待应用焦点与窗口可用；不退到后台窗口，也不按最新活动猜会话 |

这些缺口可以导致报告中的无法识别；由于不能读取当前 Codex UI，尚不能断言哪一项是本机失败的唯一根因。

## 搜索取消崩溃

用户后续截图报告 `AbortError: The operation was aborted`。已用读取大 transcript 期间触发取消的回归测试复现相同堆栈：旧代码在 async iterator 清理监听后，把迟到的流错误重新发送给已关闭的 readline，造成未捕获异常。修复为拥有流和 readline 的错误生命周期，并通过原索引 Promise 返回读取错误；取消后不写入部分内容。取消前、读取中、快速重开和读取文件消失均有测试。相关生命周期见 [Node.js readline 文档](https://nodejs.org/api/readline.html#rlsymbolasynciterator)。

按用户后续要求，全文索引默认关闭；只有确认读取全部本地对话后才启用。关闭时取消进行中的扫描，也不读取旧索引。标题、项目与会话 ID 搜索始终可用。

## 未验证边界

- 当前 Codex 版本的实际窗口订阅和跳转仍待用户侧重试；已完成静态分析与合成接口回归，不能称为端到端通过。
- 操作系统接受 deeplink 只证明已交给应用，不证明目标页面已经呈现；不保证恢复原独立窗口。
- 未对所有历史／未来 Agent 版本做兼容测试。使用能力检测和稳定身份接口降低版本依赖，不能保证应用删除接口或更换数据格式后无需维护。
- Agent 安装界面已检查，未为测试改写用户真实 Hooks；安装结果和备份逻辑由临时文件测试覆盖。
