# 快捷指令（全局命令快捷键）

## 概述

首先明确定义以及命名：
- **全局书签快捷键**：修饰键+Key → 打开书签 URL，已迁移至 Port 架构
- **全局命令快捷键**：修饰键+Key → 执行浏览器命令（标签页管理、页面控制等）
- **无修饰键模式**（`noModifierMode`）：开启后只需按单个主键即可触发，无需修饰键（见下方「无修饰键模式」章节）
- 二者通用的逻辑的命名前缀为 `globalShortcut` 或 `global-shortcut`，视具体情况
- 配置存储字段名：`keyboardCommand`（localStorage key: `c-keyboardCommand`）
- 面向用户名称：「快捷指令」（代码内部命名保持 `keyboardCommand`）

两套快捷键共享 Port 通道，使用不同的修饰键和独立的 keymap 存储，在 SW 端通过 `source` 字段区分处理。

---

## 架构设计

### 数据流

```
┌───────────────────────────────────────────────────────────────┐
│  Content Script (*://*/* 页面)                                 │
│                                                               │
│  keydown → 书签修饰键匹配 → hasModifierConflict 检测            │
│  keydown → 命令修饰键匹配 → 冲突时命令优先                      │
│  冲突时（同修饰键 或 同时开 noModifierMode）：仅发命令消息       │
│                                                               │
│  scroll 命令本地执行优化（首次按下 + e.repeat 均直接执行）：     │
│  - matchShortcut 匹配到 scroll → tryLocalScroll() 直接执行     │
│  - e.repeat 时绕过 matchShortcut，从 keymap 读取并执行          │
│  - 无需经 SW 中转（scroll 是纯 DOM 操作，零延迟）               │
│                                                               │
│  接收 SW 回传的 DOM 命令并执行（双向通信）：                     │
│  port.onMessage → {type:'NAIVETAB_EXECUTE_COMMAND',command}   │
│  → commandExecutors[command]()                                 │
│  - reloadPage → location.reload()                             │
│  - copyPageUrl/Title → navigator.clipboard.writeText()        │
│  - newtab 类命令：静默忽略（CS 无 localConfig）                │
│  ─────────────────────────────────────────                     │
│  Port 长连接 (chrome.runtime.connect, name='naivetab-shortcut')│
│  - 双向通信: CS→SW 发送按键, SW→CS 回传命令                     │
│  - 保持 SW 活跃，消除快捷键冷启动延迟                           │
│  - 连接断开指数退避自动重连                                     │
└──────────────────────────┬────────────────────────────────────┘
                           │ Port 消息 (双向)
                           ▼
┌───────────────────────────────────────────────────────────────┐
│  newtab 页面 (chrome-extension://)                             │
│                                                               │
│  task/keydown.ts → 多个 keydown task 依次执行              │
│                                                               │
│  ① globalShortcutTask（命令快捷键）：                            │
│     - 仅匹配命令快捷键，通过 matchShortcut 统一匹配               │
│     - execEnv='newtab': 直接本地执行（不走 SW）                 │
│       * toggleFocusMode → localState.isFocusMode 切换          │
│       * toggleDragMode → toggleIsDragMode()                    │
│       * toggleSettingDrawer → switchSettingDrawerVisible()     │
│     - 匹配成功：Port.postMessage({key, source:'command'})       │
│     - 匹配失败：返回 false，交由 keyboardTask 处理书签            │
│     - 接收 SW 回传的 CS 命令（与 CS 共享 Port，复用执行器）      │
│                                                               │
│  ② keyboardBookmark keydown task（书签快捷键）：                 │
│     - 作为命令的兜底，通过 matchShortcut 统一匹配书签             │
│     - 自动处理 isInInputElement、urlBlacklist、e.repeat         │
│     - 限定当前 layout 可见按键，匹配后打开书签 URL               │
│     - 命令优先：globalShortcutTask 先注册先执行，返回 true 阻断   │
└──────────────────────────┬────────────────────────────────────┘
                           │ Port 消息 (双向)
                           ▼
┌───────────────────────────────────────────────────────────────┐
│  Service Worker                                                │
│                                                               │
│  1. 维护 portMap: tabId → Port                                │
│  2. 缓存两套配置: keyboardBookmark + keyboardCommand           │
│  3. 接收消息，按 source 路由：                                 │
│     - source='bookmark': 校验 isEnabled → 查 bookmark keymap  │
│                        → chrome.tabs.create(URL)              │
│     - source='command': 校验 isEnabled → 查 command keymap    │
│                        → execIn='sw': SW 直接执行              │
│                        → execIn='cs': portMap[tabId].postMsg  │
│                        → execIn='newtab': 静默忽略             │
│  4. 命令执行：                                                 │
│     - SW 命令（chrome.tabs.*）：SW 直接执行，不依赖 CS          │
│     - CS 命令（DOM 操作）：回传到发起按键的 tab 执行             │
│     - newtab 命令（localConfig 操作）：newtab 本地执行，SW 不处理│
│  5. source 校验：只允许 'bookmark' 或 'command'                │
└───────────────────────────────────────────────────────────────┘
```

