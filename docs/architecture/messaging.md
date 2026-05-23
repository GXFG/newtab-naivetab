# SW / CS / NewTab 消息架构

本文档描述 NaiveTab 扩展中 Service Worker (SW)、Content Script (CS) 和 NewTab 页面三者的消息通信架构。

## 架构概览

```
┌─────────────────────────────────────────────────────────────────┐
│                     Service Worker (background/)                  │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  config/     │  │  config/     │  │  commands/            │  │
│  │  cache       │  │  init-guard  │  │  registry             │  │
│  │ (keyboard +  │  │ (启动编排     │  │ (47+ SW commands)     │  │
│  │  command)    │  │  三配置        │  │  execSwCommand        │  │
│  │  缓存加载)    │  │  等待         │  │  函数指针分发         │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬───────────┘  │
│         │                 │                       │              │
│         ▼                 ▼                       ▼              │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │     chrome.runtime.onConnect (Port) — 主力路径            │   │
│  │     name='naivetab-shortcut'                              │   │
│  │     - 冷启动消息队列 (pendingMessages)                     │   │
│  │     - 初始化后批量处理 + 回传 INIT_COMPLETE                │   │
│  └───────────────────────┬──────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │     chrome.runtime.onMessage — 兜底路径                   │   │
│  │     Port 不可用时 CS 通过 sendMessage 唤醒 SW              │   │
│  └───────────────────────┬──────────────────────────────────┘   │
└──────────────────────────┼──────────────────────────────────────┘
                           │
              ┌────────────┴────────────┐
              ▼                         ▼
┌──────────────────────┐    ┌──────────────────────────┐
│  Content Script       │    │  NewTab Page             │
│  (<all_urls> 所有页面)  │    │  (chrome-extension://)   │
│                      │    │  • task/ keydownTaskMap  │
│  • scroll.ts: 滚动    │    │  • globalShortcutTask    │
│  • 三层 fallback      │    │    (命令, shortcut-exec) │
│    1. Port postMessage│    │  • keyboardTask          │
│    2. sendMessage 唤醒│    │    (书签, kbBookmark)     │
│    3. 本地 keymap     │    │  • getSharedPort() 单例   │
│                      │    │  • Port 唯一路径          │
│                      │    │    (无 sendMessage 降级)  │
│                      │    │  • 冷启动 toast 提示      │
│                      │    │                          │
└──────────────────────┘    └──────────────────────────┘
```

## 三者角色

### Service Worker (background/)

**职责**：消息中枢 + 命令执行

| 组件 | 文件 | 说明 |
|------|------|------|
| `main.ts` | `background/main.ts` | SW 入口：启动编排、Port 管理注册、CS 重新注入（胶水层） |
| `messaging/port-manager.ts` | `background/messaging/port-manager.ts` | Port 连接生命周期、消息队列、`onMessage` 兜底、CS 重新注入 |
| `messaging/toast.ts` | `background/messaging/toast.ts` | 层切换 toast 通知（统一通过 Port 下发） |
| `commands/registry.ts` | `background/commands/registry.ts` | SW 命令注册表（命令定义 + Record 映射分发），`execSwCommand` 通过 Record 映射分发 |
| `commands/handlers.ts` | `background/commands/handlers.ts` | 可复用的组合命令实现（标签切换、批量关闭、标签组操作等） |
| `config/cache.ts` | `background/config/cache.ts` | 配置缓存加载与更新，`onChanged` 自动刷新内存缓存 |
| `config/init-guard.ts` | `background/config/init-guard.ts` | 启动编排：等待三配置加载完成，暴露 `isInitialized` 守卫（10s 超时兜底） |

**启动流程**：
1. `waitInitialized()` 加载 keyboard + command 配置（由 `init-guard.ts` 编排，10s 超时兜底）
2. 监听 `onConnect` 处理 Port 连接
3. 监听 `onMessage` 处理 CS 兜底消息（Port 不可用时唤醒休眠的 SW）

