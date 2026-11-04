# 安装与卸载

[English](setup.md) | **简体中文**

[返回 README](../README.zh-CN.md)

## 环境

- macOS 与已安装的 Raycast；本项目使用 macOS 的窗口、通知和 LaunchAgent 接口。
- Node.js **22.22.2 或更高版本**、npm、Git。最低 Node 版本来自锁定的 `@raycast/api`；仓库的 `.nvmrc` 使用 Node 24。
- 至少一个已使用的 Claude Code 或 Codex 客户端。Agent Inbox 不代为安装或登录这些客户端。
- 系统 `sqlite3`，用于本地状态数据库与搜索索引。
- 可选的 `terminal-notifier`，用于可点击的 macOS 通知。

## 从源码安装

当前安装方式为本地开发安装，没有可供下载的 GitHub Release。

```sh
git clone https://github.com/0xFANGO/agent-inbox.git
cd agent-inbox
npm ci
npm run dev
```

仓库尚未公开时，clone 需要已有的 GitHub 访问权限。使用 nvm 的开发者可先执行 `nvm install`，再执行 `npm ci`。

`npm run dev` 打包辅助 CLI，并通过 `ray develop` 加载扩展。在 Raycast 搜索 **Agent Inbox**，应能看到**All Sessions（全部会话）**、**Subscriptions（订阅列表）**、**Session Menu Bar** 三个命令。

### 接入第一个 Agent

1. 打开 **All Sessions**，在 **Actions（⌘K）** 中选择 **Connect an Agent**。
2. 选择 Claude Code 或 Codex，按回车执行接入；面板会显示结果。
3. Codex 首次接入后，按提示在 Codex 内执行 `/hooks` 确认信任。已运行会话是否加载新 Hook 取决于客户端，可在新会话中验证。
4. 打开 **All Sessions（全部会话）**，选一个会话并按回车订阅。也可以从目标 Agent 窗口唤出 Raycast，使用首项**Subscribe to Current Conversation**。
5. 打开 **Subscriptions（订阅列表）** 查看它。支持监测的会话在需要回答或授权时进入「待输入」，系统通知开启时会提醒；按回车跳回原对话。

首次可以订阅一个已经存在的会话验证列表展示。通知应使用新产生的问题或授权请求验证：首次恢复历史状态不会补发历史通知。

### 权限与可点击通知

窗口识别和终端定位需要 macOS 的「辅助功能」或「自动化」权限。根据系统提示，在「系统设置 → 隐私与安全性」中给执行操作的 Raycast / 终端授权。没有可靠的窗口信息时，在「全部会话」中手动选择会话。

如需点击系统通知后跳回，可使用 Homebrew 安装：

```sh
brew install terminal-notifier
```

没有它时仍可显示系统通知，但不能从通知直接跳回。点击通知后，Raycast 会先确认，再跳转；订阅列表内按回车直接跳转。macOS 通知权限和专注模式也会影响通知显示。

## 安装会修改什么

| 位置                                                           | 用途                                                          |
| -------------------------------------------------------------- | ------------------------------------------------------------- |
| `~/.claude/settings.json`                                      | Claude Code Hook 配置；使用 `CLAUDE_CONFIG_DIR` 时跟随该目录  |
| `~/.codex/config.toml`、`~/.codex/hooks.json`                  | Codex notify 转发与 Hook 配置；使用 `CODEX_HOME` 时跟随该目录 |
| `~/.sessions/bin/agent-inbox.mjs`                              | Hook 与采集器使用的稳定 CLI 路径                              |
| `~/Library/LaunchAgents/com.fango.agent-inbox.collector.plist` | 用户级后台采集服务                                            |
| `~/.sessions/`                                                 | 状态、订阅、配置、通知队列与缓存                              |

接入会保留其他 Hook 和原有 Codex notify 转发；修改已有配置前写入同路径的 `*.agent-inbox.bak`。备份为最近一次修改前的内容，多次接入可能覆盖旧备份。接入面板也会安装或重启后台采集器。更新扩展后，下次打开命令会同步已经安装的 CLI。

Agent 自身的对话文件只读。默认搜索标题、项目和 ID；全文搜索需要在 Raycast 原生偏好中主动开启，索引留在本机，关闭后不会自动删除已有索引。详细行为见 [使用指南](usage.zh-CN.md#搜索)。

## 停用或卸载

临时停止某个会话的后台采集与提醒：在列表中取消订阅。只停止系统提醒：在原生偏好中关闭 **System Notifications**，再打开扩展命令同步后台配置。

完整卸载按以下顺序操作：

1. 在 **All Sessions → Actions → Connect an Agent**选择已接入的 Agent，在 Actions 中执行**Remove Hooks**。对每个接入的 Agent 分别操作；只移除本扩展条目，不要直接用旧备份覆盖整份客户端配置。
2. 停止后台采集器，并删除它的启动项：

   ```sh
   launchctl bootout "gui/$(id -u)/com.fango.agent-inbox.collector"
   rm -f "$HOME/Library/LaunchAgents/com.fango.agent-inbox.collector.plist"
   ```

   若服务已停止，第一条命令可能报告找不到服务；仍需删除启动项，避免下次登录再次启动。仅移除 Hook 不会自动卸载采集器。

3. 在 Raycast 的扩展设置中移除 Agent Inbox。
4. 按需删除 `~/.sessions/`；这会丢失订阅、配置和本地索引。使用自定义 `AGENT_INBOX_HOME` 时检查对应目录。该目录不是 Agent 原始对话存储，删除它不会删除 Claude / Codex 中的对话。

## 排查

| 现象               | 检查                                                                          |
| ------------------ | ----------------------------------------------------------------------------- |
| 无法订阅当前窗口   | 目标是否是受支持的 Code 页面；窗口权限与 tty 是否可读；先在全部会话里手动订阅 |
| 纯云端会话没有提醒 | 没有本地记录或 Hook 时不具备状态监测，详情会显示「云端状态未接入」            |
| 会话未进入已完成   | 普通回合停止只代表「本轮结束」；仅明确的完成事件进入已完成                    |
| 没有系统通知       | 检查订阅、已处理标记、通知开关与 macOS 权限；历史状态恢复不会补发提醒         |
| 通知不能点击       | 检查 `terminal-notifier` 是否可用；仍可在订阅列表跳回                         |
| 跳转只打开了应用   | 未能精确定位时会复制 ID 或恢复 CLI，会话详情与提示会说明兜底结果              |

诊断日志位于 `~/.sessions/log.txt` 和 `~/.sessions/collector.log`。提交问题前删去路径、会话内容和凭据，见 [贡献说明](../CONTRIBUTING.zh-CN.md)。