### 为什么使用 Port 长连接

| 方案 | SW 冷启动 | 内存占用 | 代码复杂度 | 扩展性 |
|------|-----------|----------|------------|--------|
| 纯 CS 本地匹配 | ✅ 无需冷启动 | 极低 | 低 | ❌ 无法执行 chrome.tabs API |
| sendMessage 每次请求 | ❌ 200-1000ms | 低 | 低 | ❌ 同上 |
| **Port 长连接** | ✅ 保持活跃 | 中 | 中 | ✅ 完整 chrome API 访问 |

由于命令需要 `chrome.tabs` API（固定标签页、复制 tab 等 CS 不可用的 API），必须将匹配和执行交给 SW。Port 长连接在正常浏览时保持 SW 活跃，消除冷启动延迟。

### 已实现状态

- [x] `globalShortcutForBookmark` 已迁移至 Port 架构（newtab 端由 keyboardTask 处理）
- [x] 命令快捷键配置定义 + SW 缓存 + 命令分发
- [x] Port 双向通信：CS → SW 发送按键，SW → CS 回传命令
- [x] CS 端命令执行器：scrollUp/Down/ToTop/ToBottom、reloadPage、copyPageUrl、copyPageTitle
- [x] scroll 命令 CS 本地执行优化（首次按下 + e.repeat 均直接在 CS 端执行，不经 SW 中转）
- [x] SW 端命令执行器：toggleTabPinned、duplicateTab、closeTab、next/prevTab 等 48+ 命令
- [x] newtab 本地命令（execEnv: 'newtab'）：不走 SW，直接在 newtab 页面执行
- [x] SW 独立校验 `isEnabled`（bookmark + command 双重校验）
- [x] CS 端命令快捷键监听（`source: 'command'` 发送路径）
- [x] newtab 端命令快捷键 task（`globalShortcutTask`，仅处理命令）
- [x] newtab 端书签快捷键 task（`keyboardTask`，由 keyboardBookmark Widget 注册，命令优先）
- [x] SW 端 `source` 字段安全校验（只允许 `'bookmark'` 或 `'command'`）
- [x] SW 端 Chrome API 调用错误处理（`.catch(logLastError)`）

---

## 命令设计

### 命令执行环境（`execEnv`）

命令按执行环境分为三类，通过 `COMMAND_CATEGORIES` 中的 `execEnv` 字段声明，默认为 `'sw'`：

| execEnv | 执行位置 | 适用场景 |
|---------|----------|----------|
| `'sw'` | Service Worker | 需要 Chrome Extension API（chrome.tabs、chrome.windows 等） |
| `'cs'` | Content Script | 需要操作页面 DOM（滚动、复制 URL 等） |
| `'newtab'` | newtab 页面本地 | 操作扩展自身状态（localConfig、globalState） |