Content Script 通过 manifest 静态声明，浏览器在页面加载时自动注入，不依赖 SW 启动。

**模块拆分**：`main.ts` 是胶水层，专注启动编排；`commands/registry.ts` 专注 SW 命令实现与分发。
每个命令定义为独立命名函数，通过 `Record<TSwCommandName, CommandHandler>` 做 O(1) 分发，
按功能分为 4 组（Tab 操作 / 窗口操作 / 会话与去重 / 标签组）。
部分 handler 是 async（如 `closeWindow`），`execSwCommand` 统一捕获未处理的 Promise 拒绝，
确保 async 异常不会泄漏到全局 unhandledrejection。

### Content Script (contentScripts/)

**职责**：按键采集 + DOM 命令执行

- 注入范围：`<all_urls>` 所有页面（包括 http/https/file/about:blank），不注入 `chrome-extension://` 等扩展内部页面
- 注入时机：`document_start`（浏览器自动注入，不依赖 SW 启动）
- 注入 scope：仅顶层 frame（`allFrames: false`，详见 [iframe 决策](#iframe-支持决策)）
- 直接读取 `chrome.storage.sync` 获取初始配置（~5-20ms）
- 通过 `chrome.storage.onChanged` 实时同步配置更新

**模块结构**：
- `index.ts`：初始化入口、配置加载与监听、Port 连接管理、按键分发、命令执行器
- `scroll.ts`：滚动容器查找（`findScrollContainer`）、缓存失效、平滑滚动（`fastSmoothScrollTo`）
- `toast.ts`：轻量提示组件

**三层 fallback 机制（按优先级）：**
1. **Port postMessage** → 正常连接时最低延迟
2. **chrome.runtime.sendMessage** → Port 不可用时唤醒休眠的 SW（~50-200ms）
3. **本地 keymap** → 书签快捷键专属 fallback，零延迟直接打开 URL（不依赖 SW）

### NewTab Page (newtab/)

**职责**：扩展新标签页的快捷键响应 + 层切换 toast

- `task/` 的 `keydownTaskMap` 注册各模块的按键处理
- `globalShortcutTask`（`shortcut-executor.ts`）：命令快捷键 task，仅处理命令
- `keyboardTask`（`keyboardBookmark/index.vue`）：书签快捷键 task，命令优先兜底
- 通过 `getSharedPort()` 共享 Port 发送按键到 SW，**只有 Port 一条路径，不使用 sendMessage 降级**
  - Port 断连后指数退避自动重连（100ms~1000ms），窗口期极短
  - `connect()` 调用本身会唤醒休眠的 SW
- Port onMessage 监听还处理层切换 toast（`MSG_SWITCH_BOOKMARK_LAYER`），用 `showToast` 显示
- SW 未就绪时书签和命令快捷键都会弹出 toast 提示「扩展正在初始化，请稍后再试」

## 消息类型

详见 [src/types/messages.ts](../../types/messages.ts)

| 方向 | 消息类型 | 接口 | 用途 |
|------|---------|------|------|
| CS/NewTab → SW | `NAIVETAB_KEYDOWN` | `CsToSwKeydownMessage` | 按键事件（`key` + `source`） |
| CS/NewTab → SW | `NAIVETAB_HELLO` | `CsToSwHello` | 握手/状态确认 |
| SW → CS/NewTab | `NAIVETAB_INIT_COMPLETE` | `SwToCsInitComplete` | SW 初始化完成 |
| SW → CS/NewTab | `NAIVETAB_EXECUTE_COMMAND` | `SwToCsExecuteCommand` | 回传需要 DOM 执行的命令 |
| SW → CS/NewTab | `NAIVETAB_SWITCH_BOOKMARK_LAYER` | `SwToCsSwitchBookmarkLayer` | 层切换 toast 通知（通过 Port 发送到 CS 和 NewTab，各自使用合适方式显示） |

## Port 长连接

### 为什么用 Port 而非 sendMessage

`chrome.runtime.sendMessage` 每次调用都会触发 SW 唤醒，对于高频按键场景有明显延迟。Port 长连接保持持久通信通道，消除冷启动延迟。

**但 Port 不是唯一的**：Chrome 116+ 后开放 Port 不再阻止 SW 休眠，Port 断连到重连之间有窗口期。CS 在 Port 不可用时降级为 `chrome.runtime.sendMessage`，确保 SW 被唤醒处理命令。

### 消息接收双路径

```
CS 按键事件
    │
    ├─ 优先 ─→ Port postMessage ─→ SW onConnect handler（最低延迟）
    │
    └─ 兜底 ─→ chrome.runtime.sendMessage ─→ SW onMessage handler（唤醒休眠 SW）
              ↑
              触发条件：Port 不可用 || swReady === false
```

### 连接生命周期

```
CS/NewTab: chrome.runtime.connect({ name: 'naivetab-shortcut' })
    ↓
SW: onConnect → portMap.set(tabId, port)
    ↓
    ├── 冷启动路径（!isInitialized）：
    │   ├── 注册暂存 listener（命名箭头函数）
    │   ├── waitInitialized() resolve 后：
    │   │   ├── 批量处理积压消息
    │   │   ├── removeListener 暂存 handler
    │   │   ├── addListener 正常 handler
    │   │   └── postMessage INIT_COMPLETE
    │
    └── 正常路径（isInitialized）：
        ├── 立即 postMessage INIT_COMPLETE
        └── 注册正常 listener（含 HELLO 握手处理）
```

### 共享 Port 机制

书签快捷键和命令快捷键**共用同一个 Port**（`name='naivetab-shortcut'`），避免两个独立 Port 连接到 SW 时，SW 的 `portMap[tabId]` 被后连接的覆盖。

共享 Port 管理：`src/logic/shortcut/port.ts` 的 `getSharedPort()` 单例。

### 重连策略

- 初始延迟：100ms
- 指数退避：`delay = Math.min(delay * 2, 1000)`
- 上限：1000ms
- BFCache 恢复：监听 `window.pageshow` 事件，`event.persisted === true` 且 Port 未连接时自动重连，避免导航返回后 Port 断线

### BFCache 恢复（CS 端）

浏览器后退/前进缓存（BFCache）恢复页面时，JS 环境完整保留（不重新加载），但 Port 连接已在导航时断开。CS 通过以下机制恢复：

```ts
window.addEventListener('pageshow', (event) => {
  if (event.persisted && !port) {
    connectPort()
  }
})
```

`pageshow` 事件在页面从 BFCache 恢复时触发，`event.persisted` 为 `true` 表示来自缓存而非新加载。

## 命令执行路由

命令按执行环境分为两类：

### SW 命令（execIn: 'sw'）

大部分 tab 操作命令，由 SW 直接调用 `chrome.tabs.*` API 执行。命令实现集中在 `src/background/commands/registry.ts`，采用命令注册表模式：每个命令定义为独立的命名函数，通过 `Record<TSwCommandName, CommandHandler>` 映射分发，按功能分为 4 组（Tab 操作 / 窗口操作 / 会话与去重 / 标签组）。相比原始 switch 方案的优势：
- TS 类型约束自动检查遗漏（缺少属性编译报错）
- 新增命令只需添加函数 + 注册项，不膨胀 `main.ts`
- 函数名即命令名，grep 定位更快

### CS 命令（execIn: 'cs'）

需要 DOM 操作的命令，由 SW 通过 Port 回传 `NAIVETAB_EXECUTE_COMMAND` 消息，CS/NewTab 各自执行。

| 命令 | 说明 |
|------|------|
| `scrollUp` / `scrollDown` | 页面微步滚动 |
| `scrollToTop` / `scrollToBottom` | 滚动到顶部/底部 |
| `scrollPageUp` / `scrollPageDown` | 按页滚动 |
| `scrollLeft` / `scrollRight` | 水平微步滚动 |
| `scrollToLeft` / `scrollToRight` | 水平滚动到边缘 |
| `reloadPage` | 刷新页面 |
| `copyPageUrl` / `copyPageTitle` | 复制 URL/标题 |

命令单一数据源：`src/logic/shortcut/shortcut-command.ts` 的 `COMMAND_CATEGORIES`，只有 CS 命令需要显式标注 `execEnv: 'cs'`，其余默认 `'sw'`。

## MV3 Service Worker 休眠机制

### Chrome 116+ 关键变更

Chrome 116 之前，开放 Port 可以阻止 SW 休眠。Chrome 116+ 后此行为被移除——**Port 存活不再被视为 SW 的活跃信号**。

| 行为 | 是否重置 30s 计时器 |
|------|---------------------|
| 新 Port 连接（`onConnect`） | ✅ |
| `chrome.runtime.onMessage` | ✅ |
| **开放 Port 上收到消息** | ❌ |
| SW 侧 `port.postMessage()` | ❌ |
| `chrome.alarms.onAlarm` | ✅ |
| `chrome.storage.onChanged` | ✅ |
| `chrome.tabs.onUpdated` 等 Chrome 事件 | ✅ |
| 正在执行的 Promise/微任务 | ✅ |

### 终止时无通知

Chrome **不会**在终止 SW 前触发任何事件：
- 所有内存状态丢失（`portMap`、缓存变量）
- 进行中的 Promise 可能被遗弃（不 resolve 也不 reject）
- 只有通过 `chrome.storage` / IndexedDB 持久化的数据幸存

### NaiveTab 的应对策略

**不主动保活，接受 SW 休眠的事实。** 通过三层防线确保用户体验：

1. **Port 长连接**（主力路径）— SW 活跃时最低延迟
2. **sendMessage 兜底**（降级路径）— Port 不可用时唤醒 SW
3. **本地 keymap fallback**（书签专属）— 零延迟不依赖 SW

**为什么不心跳保活？**

- `chrome.alarms` 会永久保持 SW 活跃，增加内存占用
- Chrome 官方文档不推荐滥用保活
- 现有 fallback 机制已经足够健壮

## 冷启动容错

### CS 端

当 `swReady === false` 时，书签快捷键通过本地 keymap fallback 零延迟打开 URL；命令快捷键不拦截按键（`sent` 保持 `false`），事件继续传递给浏览器默认行为。

### NewTab 端

NewTab 端**无本地 fallback**，完全依赖 Port 连接。但书签和命令快捷键在 SW 未就绪时都会弹出 toast 提示「扩展正在初始化，请稍后再试」。

### SW 端

SW 通过 `pendingMessages` 暂存冷启动期间的按键消息，配置加载完成后批量处理。冷启动路径使用命名箭头函数 + `removeListener`/`addListener` 显式切换 listener，避免双 listener 共存。

## Content Script 注入机制

### 静态 manifest 声明

Content Script 采用 manifest 静态声明（`src/manifest.ts` `content_scripts` 字段），浏览器在页面加载时自动注入。

**匹配规则：**
- URL: `<all_urls>`（所有页面，包括 http/https/file/about:blank 等）
- `runAt: 'document_start'`（DOM 构建前注入，确保在页面脚本之前拦截按键）
- `allFrames: false`（仅注入顶层 frame，不注入 iframe，见下方 [iframe 决策](#iframe-支持决策)）

### iframe 支持决策

**当前选择不支持 iframe（`allFrames: false`）。**

快捷键（标签切换、页面刷新、书签打开）都是针对顶层页面的操作，iframe 中不需要响应快捷键。常见 iframe 场景：

| 场景 | 是否需要快捷键 |
|------|----------------|
| 第三方嵌入（YouTube 视频、地图） | ❌ 用户不与 iframe 交互 |
| 支付/登录（Stripe、OAuth） | ❌ 安全沙箱，快捷键不应干扰 |
| 广告 iframe | ❌ 不需要 |

如果启用 `allFrames: true`，每个 iframe 都会注入 CS 实例、建立 Port 连接、解析 gzip 配置。一个页面有 5 个 iframe 就是 5 倍资源消耗，却没有实际用户收益。此外还可能引发多 frame 同时发送 keydown 导致的按键重复执行问题。

Vimium C（200 万用户）支持 `all_frames: true` 是因为它的 **link hints** 功能需要跨 frame 渲染标记点，必须注入所有 frame。NaiveTab 没有跨 frame 需求，不需要引入同等复杂度的架构（`vApi` 协调、MAIN world 拦截、frame 间 keymap 继承等）。

### 设计选择

参考 Vimium C（200 万用户验证）的注册策略：

| 方案 | NaiveTab 选择 | 理由 |
|------|---------------|------|
| 静态 manifest | ✅ 主力注册方式 | 注入时机更早，浏览器自动注入，不依赖 SW |
| 动态 `registerContentScripts` | ❌ 不使用 | 快捷键是常驻功能，不需要运行时控制注入 |

动态注册的唯一优势（运行时注销）对 NaiveTab 无意义，因为 CS 内部已有 `isEnabled` 状态守卫，快捷键被禁用时不会响应按键。

### CS 防重入

CS 内部有 `window.__naivetabGlobalShortcutInit` 守卫，即使浏览器异常重复注入也不会重复执行初始化逻辑。

### 扩展重载后 CS 重新注入

静态 manifest 仅在**页面加载时**注入 CS。以下场景中已有页面的 CS 环境会被 Chrome 移除且不会自动恢复：

| 场景 | CS 是否被移除 | 静态注入是否覆盖 |
|------|:---:|:---:|
| 扩展重载 / 更新 | ✅ 是 | ❌ 否 |
| 首次安装 | ✅ 是 | ❌ 否 |
| 浏览器重启 | ✅ 是 | ❌ 否 |
| 扩展禁用后启用 | ✅ 是 | ❌ 否 |
| SW 休眠唤醒 | ❌ 否 | N/A |
| 页面导航 / 刷新 | N/A | ✅ 是 |

`src/background/main.ts` 中 `waitInitialized()` 和 `reinjectContentScripts()` 并发执行：

```
SW 加载（同步阶段，< 1ms）:
  waitInitialized()         → 启动 async 任务（不阻塞）
  reinjectContentScripts()  → 启动 async 任务（不阻塞）
  onConnect / onMessage     → listener 注册完成 ✓

异步执行（后台并发）:
  waitInitialized()         → ~50ms 后 isInitialized = true
  reinjectContentScripts()  → ~100ms 后完成注入
    ↓
  chrome.tabs.query({}) 获取所有 tab（不限 URL 协议，覆盖 file://、about:blank 等）
    ↓
  过滤无 URL 的 tab
    ↓
  串行调用 chrome.scripting.executeScript() 逐个注入 dist/contentScripts/index.global.js
    ↓
  注入失败（chrome:// 受限页面、tab 已关闭等）静默忽略，try/catch 统一处理
```

> **为什么不 await waitInitialized() 后再注入？**
> SW 的所有 listener（onConnect、onMessage）在同步模块加载阶段就已注册完成，
> 远快于任何 CS 连接请求。即使 reinject 注入的 CS 在 waitInitialized() 完成前
> 建立 Port，也会走 pendingMessages 路径被正确处理。改为顺序执行只是延后 ~50ms，
> 无实际收益，且并发语义更清晰：SW 启动后"同时"完成配置加载和 CS 恢复。

**注入策略决策：**

| 决策 | 选择 | 理由 |
|------|------|------|
| `chrome.tabs.query({})` vs `query({ url: ['*://*/*'] })` | `{}` 查询所有 tab | `*://*/*` 会遗漏 `file://` 和 `about:blank`，让 try/catch 处理不可注入的场景 |
| 前置过滤 `chrome://` 等受限页面 | 不需要 | `executeScript` 对受限页面会抛异常，try/catch 已处理，前置过滤无实质收益 |
| 并发 vs 串行 | 串行 for 循环 | 大量 tab 时 `Promise.all` 可能导致浏览器短暂卡顿，串行更温和 |
| 注入失败处理 | 静默忽略 | 受限页面注入失败是预期的，不记录日志避免噪声 |

CS 内部的 `window.__naivetabGlobalShortcutInit` 守卫确保已正常注入的页面不会被重复执行：
- 静态注入已生效的页面 → 守卫拦截，跳过
- 已被移除的页面 → 守卫为空，正常注入
- 新加载的页面 → 由 manifest 静态注入处理，不受此函数影响

## 快捷键冲突防护

### CS 端（有防护）

`contentScripts/index.ts` 有 `hasModifierConflict` 机制：当书签和命令使用相同修饰键或同时开启无修饰键模式时，命令优先（只发送命令消息，书签被跳过）。

### NewTab 端（任务注册顺序保证命令优先）

书签和命令快捷键分属两个 task：`globalShortcutTask`（`shortcut-executor.ts`，处理命令）和 `keyboardTask`（`keyboardBookmark/index.vue`，处理书签）。`globalShortcutTask` 在 App.vue script setup 顶层同步注册，先于 `keyboardTask` 执行。命令匹配成功时返回 `true` 阻断后续 task，书签作为兜底处理。

## 架构决策：CS 各自解析 vs SW 广播

`chrome.storage.onChanged` 同时触发所有上下文，CS 和 SW 各自独立解析 gzip 数据：

```
chrome.storage.onChanged（所有 tab 同时触发）
    ├── SW: parseStoredData() → 更新缓存
    ├── CS Tab1: parseStoredData() → 更新本地 keymap
    ├── CS Tab2: parseStoredData() → 更新本地 keymap
    └── ...N 个 tab
```

### 为什么不采用 "SW 解析 + Port 广播给 CS"？

曾被误判为优化方向（参考 Vimium C 的 `newSettingsToBroadcast_` 批量广播），但实际分析后确认**不可取**：

| 维度 | 说明 |
|------|------|
| **gzip 解压极快** | 10KB 配置解压约 1~3ms，N 个 tab 合计 < 30ms 总 CPU 时间，分布在不同进程中，用户完全无感知 |
| **postMessage 有等价开销** | `JSON.stringify` → IPC 传输 → `JSON.parse` 的开销与 gzip 解压在同一量级，不是"把活移走就省了" |
| **没有延迟优势** | `chrome.storage.onChanged` 对所有上下文同时触发，谁来解析结果都一样，总延迟由 storage onChanged 决定 |
| **增加了耦合** | SW 需要遍历 portMap 广播，CS 需要处理新消息类型，单点故障风险上升 |
| **丧失本地 fallback** | CS 独立持有 keymap 是书签快捷键本地 fallback 的前提。集中到 SW 后 SW 休眠时 CS 无法响应 |

### 结论

CS 各自独立解析 gzip 配置是**正确的设计选择**，不是性能瓶颈。未来不应再尝试将解析工作集中到 SW 并通过 Port 广播分发。

如果想减少"设置面板修改 → 各 tab 生效"的感知延迟，瓶颈在 `useStorageLocal` 的 800ms debounce，而非 gzip 解析。可考虑：
- 缩短 debounce（800ms → 200ms）
- 通过 Port 直接转发配置变更，跳过 debounce 路径（改动量更大，收益有限）

## 已知风险

1. **CS 端命令快捷键 SW 未就绪时有延迟** — SW 冷启动期间，命令快捷键通过 `chrome.runtime.sendMessage` 唤醒 SW 处理，有 ~50-200ms 延迟。书签快捷键额外有本地 keymap fallback 可零延迟响应。
2. **`reinjectContentScripts` 注入延迟** — 大量 tab 时串行注入需要时间，但函数异步执行不阻塞 SW 启动。已打开页面的快捷键恢复有短暂延迟（注入 + Port 连接 + INIT_COMPLETE）。
