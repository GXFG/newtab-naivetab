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
│  接收 SW 回传的 DOM 命令并执行（双向通信）：                     │
│  port.onMessage → {type:'NAIVETAB_EXECUTE_COMMAND',command}   │
│  → commandExecutors[command]()                                 │
│  - scrollUp/Down → 滚动容器                                   │
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
│  task.ts startKeydown → 多个 keydown task 依次执行              │
│                                                               │
│  ① globalShortcutTask（书签 + 命令统一处理）：                   │
│     - 同时匹配书签和命令快捷键，冲突时命令优先                    │
│     - execEnv='newtab': 直接本地执行（不走 SW）                 │
│       * toggleFocusMode → localState.isFocusMode 切换          │
│       * toggleDragMode → toggleIsDragMode()                    │
│       * toggleSettingDrawer → switchSettingDrawerVisible()     │
│     - 仅书签匹配: Port.postMessage({key, source:'bookmark'})    │
│     - 命令匹配(无冲突): Port.postMessage({key, source:'command'})│
│     - 接收 SW 回传的 CS 命令（与 CS 共享 Port，复用执行器）      │
│                                                               │
│  ② keyboardBookmark keydown task（键盘 Widget 按键绑定）：      │
│     - 无修饰键直接匹配，在当前 layout 中查找对应键              │
│     - 命令快捷键开启 noModifierMode 时静默跳过（命令优先）       │
│     - 匹配成功后打开对应书签 URL                                │
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

- [x] `globalShortcutForBookmark` 已迁移至 Port 架构（newtab 端已合并至 `globalShortcutTask`）
- [x] 命令快捷键配置定义 + SW 缓存 + 命令分发
- [x] Port 双向通信：CS → SW 发送按键，SW → CS 回传命令
- [x] CS 端命令执行器：scrollUp/Down/ToTop/ToBottom、reloadPage、copyPageUrl、copyPageTitle
- [x] SW 端命令执行器：toggleTabPinned、duplicateTab、closeTab、next/prevTab 等 40+ 命令
- [x] newtab 本地命令（execEnv: 'newtab'）：不走 SW，直接在 newtab 页面执行
- [x] SW 独立校验 `isEnabled`（bookmark + command 双重校验）
- [x] CS 端命令快捷键监听（`source: 'command'` 发送路径）
- [x] newtab 端统一快捷键 task（`globalShortcutTask`，书签 + 命令合并，命令优先）
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

| 命令 key | 名称 |
|----------|------|
| `toggleTabPinned` | 固定/取消固定标签页 |
| `duplicateTab` | 复制标签页 |
| `closeTab` | 关闭标签页 |
| `toggleTabMute` | 静音/取消静音标签页 |
| `closeOtherTabs` | 关闭其他标签页 |
| `closeLeftTabs` | 关闭左侧标签页 |
| `closeRightTabs` | 关闭右侧标签页 |
| `closeDuplicateTabs` | 关闭重复标签页 |
| `nextTab` / `prevTab` | 切换标签页 |
| `firstTab` / `lastTab` | 首/末标签页 |
| `moveTabLeft` / `moveTabRight` | 移动标签页位置 |
| `moveToNewWindow` | 移到新窗口 |
| `moveTabToNextWindow` | 移到下一个窗口 |
| `mergeAllWindows` | 合并所有窗口 |
| `reloadAllTabs` | 刷新当前窗口所有标签页 |
| `reloadAllTabsAllWindows` | 刷新全部窗口所有标签页 |
| `newTab` / `newTabAfter` | 新建标签页 |
| `newWindow` / `newIncognito` | 新建窗口/隐身窗口 |
| `closeWindow` | 关闭当前窗口 |
| `reopenClosedTab` | 恢复关闭的标签页 |
| `goBack` / `goForward` | 页面前进/后退 |
| `groupCurrentTab` / `ungroupCurrentTab` | 加入/移出标签组 |
| `toggleGroupCollapse` | 折叠/展开标签组 |
| `closeGroupTabs` | 关闭标签组内所有标签页 |

---

#### CS 命令（`execEnv: 'cs'`）

需要操作页面 DOM，由 SW 通过 Port 回传 `NAIVETAB_EXECUTE_COMMAND`，CS 端和 newtab 端各自实现执行器。