执行环境由 `getCommandExecEnv(command)` 函数从 `COMMAND_CATEGORIES` 自动推导，不在 keymap 中冗余存储。

---

#### SW 命令（`execEnv: 'sw'`，默认）

需要 Chrome Extension API，只能在 Service Worker 中执行。

> SW 命令完整列表见 [shortcut-command.ts](src/logic/shortcut/shortcut-command.ts) 的 `COMMAND_CATEGORIES`（`windowActions`/`tabNavigation` 等分组），
> 中文名称见 [zh-CN.json](src/locales/zh-CN.json) 的 `command.*` 命名空间，
> 实现见 [handlers.ts](src/background/commands/handlers.ts) 和 [registry.ts](src/background/commands/registry.ts)。

---

#### CS 命令（`execEnv: 'cs'`）

需要操作页面 DOM，SW 收到后通过 Port 回传 `NAIVETAB_EXECUTE_COMMAND` 执行。

> CS 命令完整列表见 [shortcut-command.ts](src/logic/shortcut/shortcut-command.ts) 中 `execEnv: 'cs'` 的条目，
> 中文名称见 [zh-CN.json](src/locales/zh-CN.json) 的 `command.*` 命名空间，
> 实现见 [scroll.ts](src/contentScripts/scroll.ts) 和 CS 端命令执行器。

**优化：scroll 系列命令在 CS 端直接本地执行（`tryLocalScroll`），不经 SW 中转。**
scroll 是纯 DOM 操作，不需要 SW 的 Chrome API，本地执行可消除 Port → SW → 回传的往返延迟。

**持续滚动动画（参考 Vimium C 时间驱动模型）：**
按住 scroll key 时启动 rAF 动画循环，不依赖 OS 按键重复（`e.repeat`）。
- 首次按下 → 启动 `startContinuousScroll`，以初始速度持续滚动
- 按住不放 → 速度平滑爬升：`speed(t) = 200 + 320 × 按住秒数`，约 1.25s 达到最大 600px/s
- repeat 事件 → 仅维持持续滚动状态，加速由 rAF 内部自动计算
- keyup → 减速后自然停止（0.4 指数衰减，~5 帧缓冲滑行，约 80ms 停止）
- 全程单一 rAF 循环，无动画重叠或中断，平滑无卡顿
- 速度基于 `px/second`，通过 `performance.now()` 计算实际帧间隔，确保 60Hz/120Hz/144Hz 屏幕表现一致
- smooth scroll 持续时间使用对数缩放：`duration = max(120, min(500, 30 * ln(amount)))`

---

#### NaiveTab 控制命令（`execEnv: 'newtab'`）

由 `shortcut-executor.ts` 中 `newtabControlExecutors` 直接执行，**不经过 SW**。  
CS 侧无法执行（没有 `localConfig`），SW 收到后静默忽略。  
仅当快捷键在 newtab 页面触发时生效；普通网页触发时按键被发往 SW，SW 静默丢弃。

> NaiveTab 命令完整列表见 [shortcut-command.ts](src/logic/shortcut/shortcut-command.ts) 中 `execEnv: 'newtab'` 的条目，
> 实现见 [shortcut-executor.ts](src/logic/shortcut/shortcut-executor.ts) 的 `newtabControlExecutors`。
> `isFocusMode` 存储在 `localState`（仅本地，不云同步），频繁切换不会污染云同步数据。

---

### 命令数据结构

```ts
interface TCommandEntry {
  /** 命令唯一标识 */
  command: TCommandName
}
```

**执行环境推导**：`execEnv` 不在 keymap 中冗余存储，而是通过 `getCommandExecEnv(command)` 函数从 `COMMAND_CATEGORIES` 中自动推导。新增命令时必须在 `COMMAND_CATEGORIES` 中声明执行环境，TypeScript 类型系统（`TSwCommandName`、`TCsCommandName`、`TNewtabCommandName`）会在 `switch satisfies never` 处静态校验覆盖完整性。

