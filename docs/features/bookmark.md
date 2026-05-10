# 书签系统架构

## 概述

书签系统实现键盘 Widget 对浏览器书签的绑定、导航与执行。核心包含两个数据源模式：
- **source = 1**：直接读取浏览器原生书签树（需要 `bookmarks` 权限）
- **source = 2**：使用自定义 keymap（key code → URL 映射），数据持久化在 localStorage + chrome.storage.sync

---

## 数据流架构

```
┌─────────────────────────────────────────────────────────────────────┐
│  浏览器原生书签 (chrome.bookmarks API)                               │
│  (需要 "bookmarks" 可选权限)                                          │
└──────────────────┬──────────────────────────────────────────────────┘
                   │ getBrowserBookmark()
                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│  keyboardBookmark/logic.ts                                          │
│  state.systemBookmarks: BookmarkNode[]（内存缓存）                   │
│  currFolderBookmarks computed（按导航栈过滤）                        │
└──────────────────┬──────────────────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
┌──────────────────┐  ┌──────────────────────────────────────────────┐
│ localStorage         │  │ chrome.storage.sync（云同步）                  │
│ key: c-keyboardBookmark│  │ key: naive-tab-keyboardBookmark              │
│ Bookmark         │  │ 格式: {syncTime, syncId, appVersion, data}    │
└──────────────────┘  └──────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────────┐
                    │ Service Worker 缓存  │
                    │ config-cache.ts      │
                    │（零延迟读取）          │
                    └─────────────────────┘
```

---

## 类型定义

### 基础类型（`src/types/bookmark.d.ts`）

```ts
type KeycapBookmarkType = 'none' | 'mark' | 'folder' | 'back'
type KeycapVisualType = 'gmk' | 'dsa' | 'flat'

interface TBookmarkEntry {
  url: string
  name?: string
}

interface BookmarkItem {
  key: string
  url: string
  name?: string
}
```

### Widget 配置（`src/newtab/widgets/keyboardBookmark/config.ts`）

```ts
{
  enabled: true,                              // Widget 是否启用
  source: 2,                                  // 1=浏览器书签, 2=自定义 keymap
  isGlobalShortcutEnabled: true,              // 全局快捷键开关
  shortcutInInputElement: true,               // 输入框内是否触发
  globalShortcutModifiers: ['alt'],           // 修饰键
  urlBlacklist: string[],                     // URL 黑名单
  isNewTabOpen: false,                        // 始终在新标签页打开
  bindingMode: true,                          // source=1 键位绑定开关（所有层共用）
  defaultExpandFolder: null | string,         // 自动展开的书签文件夹标题（仅顺序模式）
  layers: [                                   // source=1 时最多 4 层，每层绑定一个浏览器书签文件夹
    { sourceFolderTitle: 'NaiveTab' },
    { sourceFolderTitle: '' },
    { sourceFolderTitle: '' },
    { sourceFolderTitle: '' },
    { sourceFolderTitle: '' },
  ],
  keymap: Record<string, TBookmarkEntry>,     // key code → {url, name?}
  layout: { ... }                             // 页面位置
}
```

**PRESERVE_FIELDS** = `['source', 'globalShortcutModifiers', 'keymap']` — 快速重置时保护用户数据。

---

## 核心 API

### 浏览器书签读取（`src/logic/bookmark.ts`）

```ts
/** 包装 chrome.bookmarks.getTree 为 Promise，检查权限 */
function getChromeBookmark(): Promise<chrome.bookmarks.BookmarkTreeNode[]>

/** 过滤书签树获取根级文件夹。处理 Chrome/Firefox 根节点差异 */
function getBrowserBookmark(): Promise<BookmarkNode[]>

/** 获取 favicon URL。Chrome 用 _favicon API，Firefox 回退 Google 服务 */
function getFaviconFromUrl(url: string, size?: number): string
```

### 键盘书签逻辑（`src/newtab/widgets/keyboardBookmark/logic.ts`）

**响应式状态：**
```ts
const state = reactive({
  systemBookmarks: [] as BookmarkNode[],
  selectedFolderTitleStack: [] as string[],
  isLoadPageLoading: false,
  currSelectKeyCode: '',
})
```