| 命令 key | 名称 | CS 端 | newtab 端 |
|----------|------|-------|-----------|
| `scrollUp` | 向上滚动一屏 | ✅ 滚动容器 | ❌ 忽略（无可滚动内容） |
| `scrollDown` | 向下滚动一屏 | ✅ 滚动容器 | ❌ 忽略 |
| `scrollToTop` | 滚动到顶部 | ✅ 滚动容器 | ❌ 忽略 |
| `scrollToBottom` | 滚动到底部 | ✅ 滚动容器 | ❌ 忽略 |
| `reloadPage` | 刷新页面 | ✅ `location.reload()` | ✅ `location.reload()` |
| `copyPageUrl` | 复制页面链接 | ✅ clipboard API + fallback | ✅ clipboard API + $message |
| `copyPageTitle` | 复制页面标题 | ✅ clipboard API + fallback | ✅ clipboard API + $message |

---

#### NaiveTab 控制命令（`execEnv: 'newtab'`）

由 `shortcut-executor.ts` 中 `newtabControlExecutors` 直接执行，**不经过 SW**。  
CS 侧无法执行（没有 `localConfig`），SW 收到后静默忽略。  
仅当快捷键在 newtab 页面触发时生效；普通网页触发时按键被发往 SW，SW 静默丢弃。

| 命令 key | 名称 | 执行逻辑 |
|----------|------|----------|
| `toggleFocusMode` | 切换专注模式 | `localState.value.isFocusMode` 取反，弹 `$message.info` 反馈 |
| `toggleDragMode` | 切换编辑模式 | 关闭设置面板 + `toggleIsDragMode()` |
| `toggleSettingDrawer` | 打开/关闭设置面板 | `switchSettingDrawerVisible(!isSettingDrawerVisible)` |

> 注：`isFocusMode` 存储在 `localState`（仅本地，不云同步），频繁切换不会污染云同步数据。

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
- 新增 SW 命令：在 `COMMAND_CATEGORIES` 追加字符串，在 `background/main.ts` 的 `execSwCommand` switch 中追加 case
- 新增 CS 命令：标注 `execEnv: 'cs'`，在 CS 的 `commandExecutors` 和 newtab 的 `newtabCommandExecutors` 中各添加实现（或明确标注忽略），更新 `shortcut-command.ts` 中的执行差异说明表
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
// src/logic/globalShortcut/shortcut-command.ts
export const COMMAND_SHORTCUT_CODE = 'keyboardCommand'
export const PRESERVE_FIELDS = ['isEnabled', 'noModifierMode', 'modifiers', 'keymap']