**新增命令规范**：
- 新增 SW 命令：在 `COMMAND_CATEGORIES` 追加字符串，在 `commands/registry.ts` 的 `COMMAND_HANDLERS` 中注册 handler
- 新增 CS 命令：标注 `execEnv: 'cs'`，在 CS 的 `commandExecutors` 和 newtab 的 `newtabCommandExecutors` 中各添加实现（或明确标注忽略），更新 `shortcut-command.ts` 中的执行差异说明表。scroll 命令还需在 `REPEATABLE_SCROLL_COMMANDS` 中注册以支持 e.repeat 持续触发。
- 新增 newtab 命令：标注 `execEnv: 'newtab'`，在 `newtabControlExecutors` 中添加实现，同步更新 `TNewtabCommandName`

---

## 数据存储

### 架构定位

**全局命令快捷键没有实际的 Widget 组件，只有 Setting 面板。**
（面向用户名称为「快捷指令」，以下文档为技术描述仍用"全局命令快捷键"）

它是一个「纯配置型」功能：
- 无 widget 不需要 `WidgetWrap`、拖拽、专注模式等 Widget 生命周期
- 仅有 Setting 面板用于配置 keymap 和修饰键
- 配置独立存储，与 keyboard widget 完全解耦

### 配置结构

```ts
// src/logic/config/defaults.ts
export const COMMAND_SHORTCUT_CODE = 'keyboardCommand'
export const COMMAND_PRESERVE_FIELDS = ['isEnabled', 'noModifierMode', 'shortcutInInputElement', 'urlBlacklist', 'modifiers']

export const KEYBOARD_COMMAND_CONFIG = {
  isEnabled: true,
  noModifierMode: false,
  modifiers: ['shift', 'alt'] as string[],
  shortcutInInputElement: true,
  urlBlacklist: [] as string[],
  keymap: { ... } as Record<string, TCommandEntry>,
}
```

然后在 `src/logic/config/defaults.ts` 中导入并挂载到 `defaultConfig`：

```ts
export const defaultConfig = {
  general: generalConfig,
  keyboardCommand: KEYBOARD_COMMAND_CONFIG,
  ...widgetsDefaultConfig,
}
```

### 存储机制

```
localStorage key:         c-keyboardCommand
chrome.storage sync key:  naive-tab-keyboardCommand
```

### 核心文件

| 文件 | 职责 |
|------|------|
| `src/logic/shortcut/shortcut-command.ts` | 命令定义（`COMMAND_CATEGORIES`）、类型（`TCommandName`、`TSwCommandName`、`TCsCommandName`、`TNewtabCommandName`）、配置（`KEYBOARD_COMMAND_CONFIG`） |
| `src/logic/shortcut/shortcut-executor.ts` | newtab 端命令快捷键 task（仅处理命令）；newtab 本地命令执行器；CS 命令回传执行器；Port 监听注册 |
| `src/logic/shortcut/matcher.ts` | 快捷键匹配核心：`matchShortcut` 位掩码比较、O(1) 修饰键匹配 |
| `src/logic/shortcut/port.ts` | 共享 Port 长连接管理：`getSharedPort()` 自动重连、`isSwReady` 状态检测 |
| `src/logic/shortcut/utils.ts` | 快捷键工具：域名规范化、黑名单、修饰键系统（`toModifierMask`）、输入元素检测 |
| `src/newtab/widgets/keyboardBookmark/index.vue` | newtab 端书签快捷键 task（键盘 Widget），通过 matchShortcut 统一匹配，命令优先兜底 |
| `src/background/main.ts` | SW 入口：启动编排、Port 管理注册、CS 重新注入（胶水层） |
| `src/background/config/cache.ts` | SW 端配置缓存，监听 `storage.onChanged` 自动更新 |
| `src/background/commands/handlers.ts` | SW 端所有 chrome tab/window 操作的具体实现 |
| `src/contentScripts/index.ts` | CS 端配置加载、Port 连接、按键事件处理、命令执行器、keyup 监听（停止持续滚动） |
| `src/contentScripts/scroll.ts` | 滚动容器查找与缓存（四级策略）、统一验证入口 `getValidatedScrollContainer`、持续滚动 rAF 动画循环、平滑滚动 |
| `src/setting/panes/keyboardCommand/index.vue` | 设置面板 UI |