**关键函数：**
| 函数 | 作用 |
|------|------|
| `getSystemBookmarkForKeyboard()` | 获取浏览器书签，权限失败时弹出授权对话框 |
| `initKeyboardData()` | 初始化：获取书签 + 设置默认展开文件夹 |
| `findTargetFolderBookmark(folderBookmark, folderTitleStack)` | 递归遍历书签树定位目标文件夹 |
| `handleSpecialKeycapExec(keyCode, keycapBookmarkType)` | 处理 folder/back 类型按键执行 |
| `openPage(url, isBgOpen?, isNewTabOpen?)` | 打开 URL，处理后台标签/新标签/同页导航 |
| `handlePressKeycap(keyCode)` | 按键按下视觉反馈（200ms 高亮） |
| `refreshKeyboardData()` | 页面可见性/焦点变化时刷新数据 |

### 书签管理 UI（`src/components/BookmarkManager.vue`）

| 方法 | 作用 |
|------|------|
| `ensureKeymapEntry(code)` | 延迟创建 keymap 条目（防止空条目污染） |
| `selectKey(code)` | 选择待编辑的键位 |
| `onDeleteBookmark()` | 从 keymap 删除书签 |
| `handleCommit()` | 强制同步到 chrome.storage.sync（popup 场景） |

### 书签绑定管理 UI（`src/components/BookmarkBindingManager.vue`）

用于 source=1 键位绑定模式（`bindingMode = true`）下的可视化书签绑定管理。用户通过键盘预览点击键帽选择待编辑键位，在表单区编辑 URL/名称或选择浏览器书签：

| 方法 | 作用 |
|------|------|
| `selectKey(code)` | 选择待编辑的键位（同步中禁止切换） |
| `onOpenBookmarkPicker()` | 打开浏览器书签选择器 |
| `onSelectBookmark(payload)` | 绑定书签到选中键位 |
| `onUnbind()` | 解绑选中键位的书签 |
| `onHandleSetUrl(value)` | 编辑 URL（去空格、触发防抖同步） |
| `onHandleSetName(value)` | 编辑名称（截断长度、触发防抖同步） |
| `syncBookmark()` | 同步 Chrome 书签（区分新建/更新/删除） |
| `scheduleDebouncedSync()` | 防抖同步入口（仅 popup 场景生效） |
| `onHandleInputBlur()` | 失焦立即同步，清除待执行的防抖 timer |

**同步策略：**

- **popup 场景**（`immediateSync=true`）：输入时 300ms 防抖同步 + 失焦立即同步，防止用户改完直接关闭导致数据丢失
- **setting 场景**（`immediateSync=false`）：仅失焦时同步，不触发防抖

**`originUrl` 机制：** `selectKey` 时记录键位的原始 URL，`syncBookmark` 据此判断操作类型：有原始 URL → 更新，无原始 URL → 新建。`isSyncing` 守卫确保同步进行中不允许切换键帽，避免状态污染。

**拖拽交换逻辑：** 统一由 `useKeycapDrag` 组合式函数提供。两个组件共用同一套交互模式，差异仅在 `swapData` 回调中：
- `BookmarkManager`（source=2）：直接交换 `localConfig.keyboardBookmark.keymap` 中的数据
- `BookmarkBindingManager`（source=1）：交换 `systemKeymap` + Chrome 书签。前缀（如 `[Digit1]`）保持不变，只交换名称和 URL；`swapBookmarksInSourceFolder` 通过删除+重建实现

### 键帽拖拽组合式函数（`src/composables/useKeycapDrag.ts`）

封装 HTML5 拖拽交互的通用逻辑。调用方实现三个回调：

| 回调 | 作用 |
|------|------|
| `canDrag(code)` | 判断键帽是否可作为拖拽源 |
| `swapData(source, target)` | 交换两个键位的数据 |
| `onAfterSwap?(target)` | 交换完成后的回调（如更新选中、刷新数据） |

### 书签树选择器（`src/components/BrowserBookmarkPicker.vue`）

支持搜索的树形选择器组件，props: `show`, `width`, `selectType`（`'bookmark'` | `'folder'`）。

---

## 双模式运行机制

### source = 2（自定义 keymap）
- 使用 `localConfig.keyboardBookmark.keymap`
- 每个 key code 映射到 `{url, name?}`
- 数据持久化在 localStorage + chrome.storage.sync

### source = 1（浏览器书签驱动）

用户通过在书签管理器中维护一个**专用文件夹**（默认 `NaiveTab`，可自定义）来控制键盘展示。支持**多层书签**：最多 4 层，每层绑定一个独立的浏览器书签文件夹，通过全局命令快捷键（`switchBookmarkLayer1-4`）切换。`bindingMode` 为所有层共用同一个开关。层激活状态（`activeLayer`）设备级持久化（`chrome.storage.local`），不云同步；`layers` 配置跨设备同步（`chrome.storage.sync`）。

根据 `bindingMode` 开关，分为两种独立模式：

