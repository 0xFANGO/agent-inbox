# Claude 会话识别、跳转与前台订阅调查

2026-11-04；本机 Claude 4.4212.0、Ghostty 1.4.0。文中的验证会话标题和 ID 已替换为占位符。目标为本机已安装版本，结论不代表未来版本的稳定公开 API。

## 结论与证据

| 问题 | 观察 / 推断 | 修复与验证 |
| --- | --- | --- |
| Claude App 被标成 CLI | 本机一条 transcript 的首条用户记录约 350 KB，超出 64 KB 头部采样；旧解析漏掉 `entrypoint` 后默认 CLI。桌面 metadata 同时保存 `sessionId=local_*` 与 `cliSessionId=UUID`。这是本机文件与源码直接观察。 | 从头尾读取来源信号，并按桌面 metadata 修复来源、标题和目录。明确 CLI entrypoint 保留优先级；旧失败跳转产生的 idle tty 不再阻止修复。350 KB 边界与来源优先级均有回归测试。 |
| App 跳回没有打开指定会话 | 已发布 JS 的 `code/continue` 路径只接受 `last` 或 `local_*`，不是 CLI UUID。该处理函数按桌面 sessionId 找未归档记录并导航 `/epitaxy/<id>`。 | 将 CLI UUID 映射到桌面 local ID。Raycast 选择 App 来源的“本地验证会话”后，Claude 页面标题与 `/epitaxy/local_…` 路由同时匹配，完成一次实际跳转验证。 |
| 订阅当前会话选错 / 找不到 | 仓库旧实现只按 `updatedAt` 选应用中最新一条，未读取聚焦窗口，且只查 Hook 数据库。 | 先捕获目标前台窗口，再匹配页面会话 ID；URL 不可用时仅匹配唯一页面标题，Claude 限 `… - Claude Code` 页面。补充历史与桌面 metadata，并通过 `subscribeEntry` 保存历史订阅。同名歧义、非会话页、无焦点信息不会按最近活动猜测。 |
| Claude 前台文档有两层 | CUA 原生可访问性树显示 Electron shell 与实际对话文档；Raycast 下的 System Events 脚本读到空标题 shell，随后才是对话标题。首轮该脚本读取 AXURL 得到空值，虽然 CUA 能读到 URL；后续补查确认是 System Events 报 AppleEvent 错误被吞掉，原生 AX 可返回 CFURL。 | 跳过空 shell，读取外层对话文档，避免进入嵌套 artifact。Claude 与 Codex 的真实“订阅当前会话”均匹配正确标题并显示订阅成功；测试产生的订阅标记随后恢复原值。首轮验证唯一标题降级路径；后续已实际验证原生 ID 路径，见下文补查。 |
| 终端选择与聚焦 | 仓库已有恢复终端偏好，但缺少可发现入口；Ghostty 1.4 字典提供 front window → selected tab → focused terminal → tty，以及 focus terminal。 | 接入面板新增设置入口，偏好可选 Terminal / iTerm2 / Ghostty。原窗口优先，无法定位时才用所选终端恢复。Ghostty 加入当前 tty 与按 tty 聚焦；tmux 当前会话按外层 tty + socket + pane 匹配，不再按活动时间猜。 |

桌面 metadata 只保留会话 ID、CLI ID、标题、目录、时间与归档状态；不引入文件中的凭据、环境变量或启动参数，也不修改 Claude 的存储。

## REA 证据索引

分析对象：`/Applications/Claude.app/Contents/Resources/app.asar`。

- ASAR SHA-256：`ce90267cb07b08d1e09c99be0e78abf39be2c06742a92367e54086b96f08caa3`
- 父分析：`ev_ede5ae888fd80293467dac215b9dd5fddedac299fbfd9a072acf8e8a222e05f9`
- 摘要视图：`ev_78b55e8c56ee8bf65765d8213548ec55c433cf1d2571707f39ba740d0e4838cc`
- 模块清单：`ev_3027bffae31bdafa4a780cd74d131a3fe3a351fba2301eb39401f67d9252dee7`
- 主模块视图：`ev_19ff7ed836a029cc3b09094f4ff8277cddd9a7eee6da3943a88d70e782cf35ea`
- 主模块：`.vite/build/index.chunk-m4oMImJ-.js`
- 主模块 SHA-256：`926694919e5ff5d05cb804945637ffbe6ae75bdeac5e461f30e7c3d5fa043ccb`
- 主模块节点：`jag_node_1b847f154e8842f335137eba3abda00f471fc58392d4b6a0b90d38e47f2d2236`