**不需要修改的文件：**
- `WIDGET_CODE_LIST`：不是 Widget，不加入
- `WIDGET_GROUPS`：不是 Widget，不参与分组
- `src/newtab/widgets/registry.ts`：不需要 Widget 注册

---

## i18n

在 `src/locales/zh-CN.json` 和 `en-US.json` 中维护：
- `keyboardCommand` 命名空间：面板文案
- `command` 命名空间：命令名称（key 与 `TCommandName` 一一对应）
- `commandCategory` 命名空间：分类标题（key 与 `COMMAND_CATEGORIES[n].categoryKey` 对应）

---

## 与现有快捷键的隔离

| 维度 | 全局书签快捷键 | 全局命令快捷键 | 键盘书签 Widget |
|------|----------------|----------------|-----------------|
| 配置字段 | `keyboardBookmark` | `keyboardCommand` | `keyboardBookmark`（同书签快捷键） |
| 存储 key | `c-keyboardBookmark` | `c-keyboardCommand` | `c-keyboardBookmark` |
| 云同步 key | `naive-tab-keyboardBookmark` | `naive-tab-keyboardCommand` | `naive-tab-keyboardBookmark` |
| 启用开关 | `keyboardBookmark.isEnabled`（总开关）+ `keyboardBookmark.isGlobalShortcutEnabled`（CS 开关） | `keyboardCommand.isEnabled`（总开关）+ `keyboardCommand.isGlobalShortcutEnabled`（CS 开关） | `keyboardBookmark.enabled`（Widget 开关） |
| 无修饰键模式 | `keyboardBookmark.noModifierMode`（默认 `false`） | `keyboardCommand.noModifierMode`（默认 `false`） | 使用 `keyboardBookmark.noModifierMode` |
| 修饰键 | `keyboardBookmark.globalShortcutModifiers`（默认 `['alt']`，数组） | `keyboardCommand.modifiers`（默认 `['shift', 'alt']`，数组） | ❌ 不响应修饰键 |
| Keymap | `keyboardBookmark.keymap: Record<string, TBookmarkEntry>` | `keyboardCommand.keymap: Record<string, TCommandEntry>` | 复用 `keyboardBookmark.keymap` |
| 功能 | 打开书签 URL | 执行浏览器命令 | 键盘 UI 映射打开书签 URL |
| 是否有 Widget | ✅ 有键盘 UI 组件 | ❌ 无 UI，纯配置 | ✅ 有键盘 UI 组件 |

**修饰键冲突处理：命令优先。** 当书签和命令使用相同修饰键掩码或同时开启无修饰键模式时，命令快捷键优先生效，书签被短路。
- Content Script 端：`hasModifierConflict` 检测，冲突时只发送 `source: 'command'` 消息
- newtab 端：`globalShortcutTask` 先注册先执行处理命令，返回 `true` 阻断后续 `keyboardTask`（书签）

**键盘书签 Widget 与命令快捷键冲突：命令优先。** `globalShortcutTask` 通过 `setupNewtabCommandShortcut()` 在 App.vue script setup 顶层同步注册（早于所有子组件 setup），确保其先于 `keyboardTask` 执行。命令匹配成功时返回 `true` 阻断，书签作为兜底处理。

---

## 架构差异说明

书签快捷键和命令快捷键共享 `matchShortcut()` 匹配引擎和 Port 通信通道，但在执行路径和 keymap 来源上存在**有意差异**，而非代码重复或遗漏。

### 为什么书签有本地 fallback，命令没有？