#### 键位绑定模式（`bindingMode: true`）

书签名以 `[标准Code]` 前缀精确绑定到对应键位：

```
📁 书签栏
  📁 NaiveTab                    ← 数据源根文件夹（名称可自定义）
    🔗 [KeyQ] Google             ← 精确绑定到 Q 键
    🔗 [KeyW] GitHub             ← 精确绑定到 W 键
    🔗 [F1] 日历                 ← 精确绑定到 F1 键
    📁 工作                      ← 子文件夹名任意，仅作管理分组
      🔗 [KeyE] 精确到 E          ← 精确绑定
      🔗 Notion                  ← 无前缀 → 忽略
    📁 _archive                  ← _ 开头，隐藏不展示
      🔗 旧书签
```

拖拽两个已绑定键帽交换时，**前缀（如 `[KeyQ]`）保持不变**，只交换书签名称和 URL：

```
拖拽前: 位置0 → [KeyQ] Google · google.com    位置1 → [KeyW] GitHub · github.com
拖拽后: 位置0 → [KeyQ] GitHub · github.com    位置1 → [KeyW] Google · google.com
```

#### 顺序模式（`bindingMode: false`，默认）

所有书签按深度优先遍历顺序填充到键位，`[X]` 前缀被忽略：

```
📁 书签栏
  📁 NaiveTab
    🔗 Google                    ← 第 1 个键位
    🔗 GitHub                    ← 第 2 个键位
    🔗 Twitter                   ← 第 3 个键位
    📁 工作
      🔗 Notion                  ← 第 4 个键位
      🔗 Figma                   ← 第 5 个键位
    📁 _archive                  ← _ 开头，隐藏不展示
```

#### 解析规则

| 规则 | 行为 |
|------|------|
| 书签名以 `_` 开头 | 隐藏，不参与任何模式解析 |
| 文件夹名以 `_` 开头 | 整个文件夹跳过 |
| 子文件夹 | 名称不参与布局，仅作书签管理分组，递归遍历所有子节点 |

#### 前缀格式

`[X]` 中的 `X` 必须使用标准键盘事件 code（`KeyboardEvent.code`），例如 `KeyQ`、`Digit1`、`F1`、`Escape` 等。导出功能也使用相同格式（`[KeyQ]`），保持导入导出完全对称。

完整 code 列表见 [MDN KeyboardEvent.code 值](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_code_values)。设置面板可视化绑定时自动使用标准 code，无需手动编写。

#### 解析流程

```
chrome.bookmarks.getTree()
    │
    ▼
1. 根据当前 activeLayer 获取 layers[cachedActiveLayer].sourceFolderTitle
   （统一通过 getCurrentLayerFolderTitle() 获取，降级默认值 'NaiveTab'）
   │
   ▼
2. 深度优先遍历所有子节点
   ├─ 文件夹名以 _ 开头 → 跳过
   ├─ 书签名以 _ 开头   → 跳过
   └─ 书签
      ├─ bindingMode=true：有 [X] 前缀 → 精确绑定；无前缀 → 忽略
      └─ bindingMode=false：所有书签（忽略 [X] 前缀）→ 按顺序填充
   │
   ▼
3. 生成 systemKeymap（内存） + 写入 chrome.storage.local（供 CS/SW 使用）
```

#### 全局快捷键（source=1）

keymap 存储在 `chrome.storage.local`（key: `SYSTEM_KEYMAP_STORAGE_KEY`，定义于 `src/logic/keyboard/keyboard-constants.ts`），不触发云同步。SW 和 CS 根据 `config.source === 1` 决定读取 `systemKeymap` 而非 `keymap`。详见 `src/background/config-cache.ts` 中的 `cachedSystemKeymap`。

#### 模式切换行为

| 切换场景 | keymap 变化 |
|---------|------------|
| source=2 → source=1 | 被解析结果覆盖 |
| source=1 → source=2 | 恢复 source=2 在 localStorage 中保留的旧 keymap |
| 顺序模式 → 精确模式 | 被精确模式 keymap 覆盖 |
| 精确模式 → 顺序模式 | 被顺序模式 keymap 覆盖 |

---

## 同步机制

### 上传（本地 → 云端）

```ts
// 防抖自动上传（2s delay, 5s maxWait）
handleWatchLocalConfigChange() --watch--> genWathUploadConfigFn(field)

// 强制立即同步（popup 场景）
flushConfigSync(field: ConfigField): Promise<boolean>
```