对 ASAR 使用格式解析提取字节并核对摘要，未执行提取的代码。以下为该压缩 JS 文本的字符偏移，供同版本复核，不是稳定符号地址：

| 位置 | 直接观察 |
| --- | --- |
| `lmr`，3430778 | local ID 校验 `/^local_[A-Za-z0-9-]{1,64}$/` |
| `fmr`，3430890 | `last` 或符合上述规则的 ID |
| `code/continue`，3423428 | 校验后进入 `pmr`；不是任意 UUID 通用入口 |
| `pmr`，3430953，及后续 `vmr` | 认证/功能门控、查询未归档桌面会话、按 ID 导航；失配落到 Code 首页 |
| `rb`，2037567 | `/epitaxy/${encodeURIComponent(id)}` |
| `bmr` / `Mmr`，3435591 附近 | 云端 `cse_` / `session_` 另走 `code/<id>` 处理路径；本轮未做云端完整验收 |
| `Daa`，5327582 | 桌面进程使用 `claude-desktop` / `claude-desktop-3p` 来源 |

REA 对大型包的语义覆盖为部分，包含资源预算限制；初次分析遇到 unpacked native 模块 ASAR integrity mismatch，随后以 `record-and-continue` 保留限制继续分析。这不是包真实性验证，也没有证明未检查模块的行为。上述局部 JS 控制流另外用同摘要提取文本复核；实际跳转与前台订阅由 UI 操作独立佐证。没有打开需关闭的原生反编译会话。

## Ghostty 证据与剩余范围

