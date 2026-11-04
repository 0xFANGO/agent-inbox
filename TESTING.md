# 测试记录

验证日期：2026-11-04（Asia/Shanghai）。环境：macOS、Node.js 24.22.1、npm 11.19.1、系统 SQLite 3.51.0。

## 自动化检查

运行 `npm ci` 后执行 `npm run check`：

| 检查 | 结果 |
| --- | --- |
| 单元与集成测试 | 78 / 78 通过，无跳过；原有 16 项，新增 62 项 |
| TypeScript | `tsc --noEmit` 通过 |
| ESLint 与格式 | `src`、`cli`、`test` 全部通过 |
| 构建 | CLI 打包与全部 5 个 Raycast 命令构建通过 |
| Diff | `git diff --check` 通过 |

`npm test` 先重新生成 CLI bundle，保证端到端测试验证当前源码。数据库、安装目标和配置使用临时目录并自动清理。终端和桌面跳转的自动化测试注入导航接口，不打开真实终端或发送消息。

新增覆盖：混合 Hook 保留、带注释的 Codex notify、异常输入与数据库失败、原有 notify 转发、安装备份、跨 Agent 隔离、历史订阅、状态迁移、跨分块 transcript、Claude 桌面 ID 映射、长消息丢失来源、明确 CLI 来源优先、失效跳转兜底、前台页面匹配、同名歧义、历史范围外订阅、终端偏好、Ghostty tty、tmux socket 隔离及权限失败；补充 CFURL 转换、原生空焦点不退到后台窗口、bridge alias 映射与歧义拒绝。

修复包括：

1. Hook 卸载误删同 matcher 内用户命令，Codex notify 注释被误解析。
2. 普通 CLI 数据库错误返回成功、安装目标父目录未创建、transcript 跨读取窗口的记录丢失。
3. Claude App 被误标 CLI、以 CLI UUID 构造无效桌面跳转、旧 idle tty 令错误来源持续存在。
4. “订阅当前”按最新活动猜会话且漏掉历史记录，终端猜错后台 tab / tmux pane。
5. tmux 选择失败仍因有 bundle ID 而报告成功，Ghostty 新版 tty API 未被使用。
6. 首次订阅历史会话的存在性检查与写入之间，Hook 新记录可能被历史快照覆盖；改为原子 upsert，只更新已有行的订阅标记。

## Raycast 实测

通过 `npm run dev` 加载本地开发版：

- 收件箱、接入引导、Claude / Codex Hook 预览、全部会话历史扫描、中文搜索和详情正常。
- Claude 的原始桌面会话显示为 `App · fango-media`，明确 CLI 副本仍为 `CLI · fango`。
- 选择本地验证会话的 App 记录后，Claude 打开正确的 `/epitaxy/local_…` 路由，页面标题匹配。
- Claude 与 Codex 的“订阅当前会话”均按当前页面标题订阅成功；测试所改订阅标记已恢复原值。首轮脚本未读出 AXURL；补查后已实际验证原生 AXURL 的本地与云端 ID，并按原生本地 ID 完成订阅。测试标记恢复原值。
- “接入 Agent → 恢复 CLI 会话的终端”打开扩展设置，确认下拉含 Terminal、iTerm2、Ghostty；未改用户选择。

原生 ID 补查通过只读探针比较 System Events 与原生 AX；探针日志已从源码移除。

未通过测试安装/移除真实 Hook，未发送对话消息，未执行 Store 发布。逆向证据、实现范围和运行时限制见 [调查记录](docs/claude-session-investigation.md)。

## 尚未验收

- `npm run lint` 的 Store 公开作者校验对 `0xFango` 和 `0xfango` 返回 HTTP 404。代码、图标检查通过，本机 Raycast 设置已确认账号名为 `0xFango`；公开 Store 校验需在发布前解决。
- 三种终端中真实 CLI 启动、持续运行、原标签切换的完整流程；已覆盖脚本与定位逻辑，未逐终端启动会话验收。
- 真实 Hook 触发后，系统通知、通知点击、已处理与菜单栏计数的完整交互链路。核心状态、订阅和数据库行为有自动化覆盖。
- 本机接入面板提示缺少 `terminal-notifier`，可点击通知的端到端流程未验证。