书签快捷键的 value 是 URL，Content Script 可以直接 `chrome.tabs.create(url)` 打开页面，不需要 Chrome Extension 的特殊 API。因此 CS 端在无 Port 连接时能用本地 keymap 兜底，实现零延迟响应。

命令的 value 是 `TCommandName`，需要通过 `getCommandExecEnv()` 路由到 SW/CS/newtab 执行。CS 端没有 `chrome.tabs` 等 API 权限，无法本地执行大多数命令。因此命令没有本地 fallback，完全依赖 SW。

### 为什么书签有 systemKeymap（双数据源），命令没有？

书签支持 `source=1`（浏览器书签文件夹）和 `source=2`（扩展内编辑）两种模式。source=1 时 keymap 由 `buildAndSaveLayerKeymap()` 异步解析浏览器书签树生成，写入 `chrome.storage.local`，这就是 `systemKeymap`。source=2 时 keymap 由用户手动编辑，存储在 sync 配置中。

命令的 keymap 始终由用户手动绑定，不存在异步构建路径，因此只有单一数据源（sync 配置）。

### 为什么书签有层切换冷却，命令没有？

层切换冷却（`isBuildingLayerKeymap`）解决的是"书签层切换时异步构建 keymap 期间，快捷键可能读到旧数据"的问题。由于只有书签有异步构建路径（解析浏览器书签树），命令 keymap 变更是同步的（直接修改 `localConfig.keyboardCommand.keymap`），因此命令不需要冷却机制。

### 为什么 CS 和 newtab 端的快捷键处理代码不抽成通用函数？

CS 端需要处理：书签本地 fallback、scroll 命令本地执行、`swReady` 状态判断、Port 断开时的 sendMessage 降级。newtab 端分为两个 task：`globalShortcutTask`（命令快捷键，App.vue script setup 顶层注册）和 `keyboardTask`（书签快捷键，keyboardBookmark Widget 挂载时注册），利用 `keydownTaskMap` 的插入顺序保证命令优先。

两端的特殊逻辑与所在层的职责紧密耦合，强抽通用函数会引入 15+ 参数的怪物函数，模糊层级边界。匹配引擎（`matcher.ts`）已经是正确的抽象层级。

### 为什么 newtab 端的书签快捷键有 `keyboardCurrentModelAllKeyList` 前置过滤？

newtab 页面有可视化键盘 UI，`keyboardCurrentModelAllKeyList` 确保只有当前键盘布局中"可见"的键才能触发书签快捷键。例如 key61 布局不包含 F13，用户按 F13 时不应触发书签，因为虚拟键盘上没有对应的键。

CS 页面注入到普通网页中，没有可视化 UI 约束，因此使用更通用的 `ALLOWED_SET` 白名单。

### 为什么 newtab 端的命令快捷键不使用 sendMessage 降级？

CS 端在 Port 不可用时通过 `chrome.runtime.sendMessage` 唤醒 SW，是因为 CS 注入到第三方网页，用户可能在页面停留数小时，SW 休眠后 Port 断连的概率较高。

newtab 端只有 Port 一条路径，不使用 sendMessage 降级：
1. Port 断连后 `scheduleReconnect` 使用指数退避（100ms~1000ms）自动重连，窗口期极短
2. `chrome.runtime.connect()` 调用本身会唤醒休眠的 SW
3. 用户打开 newtab 页面时会立即建立 Port 连接，实际场景中 Port 断开的窗口期几乎不存在
4. toast 提示比静默等待 50-200ms 更直接

### 为什么 URL 黑名单在 newtab 页面不生效？

newtab 页面的 URL 为 `chrome-extension://<id>/dist/newtab.html`，`location.hostname` 为空字符串。`matchShortcut` 中 `hostname &&` 会短路跳过黑名单检查，快捷键在 newtab 页面始终可用。

这是有意设计——黑名单的语义是"在这些域名下不触发快捷键"，面向的是普通网页场景。用户在 newtab 自己的主页面上，快捷键应该始终生效。

---

## 实现健壮性

