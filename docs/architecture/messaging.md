# SW / CS / NewTab 消息架构

三个执行上下文之间只有两条通道：Port 长连接（主力）和 `runtime.sendMessage`（兜底）。本文写投递路径与各自的容错边界；消息字段与类型以 `src/types/messages.ts` 为准，本文不复述。

## 架构概览

```
                    Service Worker (background/)
        config/cache · config/init-guard · commands/registry
                             │
        ┌────────────────────┴────────────────────┐
        │  onConnect  → Port（主力路径）            │
        │   冷启动：暂存 → 批量处理 → INIT_COMPLETE │
        ├─────────────────────────────────────────┤
        │  onMessage  → 兜底路径（唤醒休眠 SW）      │
        └────────────────────┬────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              ▼                             ▼
    Content Script (<all_urls>)      NewTab Page
    按键采集 + DOM 命令执行           快捷键响应 + 提示
    三层 fallback                    仅 Port（无降级）
```

## 三层投递路径

| 优先级 | 通道 | 触发条件 | 代价 |
|--------|------|----------|------|
| 1 | Port `postMessage` | 正常连接 | 最低延迟 |
| 2 | `runtime.sendMessage` | Port 不可用 或 `swReady === false` | 50–200ms（需唤醒 SW） |
| 3 | 本地 keymap | 书签快捷键专属 | 0ms，完全不依赖 SW |

第 3 层是 CS 独立持有 keymap 的直接原因，也是 [ADR 0002](../decisions/0002-cs-parses-config-locally.md) 否决「SW 解析后广播」的关键理由。

## 三者职责

**Service Worker** — 消息中枢 + 命令执行。启动编排与内部模块见 [background-modules.md](background-modules.md)。

**Content Script** — 按键采集 + DOM 命令执行。
- 注入范围 `<all_urls>`（http/https/file/about:blank），不注入扩展内部页面；`document_start`；仅顶层 frame。
- 启动时直接读 `chrome.storage.sync` 拿初始配置（~5–20ms），并靠 `onChanged` 实时更新，不等 SW。
- 模块：`index.ts`（初始化、Port、按键分发、命令执行）、`scroll.ts`（滚动容器与平滑滚动）、`toast.ts`（轻量提示）。

**NewTab Page** — 快捷键响应 + 层切换提示。
- 按键处理挂在 `task/` 的 `keydownTaskMap`，命令 task 与书签 task 各一个。
- 通过 `getSharedPort()` 走 Port，**没有 sendMessage 降级**：SW 未就绪时弹 toast 告知，而不是加一条更慢的路（见 [ADR 0001](../decisions/0001-port-over-sendmessage.md)）。

## Port 生命周期

```
connect({ name: 'naivetab-shortcut' })
  → SW onConnect → portMap.set(tabId, port)
      ├ 冷启动（!isInitialized）：注册暂存 listener
      │    waitInitialized() resolve → 批量处理积压 → 换正常 listener → INIT_COMPLETE
      └ 正常路径：立即 INIT_COMPLETE → 注册正常 listener（含 HELLO 握手）
```

**共享一个 Port**：书签与命令快捷键共用 `name='naivetab-shortcut'` 的连接。若各开一条，`portMap[tabId]` 会被后连的覆盖，先连那条的消息就丢了。

**重连**：初始 100ms，`delay = min(delay * 2, 1000)`，上限 1000ms。BFCache 恢复（`pageshow` 且 `event.persisted === true`）时页面 JS 环境还在但 Port 已断，必须主动重连——漏掉这条，用户后退回来快捷键就静默失效。

## 冷启动容错

| 端 | 行为 |
|----|------|
| CS | `swReady === false` 时，书签与命令都走 `sendMessage` 唤醒 SW。命令发送成功即拦截按键；书签的本地打开分支在内容脚本里不可用（见 [ADR 0006](../decisions/0006-shortcut-split-execution-paths.md)），实际靠 `sendMessage` 生效，且会因抛错导致该次按键没被 `preventDefault` |
| NewTab | 无本地 fallback，完全依赖 Port；SW 未就绪时弹 toast「扩展正在初始化」 |
| SW | `pendingMessages` 暂存冷启动期间的按键，配置就绪后批量处理。换 listener 用「命名箭头函数 + removeListener + addListener」，避免双 listener 并存 |

## 命令执行路由

命令按执行环境分两类，单一数据源是 `COMMAND_CATEGORIES`：

- **`execEnv: 'sw'`**（默认）：SW 直接调 `chrome.tabs.*` 等 API。绝大多数标签页、窗口、标签组命令属于这一类。
- **`execEnv: 'cs'`**：需要 DOM，SW 通过 Port 回传 `NAIVETAB_EXECUTE_COMMAND`，CS / NewTab 各自执行。目前只有滚动、刷新页面、复制 URL / 标题这类命令需要显式标注。

只有 CS 命令需要在定义处写 `execEnv: 'cs'`，其余省略即 `sw`。完整清单见 `src/logic/shortcut/shortcut-command.ts`。

## Content Script 注入与重注入

静态 manifest 声明（`src/manifest.ts` 的 `content_scripts`），浏览器在页面加载时自动注入，不依赖 SW 启动。不动态 `registerContentScripts`：快捷键是常驻功能，运行时注销没有意义，CS 内部已有 `isEnabled` 守卫。

只注入顶层 frame，理由见 [ADR 0003](../decisions/0003-top-frame-only-injection.md)。

**为什么需要重新注入**：静态注入只在页面加载时发生。扩展重载 / 更新、首次安装、浏览器重启、禁用后重新启用这四种情况下，已有页面的 CS 环境会被 Chrome 移除且不会自动恢复；只有页面导航 / 刷新才会重新触发静态注入。所以 SW 启动时要把 CS 补回已有页面。

`reinjectContentScripts()` 与 `waitInitialized()` 并发执行，不 await 后者——listener 在同步加载阶段已就绪，先注入的 CS 连上来会走 `pendingMessages` 正常处理（详见 [background-modules.md](background-modules.md#启动流程)）。

CS 内部用 `window.__naivetabGlobalShortcutInit` 守卫防止重复初始化：已注入的页面被拦下，被移除的页面守卫为空、正常注入。

## 快捷键冲突防护

**CS 端**：`hasModifierConflict` 判断——书签与命令用了相同修饰键、或都开了无修饰键模式时，命令优先，只发命令消息。

**NewTab 端**：靠显式优先级，不靠注册顺序。命令 task `priority = 0`、书签 task `priority = 10`（`task/keydown.ts` 按优先级排序）。命令匹配成功返回 `true` 阻断后续 task，书签作为兜底。
> 早期实现依赖「顶层注册早于子组件 setup」的隐式顺序，该机制已废弃。新增 task 时请显式声明 `priority`。

## 已知风险

1. **SW 冷启动期间的命令延迟**：CS 侧命令快捷键要 `sendMessage` 唤醒 SW，约 50–200ms。书签并不例外——它的"本地打开"在内容脚本里不可用，同样要等 SW（[ADR 0006](../decisions/0006-shortcut-split-execution-paths.md)）。
2. **重注入有延迟**：大量 tab 时串行注入需要时间，函数本身异步不阻塞 SW 启动，但已打开页面的快捷键恢复会滞后（注入 + 连 Port + INIT_COMPLETE）。

## 相关决策

[0001 Port 长连接](../decisions/0001-port-over-sendmessage.md) · [0002 CS 各自解析配置](../decisions/0002-cs-parses-config-locally.md) · [0003 只注入顶层 frame](../decisions/0003-top-frame-only-injection.md)