export const KEYBOARD_COMMAND_CONFIG = {
  isEnabled: true,
  noModifierMode: false,
  modifiers: ['shift', 'alt'] as string[],
  shortcutInInputElement: false,
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
| `src/logic/globalShortcut/shortcut-command.ts` | 命令定义（`COMMAND_CATEGORIES`）、类型（`TCommandName`、`TSwCommandName`、`TCsCommandName`、`TNewtabCommandName`）、配置（`KEYBOARD_COMMAND_CONFIG`） |
| `src/logic/globalShortcut/shortcut-executor.ts` | newtab 端统一 keydown task（书签 + 命令）；冲突检测（命令优先）；newtab 本地命令执行器；CS 命令回传执行器；Port 监听注册 |
| `src/logic/globalShortcut/shortcut-utils.ts` | 修饰键匹配（`matchShortcut`）、无修饰键模式匹配（`noModifierMode`）、共享 Port 管理（`getSharedPort`）、URL 黑名单等公共工具 |
| `src/background/main.ts` | SW 端 Port 连接管理、命令分发（`handleCommandShortcutKeydown`）、SW 命令执行（`execSwCommand`）、冷启动消息队列 |
| `src/background/config-cache.ts` | SW 端配置缓存，监听 `storage.onChanged` 自动更新 |
| `src/background/commands.ts` | SW 端所有 chrome tab/window 操作的具体实现 |
| `src/contentScripts/index.ts` | CS 端配置加载、Port 连接、按键事件处理、命令执行器 |
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
| 启用开关 | `keyboardBookmark.isGlobalShortcutEnabled` | `keyboardCommand.isEnabled` | `keyboardBookmark.enabled`（Widget 开关） |
| 无修饰键模式 | `keyboardBookmark.noModifierMode`（默认 `false`） | `keyboardCommand.noModifierMode`（默认 `false`） | ❌ 无修饰键，始终无修饰键匹配 |
| 修饰键 | `keyboardBookmark.globalShortcutModifiers`（默认 `['alt']`，数组） | `keyboardCommand.modifiers`（默认 `['shift', 'alt']`，数组） | ❌ 不响应修饰键 |
| Keymap | `keyboardBookmark.keymap: Record<string, TBookmarkEntry>` | `keyboardCommand.keymap: Record<string, TCommandEntry>` | 复用 `keyboardBookmark.keymap` |
| 功能 | 打开书签 URL | 执行浏览器命令 | 键盘 UI 映射打开书签 URL |
| 是否有 Widget | ✅ 有键盘 UI 组件 | ❌ 无 UI，纯配置 | ✅ 有键盘 UI 组件 |

**修饰键冲突处理：命令优先。** 当书签和命令使用相同修饰键掩码或同时开启无修饰键模式时，命令快捷键优先生效，书签被短路。
- Content Script 端：`hasModifierConflict` 检测，冲突时只发送 `source: 'command'` 消息
- newtab 端：`globalShortcutTask` 单一 handler 内命令优先

**键盘书签 Widget 与命令快捷键冲突：命令优先。** 当命令快捷键开启无修饰键模式（`noModifierMode: true`）时，键盘书签 Widget 的 keydown handler 静默跳过，不响应任何按键。这样避免同一按键同时触发命令执行和书签打开。

---

## 实现健壮性

### ✅ 已覆盖的场景

| 场景 | 处理方式 |
|------|----------|
| 按键按住不放（repeat 事件） | `e.repeat` 过滤 |
| 未启用全局快捷键 | CS/SW 双重 `isEnabled` 校验 |
| 输入元素中误触发 | CS: `isInInputElement()` + `shortcutInInputElement` 配置<br>newtab: `isInputFocused` 上游屏蔽 |
| 修饰键不匹配 | `eventMask !== configMask` 位掩码严格相等 |
| 主键不在白名单 | `ALLOWED_SET.has(e.code)` |
| keymap 中无对应命令 | `entry?.command` 可选链 |
| newtab 命令在普通网页触发 | SW 收到后 `execIn='newtab'` 静默 return |
| Service Worker 冷启动 | Port 长连接保持活跃；冷启动期间暂存消息队列 |
| Port 断连 | CS: 指数退避自动重连<br>newtab: `getSharedPort()` 自动重建 |
| Content Script 重复注入 | `window.__naivetabGlobalShortcutInit` guard |
| 配置异步加载期间按键 | `keymap` 初始为空对象，查不到不触发 |
| 修饰键冲突（书签 + 命令同时匹配） | Content Script：命令优先，只发送 `source:'command'`，不重复触发书签 |
| 两者同时开启无修饰键模式 + 同键冲突 | Content Script：命令优先（跳过书签消息）<br>newtab：`globalShortcutTask` 单一 handler 内命令优先，书签被跳过 |
| newtab 冲突防护 | `globalShortcutTask`（`shortcut-executor.ts`）：单一 task 内同时匹配书签和命令，冲突时命令优先 |
| keyboardBookmark 与命令冲突 | 命令快捷键开启 `noModifierMode` 时，keyboardBookmark 的 keydown task 静默跳过，命令优先 |
| prototype 污染攻击 | `keymap[key]` 直接查找，非原型属性返回 undefined |
| gzip 压缩数据解析 | `parseStoredData` 自动解压，降级兼容原始 JSON |
| SW 信任发送方 | SW 独立校验 `isEnabled`，不完全信任发送方 |
| CS 命令回传 | Port 双向通信，SW → CS 回传 DOM 命令 |

### ⚠️ 已知边界行为

| 行为 | 影响 | 说明 |
|------|------|------|
| 无修饰键模式下按修饰键+主键不触发 | 符合预期 | 无修饰键模式下检测修饰键状态，防止劫持 `Ctrl+C` 等系统快捷键 |
| Port 断连后首次按键可能丢失 | 极低 | SW 休眠时重建连接需要时间，首次 `postMessage` 可能在连接建立前发出，被 `try/catch` 静默吞掉。下次按键自动恢复 |
| `onUnmounted` 清理几乎不会执行 | 无 | 标签页关闭时 JS 环境直接销毁，不触发 Vue 生命周期。清理代码仅在 HMR / 热重载时生效 |
| newtab 命令在 newtab 页面设置抽屉打开时无效 | 低 | `task.ts startKeydown` 在设置面板打开时屏蔽所有按键事件（仅 Escape 除外） |