### ✅ 已覆盖的场景

| 场景 | 处理方式 |
|------|----------|
| 按键按住不放（repeat 事件） | 非 scroll 命令：`e.repeat` 过滤，不重复触发<br>scroll 命令：`tryLocalScroll` 放行，启动 rAF 动画循环（按住加速、松开减速，不依赖 OS repeat） |
| 未启用全局快捷键 | CS 端 `isEnabled && isGlobalShortcutEnabled` 校验；SW 仅检查 `isEnabled`；newtab 仅检查 `isEnabled` |
| 输入元素中误触发 | CS: `isInInputElement(e)` 检查 `composedPath()` + `shortcutInInputElement` 配置<br>newtab: `isInputFocused` 上游屏蔽 |
| 修饰键不匹配 | `eventMask !== configMask` 位掩码严格相等 |
| 主键不在白名单 | `ALLOWED_SET.has(e.code)` |
| keymap 中无对应命令 | `entry?.command` 可选链 |
| 无修饰键模式匹配到 keymap 未绑定的键 | `matchShortcut` 在 `noModifierMode` 下对 `ALLOWED_SET` 所有键都返回 code，但只有 keymap 中存在实际绑定（`commandKeymap[code]?.command` / `bookmarkKeymap[code]?.url`）时才拦截按键，避免吞掉页面原生行为（如视频站点的方向键） |
| newtab 命令在普通网页触发 | SW 收到后 `execIn='newtab'` 静默 return |
| Service Worker 冷启动 | Port 长连接保持活跃；冷启动期间暂存消息队列 |
| Port 断连 | CS: 指数退避自动重连<br>newtab: `getSharedPort()` 自动重建 |
| Content Script 重复注入 | `window.__naivetabGlobalShortcutInit` guard |
| 配置异步加载期间按键 | `keymap` 初始为空对象，查不到不触发 |
| 修饰键冲突（书签 + 命令同时匹配） | Content Script：命令优先，只发送 `source:'command'`，不重复触发书签 |
| 两者同时开启无修饰键模式 + 同键冲突 | Content Script：命令优先（跳过书签消息）<br>newtab：`globalShortcutTask` 先注册先执行处理命令，返回 `true` 阻断后续 `keyboardTask` |
| newtab 冲突防护 | `globalShortcutTask`（`shortcut-executor.ts`）仅处理命令，`keyboardTask`（`keyboardBookmark/index.vue`）处理书签，通过 `keydownTaskMap` 插入顺序保证命令优先 |
| keyboardBookmark 与命令冲突 | `globalShortcutTask` 在 App.vue script setup 顶层同步注册（先于子组件 setup），命令匹配成功时返回 `true` 阻断 `keyboardTask` |
| prototype 污染攻击 | `keymap[key]` 直接查找，非原型属性返回 undefined |
| gzip 压缩数据解析 | `parseStoredData` 自动解压，降级兼容原始 JSON |
| SW 信任发送方 | SW 独立校验 `isEnabled`，不完全信任发送方 |
| 持续滚动容器缓存失效后重新查找 | `invalidateScrollCache()` 清除缓存 + 交互记录，下次滚动时四级策略重新查找 |
| 容器已在滚动边界时 `doesScroll` 失效 | 正反向各试 1px，避免误判容器不可滚动 |
| scroll 命令内外两次查找拿到不同元素 | executor 统一通过 `getValidatedScrollContainer` 获取经验证的容器 |
| `trackInteraction` 干扰宿主页面滚动 | 仅记录原始 target 元素，不做试滚验证。`doesScroll` 延迟到真正需要滚动时才调用 |
| CS 命令回传 | Port 双向通信，SW → CS 回传 DOM 命令 |

### 滚动容器查找策略（参考 Vimium C findScrollable）

多容器页面中滚动目标必须精准且可预测。`scroll.ts` 采用四级查找策略：