本机 `/Applications/Ghostty.app/Contents/Resources/Ghostty.sdef` 经 XML 解析核对属性和命令，SHA-256：`8695d2feff757e8aec077648fe8f3481b8b39c596c5279813627792f0860b85f`。与 [Ghostty AppleScript 文档](https://ghostty.org/docs/features/applescript)及 [1.4 发布说明](https://ghostty.org/docs/install/release-notes/1-4-0)一致。

- 终端脚本、恢复参数、失败处理与 tmux socket 隔离通过隔离测试；本轮没有启动新的真实 CLI 会话逐一验收三种终端。
- CLI 当前订阅需要 Hook 提供 tty/tmux 定位符；只有历史 transcript 时不能由终端应用名推定会话。
- 旧 Ghostty / 无 Automation 权限时，精确 tab 跳转可能退为激活应用；当前订阅会拒绝猜测。
- 无本地 metadata 或 transcript 的纯云端会话不自动发现；归档桌面会话不通过 continue 路由恢复。
- 原生 AX 已实测可读取 Claude 当前会话 URL。只有原生接口不可用且降级后的页面同名时，才须在“全部会话”中选择。窗口读取依赖 Raycast 的系统权限，参见 [Raycast Script Commands](https://manual.raycast.com/script-commands)。


## 补查：当前桌面会话 ID 可以直接读取

同日用户指出“应该可以获取 ID”后，针对**同一个已运行 Claude 窗口**对比了两条接口。前一轮“System Events 读不到”的观察成立，但不能推广为“Claude 不提供会话 ID”。

| 路径 | 运行时结果 |
| --- | --- |
| `System Events → AXWebArea.attributes.byName("AXURL").value()` | 抛出 `Error: AppleEvent处理程序失败。`；原代码 catch 后返回 undefined，最终 URL 为空 |
| `AXUIElementCopyAttributeValue(element, "AXURL", &value)` + `CFURLGetString(value)` | 成功返回完整 `https://claude.ai/epitaxy/<id>` |

Apple SDK `AXAttributeConstants.h` 将 `kAXURLAttribute` 的值定义为 **CFURLRef**，并非 CFString。原生读取保留了对象类型，显式转换为字符串后可供 URL 解析。这与 [Apple 的 AX 属性读取接口](https://developer.apple.com/documentation/applicationservices/1462085-axuielementcopyattributevalue)和 [AXURL 定义](https://developer.apple.com/documentation/applicationservices/kaxurlattribute)一致。System Events 的具体内部序列化故障点未反编译；不能把此观察推广为所有 macOS 版本上的通用缺陷。

本轮通过 Raycast 开发命令发起只读探针，并用 CUA 确认页面：

1. 云端会话“云端验证会话”：原生 URL 为 `https://claude.ai/epitaxy/session_<observed-id>`。
2. 切换本地会话“本地验证会话”：原生 URL 改为 `https://claude.ai/epitaxy/local_<observed-id>`，另带 artifact 查询参数；ID 与 CUA 观察一致。
3. Codex 当前窗口也能读到原生 URL，但值是通用的 `app://-/index.html`，本轮未证明该 URL 含 Codex thread ID；Codex 继续可用唯一标题匹配。
4. 撤掉探针后实际执行“订阅当前会话”，正确订阅了上述本地会话；数据库对应 CLI UUID 的 subscribed 变为 1，验证后恢复为原值 0。

产品实现采用 JXA 的 Objective-C bridge 调用系统 Accessibility API，无需注入 Claude、开启调试端口、读取进程内存或重启应用。只读取聚焦窗口的文档身份，不遍历对话文本；跳过 Electron shell，遇到外层会话文档后停止，避免读到嵌套 artifact 的 URL。若原生返回没有聚焦窗口，不使用后台窗口替代。桥接失败才保留旧脚本作为降级路径。

### bridge ID 与磁盘状态的补充证据

复用上述相同 ASAR 和父 Evidence。以下为同摘要提取模块的字符偏移，属于静态观察：

- `index.chunk-C3r2jk0E.js`：`FC(e,t)`（532499）去重追加 `bridgeSessionIds`；Remote Control 绑定（1188872）写入别名后保存会话；查询（1156879）同时匹配当前 bridge ID 和历史别名。
- `index.chunk-BReS2dO4.js`：643681 序列化该字段，654772 反序列化；637695 的 `eN()` 接受历史字符串或字符串数组。SHA-256：`9d5d663e167752a62bca6fc7c0a202155ad7bbd4ab1a0d6915fcf55bd0a7be73`。
- `index.chunk-FTKVAEYG.js`：1603/1658 通过去掉 `^(?:cse|session)_` 比较 bridge ID。SHA-256：`a4d9488e888ef9bf1450ca2f904c834b642b3f377e6ade8677845908eccfc24d`。
- 本次扫描 103 个本地 metadata 中，13 个有 `bridgeSessionIds`。新增 reader 只保留符合格式的 ID，兼容旧字符串；多记录冲突拒绝猜测。上述云端 ID 不在这些本地别名中：能读出云端当前 ID，不等于存在本地 Hook 状态或 CLI UUID 映射。

另外确认：

- 主模块 `WYr`（3970541）把当前 Code ID 存入内存变量 `aG`，`GYr`（3970621）读取；`index.chunk-eK2Jivcc.js`（82009）的 `setFocusedSession` IPC 调用这个 setter。该模块 SHA-256：`39e68df33a4c7cb4b3f7ab115bd577d1dca193f149cb3da9a63d644a805f609e`。非同文档主导航会清空变量；这里没有观察到持久化动作。
- `lastFocusedAt` 不代表当前焦点：C3r2jk0E 的 visibility true 写它，false 不清空；fork、unarchive 也会更新时间。`window-state.json` 对应实现保存几何位置和窗口状态，没有会话 ID。对少数配置文件白名单字段的检查不是对所有 Chromium 存储的穷尽搜索。

因此采用原生 AXURL 是实现选择；内存 setter 和磁盘字段仅作交叉验证，不进入运行时读取链路。