`uploadConfigFn` 关键步骤：
1. 清理 `keyboardBookmark` 数据：移除空 URL、截断过长 URL/名称
2. 计算 MD5 — 若 `syncId` 未变则跳过上传（去重）
3. Payload > 4000 字节时 gzip 压缩
4. 检查 8KB 单 key 限制（7KB 时预警）
5. 写入 `chrome.storage.sync`，key 为 `naive-tab-keyboardBookmark`
6. 成功：更新 `syncTime`、`syncId`、清除 `dirty`

### 下载（云端 → 本地）

```ts
setupPageConfigSync():
  1. handleStateResetAndUpdate()
  2. loadRemoteConfig()          // 版本感知合并
  3. handleMissedUploadConfig()  // 重试失败上传
  4. handleWatchLocalConfigChange()
  5. setupKeyboardSyncListener() // 实时 onChanged 监听
```

### 跨设备/跨标签页同步
- `chrome.storage.onChanged`：其他标签页/popup 修改时实时更新 `localConfig.keyboardBookmark`
- `localStorage` `storage` 事件：同设备 options/newtab 之间同步

### Service Worker 缓存（`src/background/config-cache.ts`）

Service Worker 无法使用 Vue 响应式，维护纯对象缓存：
```ts
getCachedKeyboardBookmarkConfig()        // ~0ms 读取，无需解压
loadAndCacheKeyboardBookmarkConfig()     // 启动加载，5s 超时
```

通过 `chrome.storage.onChanged` 监听器自动更新缓存。

---

## 后台脚本书签快捷键（`src/background/main.ts`）

```ts
handleBookmarkShortcutKeydown(key: string, _tabId: number): void
  1. 读取缓存配置（无 I/O）
  2. 检查 isGlobalShortcutEnabled
  3. 查找 keymap[key].url
  4. chrome.tabs.create({ url: padUrlHttps(entry.url) })
```

**冷启动保护：** SW 冷启动期间（配置未加载前），keydown 消息排队在 `pendingMessages` 中，`waitInitialized()` 完成后处理。

---

## 错误处理与边界情况

| 场景 | 处理方式 |
|------|----------|
| `chrome.bookmarks` API 不可用（无权限） | `getChromeBookmark` reject；UI 显示授权对话框 |
| Firefox vs Chrome 根节点结构差异 | `isFirefox ? root[1] : root[0]` 处理不同根索引 |
| favicon URL 无效 | `try/catch` 返回空字符串，`console.warn` |
| keymap 中 URL 为空 | 上传时跳过；`getKeycapUrl` 返回 `''`；`openPage` 提前返回 |
| URL/名称过长 | UI 输入时截断（`KEYBOARD_URL_MAX_LENGTH`），`getUploadConfigData` 兜底截断 |
| 同步配额超限（8KB） | 上传拦截，显示错误，本地数据保留 |
| 同步写入频率接近限制（80/120 每分钟） | 显示警告 |
| 云端数据解析失败 | 回退到普通 `JSON.parse` 兼容旧格式；仍失败则跳过 |
| 上传期间页面刷新导致遗漏 | `handleMissedUploadConfig` 下次加载时重试 |
| Port 快速导航断开 | 仅当 `currentPort === port` 时删除 `portMap[tabId]`，防止误删新 Port |

---

## 缓存与优化策略

1. **Gzip 压缩**：payload 超过 4000 字节时压缩，显著减少存储占用
2. **MD5 去重**：内容未变时不上传（`syncId` 比较）
3. **防抖写入**：2s 防抖 + 5s maxWait，避免 Chrome 同步频率限制（120 次/分）
4. **SW 内存缓存**：`config-cache.ts` 在 SW 启动时缓存配置，keydown 读取 ~0ms
5. **延迟创建 keymap**：`ensureKeymapEntry` 仅在用户实际修改时创建条目
6. **页面焦点/可见性刷新**：`addPageFocusTask` 和 `addVisibilityTask` 在用户返回时刷新书签
7. **写入频率追踪**：`writeHistory` 滑动窗口追踪每分钟写入次数，80% 阈值时预警

---

## 注意事项

- **`database.ts`（IndexedDB）不用于书签**。它仅存储背景图（`localBackgroundImages` 和 `currBackgroundImages` object stores）。书签数据存储在 `localStorage`（`c-keyboardBookmark`）和 `chrome.storage.sync`（`naive-tab-keyboardBookmark`）。
- 修改 `keyboardBookmark` 配置字段时，**必须同步修改** `src/background/main.ts` 中的字段引用
- popup 修改书签后必须在 `handleCommit` 中调用 `flushConfigSync` 强制同步（跳过 2s 防抖）