```
第 1 级：lastInteractedTargetEl（WeakRef 用户最近交互过的原始 target）
   ↓ 失效/不存在
第 2 级：elementFromPoint(viewport中心) → findScrollableAncestor（祖先链）
   ↓ 未找到
第 3 级：selectFirstScrollable（可见面积评分，SPA 复杂布局兜底）
   ↓ 未找到
第 4 级：document.scrollingElement（最终兜底）
```

**第 1 级：** `trackInteraction` 仅在 `click/mousedown/focusin/wheel` 事件发生时记录原始 target 元素，不做任何试滚验证。这避免了干扰 scroll-snap / 自定义滚动容器页面。当真正需要执行滚动命令时，`findScrollableAncestor` 从该 target 向上查找可滚动祖先。`WeakRef` 避免内存泄漏。`scrollend` 事件也会更新交互记录。

**第 2 级：** 首次交互前，取 viewport 中心元素，沿祖先链查找第一个可滚动的容器。`findScrollableAncestor` 使用 `shouldScroll` 三态判断：`-1` 明确不可滚动（`display:none/visibility:hidden|collapse/overflow:hidden|clip/position:fixed|sticky`）、`0` 不确定（`overflow:visible` 等，需 `doesScroll` 验证）、`1` 明确可滚动（`auto|scroll|overlay` 且有滚动空间）。全屏模式下查找范围限制在 `document.fullscreenElement` 内。

**第 3 级：** 当中心点路径找不到可滚动容器时（常见于 Notion、飞书等 SPA），对 `documentElement.children` 进行可见面积评分（宽×高 > 199²），按面积从大到小排序，递归查找每个子元素内部的可滚动容器。

**`doesScroll` 双向验证 + zoom 校准：** 容器有效性检查时（`amount === 1`），正反两个方向各试 1px，避免容器已在底部/右侧时正向测试失败导致误判。试滚量通过 `getZoomFactor()` 校准（`devicePixelRatio / CSS zoom`），确保 125%/150% 缩放设备上 1px 对应真实物理像素变化。使用 `scrollBy({behavior:'instant'})` / `scrollTo({behavior:'instant'})` 而非直接赋值，确保与 scroll-snap 容器兼容。snap 容器通过 `getComputedStyle(el).scrollSnapType` 预判，还原时需要额外回滚。

**`getValidatedScrollContainer` 统一验证入口：** 所有 scroll 命令都通过此函数获取经验证的容器。它会先调用 `getScrollContainer` / `getHorizontalScrollContainer` 获取容器，然后通过 `doesScroll` 验证。如果验证失败（容器已过时或方向不匹配），清除缓存并重新查找。`fastSmoothScrollTo` / `fastSmoothScrollToX` 在未传入 `el` 参数时也会走此验证路径。

### ⚠️ 已知边界行为

| 行为 | 影响 | 说明 |
|------|------|------|
| 无修饰键模式下按修饰键+主键不触发 | 符合预期 | 无修饰键模式下检测修饰键状态，防止劫持 `Ctrl+C` 等系统快捷键 |
| Port 断连后首次按键可能丢失 | 极低 | SW 休眠时重建连接需要时间，首次 `postMessage` 可能在连接建立前发出，被 `try/catch` 静默吞掉。下次按键自动恢复 |
| `onUnmounted` 清理几乎不会执行 | 无 | 标签页关闭时 JS 环境直接销毁，不触发 Vue 生命周期。清理代码仅在 HMR / 热重载时生效 |
| newtab 命令在 newtab 页面设置抽屉打开时无效 | 低 | `task/keydown.ts` 在设置面板打开时屏蔽所有按键事件（仅 Escape 除外） |
| `moveTabToNextWindow` 移出时 pinned tab 位置丢失 | 低 | `chrome.tabs.move` 跨窗口移动不保留 pinned 索引，移出时位置丢失，**移回原窗口时自动恢复**。新窗口中 pinned tab 始终追加到末尾。由 `pinnedPositionCache`（内存 Map）记录原始窗口 ID 和 pinned 索引。 |
