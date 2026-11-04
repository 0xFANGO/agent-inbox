# 发布准备

[返回 README](../README.md)

## 当前状态

截至 2026-11-04，GitHub 仓库为私有，尚无 GitHub Release。当前文档描述本地工作分支的能力，不代表这些变化已合并到 `main` 或已在 Raycast Store 发布。`CHANGELOG.md` 记录开发变化，CLI 的 `version` 输出是内部协议修订号。

发布路径为 Raycast 扩展；不要把辅助 CLI 当成独立 npm 包发布。

## 本地检查

```sh
npm ci
npm run check
npm run lint
npm run bundle
```

- `check`：测试、类型、代码格式、CLI 和四个 Raycast 命令构建。
- `lint`：额外检查 Raycast 清单、图标和作者账号，需要联网。若 Store 账号校验失败，应先解决账号 / 可见性问题，不改用他人 author。
- `bundle`：使用锁定的 Raycast CLI 与 macOS 的 `zip` 生成 `dist/agent-inbox.rayext`，移除包含构建机路径的 source map，并附带 MIT 许可证。查看归档内容，确认不含测试、调查笔记、技能文件或本机数据。开发模式仍保留 source map。
- `npm run publish` 会调用锁定版本的 `ray publish` 进入 Store 发布流程，只有维护者决定发布后才执行。此命令不属于本地验证。

CI 在 macOS 上检查 Node 22.22.2、24 和 26，并校验受版本控制的 CLI bundle 与源码一致。工作流加入仓库不代表远端检查已经通过，应在 PR 中确认实际运行结果。

## 手动验收

- 在干净的 Raycast 开发安装中找到全部四个命令，完成首次接入与订阅。
- 验证全文搜索确认、取消、关闭，以及标题搜索始终可用。
- 用新的问题 / 授权请求验证提醒、点击、已处理和取消订阅。
- 分别验证支持的桌面客户端与 Terminal / iTerm2 / Ghostty / tmux 跳回；记录版本与无法精确定位时的提示。
- 验证纯云端会话显示状态未知，不误报运行、完成或待输入能力。
- 在测试配置中验证保留现有 Hook、Codex notify 转发，以及移除 Hook 与停用采集器。

已有证据及尚未完成的实机范围见 [TESTING.md](../TESTING.md)。

## GitHub 页面文案

准备使用的 About，与 package.json / README 保持一致：

> 订阅 Claude Code 与 Codex 会话，在需要你输入时提醒，并跳回原对话。

建议 Homepage：`https://github.com/0xFANGO/agent-inbox#readme`。

建议 Topics：`raycast-extension`、`claude-code`、`codex`、`developer-tools`、`macos`。

以上为待应用文案；本轮没有修改仓库设置、可见性或 Topics。

## 公开前尚需确认

- [ ] 检查拟公开的全部分支与 Git 历史，完成凭据 / 个人数据扫描；源码文本检索不能代替历史扫描。
- [ ] 确认 `assets/extension-icon.png` 的创作来源，以及 `assets/openai.svg`、`assets/claude.svg` 的来源和可再分发范围。MIT 源码许可证不授予第三方商标权利。
- [ ] 检查随仓库附带的 Impeccable 技能的许可证与分发内容，确保保留其原有声明。
- [ ] 启用并验证 GitHub 私密漏洞报告，或提供真实私密联系方式后更新 `SECURITY.md`。
- [ ] 解决 Raycast Store 对 `0xFango` 作者账号的校验，并检查通知深链接使用实际作者名。
- [ ] 用当前版本、脱敏会话制作真实截图或演示；README 目前使用明确标注的流程示意。
- [ ] 完成上方实机验收，确认构建产物和发布说明，选择首次版本与对应 tag。
- [ ] 决定公开仓库、Store 提交或 GitHub Release 的时机，再应用 About / Topics。发布后同步 README 的安装与下载入口。
