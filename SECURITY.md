# 安全说明

本扩展读取本机 Agent 的会话记录与窗口信息，并维护本地数据库、缓存和通知。请勿在公开 Issue、PR 或截图中提交真实凭据、完整对话、数据库或未经脱敏的配置。

## 报告漏洞

优先查看仓库的 [Security 页面](https://github.com/0xFANGO/agent-inbox/security)：若有 **Report a vulnerability** 入口，请通过该入口私密提交受影响版本、复现条件、影响和脱敏样本。

如果该入口不可用，目前没有在此文档中公布备用私密邮箱。请只在 Issue 中请求一个私密联系渠道，不要附漏洞细节、利用步骤或敏感数据，待维护者提供渠道后再提交。维护者需在公开发布前确认私密报告渠道，见 [发布准备](docs/releasing.md)。

## 验证时隔离数据

调试状态机与 CLI 时使用临时 `AGENT_INBOX_HOME`，并设定 `notifications: false`。示例见 [CLI 文档](docs/cli.md)。不要用真实会话验证自动授权或发送消息；本项目不提供代用户批准 Agent 请求的能力。

当前没有已发布的 GitHub Release 或长期支持版本线。报告中请给出 commit，修复后的支持范围以发布说明为准。
