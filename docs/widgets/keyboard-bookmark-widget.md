# KeyboardBookmark Widget

## 概述

`keyboardBookmark` 是 NaiveTab 的键盘布局书签 Widget，将浏览器书签映射到虚拟键盘按键上。它复用通用键盘引擎（布局、键帽渲染、主题），注入书签业务数据。

- **Widget Code**: `keyboardBookmark`
- **配置文件**: `src/newtab/widgets/keyboardBookmark/config.ts`
- **业务逻辑**: `src/newtab/widgets/keyboardBookmark/logic.ts`

---

## Widget 配置

```ts
{
  enabled: true,                              // Widget 是否启用
  source: 2,                                  // 1=浏览器书签, 2=自定义 keymap
  isEnabled: true,                            // 总开关（newtab + CS）
  isGlobalShortcutEnabled: true,              // CS 端开关（关闭后仅 newtab 可用）
  noModifierMode: false,                      // 无修饰键模式
  shortcutInInputElement: true,               // 输入框内是否触发全局快捷键
  globalShortcutModifiers: ['alt'],           // 全局快捷键修饰键
  urlBlacklist: string[],                     // URL 黑名单
  isNewTabOpen: false,                        // 始终在新标签页打开
  layers: [                                   // source=1 时最多 4 层，每层绑定一个浏览器书签文件夹
    { sourceFolderPath: 'layer1' },
    { sourceFolderPath: '' },                // 空字符串表示未配置
    { sourceFolderPath: '' },
    { sourceFolderPath: '' },
  ],
  keymap: Record<string, TBookmarkEntry>,     // key code → {url, name?}
  layout: { ... }                             // 页面位置（vw/vh）
}
```

**PRESERVE_FIELDS** = `['source', 'isEnabled', 'isGlobalShortcutEnabled', 'noModifierMode', 'shortcutInInputElement', 'globalShortcutModifiers', 'urlBlacklist', 'keymap', 'layers']` — 快速重置时保护用户数据。

**activeLayer**（当前激活层索引）不存储在 `localConfig` 中（会被云同步），而是以模块级变量 + `chrome.storage.local` 独立 key（`ACTIVE_LAYER_STORAGE_KEY`，值为 `'naive-tab-activeLayer'`）管理，设备级持久化、不同步。

---

## 运行机制

### source = 1（系统书签）

通过 `chrome.bookmarks` API 读取浏览器书签树，由 `parseBookmarkFolder()` 解析器构建 keymap。支持**多层书签**机制：最多 4 层，每层绑定一个独立的浏览器书签文件夹，通过全局命令快捷键（如 `Alt+1/2/3/4`）切换。层激活状态（`activeLayer`）设备级持久化（`chrome.storage.local`），不云同步；`layers` 配置跨设备同步（`chrome.storage.sync`）。

书签名以 `[X]` 前缀精确绑定到对应键位（如 `[KeyQ] Google`、`[F1] 日历`），无前缀书签被忽略。用户可在设置面板或 popup 通过键盘预览点击键位，选择浏览器书签后系统自动为其添加 `[X]` 前缀。也支持直接在表单区编辑 URL/名称，输入时自动同步到 Chrome 书签。解绑时自动移除 `[X]` 前缀。需要 `bookmarks` 可选权限，未授权时弹出授权对话框。

书签解析器详见 [parser.ts](../../src/logic/bookmark/parser.ts)。

### source = 2（自定义 keymap）

- 使用 `localConfig.keyboardBookmark.keymap`
- 每个 key code 映射到 `{url, name?}`
- 数据持久化在 localStorage + chrome.storage.sync

书签同步机制详见 [bookmark.md](../features/bookmark.md)。

---

## 组件架构

```
KeyboardBookmark (Widget 入口)
  └── KeyboardLayout (键盘容器 — 通用引擎)
        └── KeyboardKeycapWidget (单键包装 — 通用引擎)
              └── KeyboardKeycapDisplay (纯展示组件)
                    ├── keycap__label  — 键位标识
                    └─ keycap__name   — 书签名称
```

### 数据绑定流程

1. `KeyboardBookmark` 根据 `source` 模式提供书签数据
2. `KeyboardLayout` 从通用引擎读取布局结构（按键列表、强调分组）
3. 每个键位通过 `#keycap` 插槽接收 `code` 和 `rowIndex`
4. `KeyboardKeycapWidget` 用 `useKeyboardStyle` 计算样式，从书签数据获取 label/icon/name
5. `KeyboardKeycapDisplay` 纯展示

---

## 事件处理

### keydown（键盘按下）

通过 `addKeydownTask(WIDGET_CODE, keyboardTask)` 注册：

1. `isDragMode` 时提前返回
2. 过滤不在当前布局中的按键
3. **通过 `matchShortcut` 统一匹配书签快捷键**（自动处理 `isInInputElement`、`urlBlacklist`、`e.repeat`）
4. 检查书签是否真正绑定了 URL
5. 有 URL 的键位：通过 `openPage()` 打开 URL，设置 `currSelectKeyCode` 做视觉反馈
6. 匹配成功返回 `true` 阻断后续 task

**命令优先机制：** `globalShortcutTask` 在 App.vue script setup 顶层同步注册（先于子组件 setup），确保先执行处理命令。`keyboardTask` 后执行，作为命令的兜底处理书签。命令匹配成功时返回 `true` 阻断 `keyboardTask`。

### 鼠标交互

- Shift+点击 = 后台标签页打开
- Alt/Option+点击 = 新标签页打开
- 中键点击 = 后台标签页打开
- 普通点击 = 前台打开
- 视觉反馈：`keyboardState.currSelectKeyCode` 设置 200ms 后重置

---

## 与通用键盘引擎的关系

`keyboardBookmark` 不实现布局、渲染、主题，这些全部复用通用键盘引擎：

| 层级 | 所属 | 文档 |
|------|------|------|
| 布局定义（19 种） | 通用引擎 | [keyboard.md](../features/keyboard.md) |
| 键帽渲染（GMK/DSA/flat） | 通用引擎 | [keyboard.md](../features/keyboard.md) |
| 主题预设（81） | 通用引擎 | [keyboard.md](../features/keyboard.md) |
| 拖拽系统（moveable） | 通用基础设施 | [keyboard.md](../features/keyboard.md) |
| 书签数据绑定 | keyboardBookmark Widget | 本文档 |
| 书签快捷键执行 | keyboardBookmark（keyboardTask） | 本文档 |

配置命名空间也分为两块：

| 命名空间 | 配置文件 | 用途 |
|----------|----------|------|
| `keyboardCommon` | `src/logic/config/defaults.ts` | 视觉样式（布局、键帽、外壳、配色） |
| `keyboardBookmark` | `src/newtab/widgets/keyboardBookmark/config.ts` | Widget 业务数据（keymap、位置、来源模式） |

---

## Widget 注册与扩展点

- Widget 通过 glob 自动注册到 `src/newtab/widgets/registry.ts`（`index.ts` 导出 `config.ts` 中的元信息）
- Setting 面板注册在 `src/setting/registry.ts` 的 `widget` 分组中
- Setting 面板代码在 `src/setting/panes/keyboardBookmark/`
- Setting 图标注册在 `src/logic/constants/icons.ts` 的 `SETTING_ICON_META` 中

---

## 注意事项

- 修改 `keyboardBookmark` 配置字段时，**必须同步修改** `src/background/main.ts` 中的字段引用
- 第 0 层默认 `sourceFolderPath` 为 `'layer1'`，与 `bookmark-export.ts` 的 `EXPORT_LAYERS[0]` 和 `getCurrentLayerFolderTitle()` fallback 值一致，确保导出书签和解析书签使用同一个文件夹
- popup 修改书签后必须在 `handleCommit` 中调用 `flushConfigSync` 强制同步
- `isDragMode` 激活时，keydown handler 提前返回，防止拖拽 Widget 时误触书签打开
- 全局快捷键 `source=2` 时从 `keymap` 读取 URL 执行，详情见 [global-shortcut.md](../features/global-shortcut.md)
- `globalShortcutTask` 先于 `keyboardTask` 执行（命令优先），同一按键在命令有绑定时不会打开书签
- **多层书签**（source=1）：`layers` 数组固定 4 个元素，每层 `sourceFolderPath` 指向一个浏览器书签文件夹路径（如 `"NaiveTab/layer1"`）。所有外部调用统一通过 `getCurrentLayerFolderTitle()` 获取当前激活层的文件夹路径。层切换通过 `switchBookmarkLayer1-4` 全局命令快捷键触发，`activeLayer` 设备级持久化（`chrome.storage.local`），不云同步
- `findFolderByPath` 按路径精确匹配文件夹，避免了 DFS 同名匹配的不确定性。路径格式如 `"NaiveTab/layer1"` 或单层 `"layer1"`

---

## Layer 层切换架构

### 完整数据流

**路径 A：命令快捷键触发（主流路径，不依赖 newtab 页面是否存在）**

```
用户按下 layer 切换快捷键
  → CS/NEWtab 通过 Port 发送 MSG_KEYDOWN 到 SW
  → SW processKeydown → handleCommandShortcutKeydown
  → getCommandExecEnv 返回 'sw' → execSwCommand('switchBookmarkLayerN', tabId)
  → commands/registry.ts: switchBookmarkLayer (markLayerKeymapBuilding + buildAndSaveLayerKeymap)
    └─ markLayerKeymapBuilding 和 getCachedKeyboardBookmarkLayers 来自 config/cache.ts（避免循环依赖）
  → SW 端构建新层 keymap → chrome.storage.local.set({ keymap, activeLayer })
  → 触发 storage.onChanged，各端同步：
    ├── SW config/cache.ts: 更新 cachedSystemKeymap，清除 isBuildingLayerKeymap
    ├── SW messaging/toast.ts: 向当前活跃 tab 的 Port 发送 MSG_SWITCH_BOOKMARK_LAYER
    ├── NewTab shortcut-executor.ts: Port 消息显示 showToast
    └── CS index.ts: onChanged 更新 systemKeymap 本地缓存，Port 消息显示 toast
```

**路径 B：UI 点击 switchLayer()（消息驱动，原子写入）**

```
UI 点击 layer tab → switchLayer(layerIndex)
  → runtime.sendMessage({ type: MSG_SWITCH_BOOKMARK_LAYER_UI, layerIndex })
  → SW port-manager.ts: handleSwitchBookmarkLayerFromUI
    → markLayerKeymapBuilding()
    → buildAndSaveLayerKeymap(layerIndex)
    → chrome.storage.local.set({ keymap, activeLayer })  原子写入
    → sendLayerSwitchToast(layerIndex)
  → 触发 storage.onChanged，各端同步：
    ├── SW config/cache.ts: 更新 cachedSystemKeymap，清除 isBuildingLayerKeymap
    ├── NewTab bookmark-state.ts: 更新 state.systemKeymap
    └── CS index.ts: 更新 systemKeymap 本地缓存
```

**路径 C：popup 页面内 switchLayer() 触发**

```
popup 点击 layer tab → switchLayer(layerIndex)
  → runtime.sendMessage({ type: MSG_SWITCH_BOOKMARK_LAYER_UI, layerIndex })
  → 与路径 B 完全一致，SW 原子写入
```

三条路径统一通过 SW 执行 `buildAndSaveLayerKeymap`，原子写入 keymap + activeLayer，不存在中间状态。

### Toast 显示规则

| 路径 | newtab 页面 | 普通网页 |
|------|-----------|---------|
| A：命令快捷键 | Port 消息 `showToast` | `sendLayerSwitchToast` 通过 Port 发 toast |
| B/C：UI 点击 | Port 消息 `showToast` | `sendLayerSwitchToast` 通过 Port 发 toast |

newtab 和普通网页的 toast 统一通过 SW → Port 消息路径下发，各自使用 `showToast` 显示（Shadow DOM 隔离样式）。

所有路径均为原子写入，如果目标层 keymap 与当前相同，`onChanged` 不会触发。命令路径通过 `sendLayerSwitchToast` 始终通过 Port 发送 toast，确保用户始终获得反馈。

### 冷却机制

`config/cache.ts` 采用 `isBuildingLayerKeymap` 标志位防护：从 `markLayerKeymapBuilding()` 到 `onChanged` 完成期间始终为 true，书签快捷键被拦截。所有路径统一为 SW 原子写入，不存在多 writer 竞态窗口。

`isBuildingLayerKeymap` 有两类清除路径：
- **成功路径**：仅在 `storage.onChanged` 监听器（`config/cache.ts`）中清除，确保标志位在 storage 实际写入、`cachedSystemKeymap` 刷新后才释放。
- **非成功路径**（层未配置提前返回、解析异常）：在 `buildAndSaveLayerKeymap` 中直接清除。这两种情况均不写入 storage、不触发 `onChanged`，必须自行清除，否则标志位永久为 `true`，所有书签快捷键被永久拦截。

详见 [layer-keymap-builder.ts](../../src/background/commands/layer-keymap-builder.ts)。

**Toast 反馈**：`switchBookmarkLayer` 和 `cycleBookmarkLayers` 在执行层切换后始终调用 `sendLayerSwitchToast`，无论目标层 keymap 是否为空，确保用户每次切换都能获得视觉反馈。

### 设计决策说明（非问题）

以下是容易误认为是 bug 的设计决策，特此说明：

**所有路径统一为 SW 原子写入**

三条切层路径（命令快捷键、newtab UI 点击、popup 点击）统一通过 SW 执行 `buildAndSaveLayerKeymap`，原子写入 keymap + activeLayer。UI 端通过 `runtime.sendMessage` 通知 SW，不直接写入 storage。这消除了两步写入的中间状态，书签快捷键由 `isBuildingLayerKeymap` 标志位全程防护。

**多处 storage.onChanged 监听器**

`bookmark-state.ts`（newtab）、`cache.ts`（SW）、`logic.ts`（widget）各有独立的 `onChanged` 监听器，这是因为 Chrome 扩展的不同上下文（Content Script、Service Worker、newtab 页面）无法共享内存，必须各自监听 storage 变更来更新本地缓存。每个监听器只处理自己关心的 key，过滤规则不同是设计意图。

**exportKeymapToBrowser 只写到 layer1**

source=2（自定义 keymap）只有一套 keymap，没有 layer 概念。导出到浏览器书签时写入 layer1 并创建 layer2-4 空文件夹占位。如果用户需要利用多层功能，应切换到 source=1（系统书签）后手动配置其他 layer 的文件夹。这是两种数据源模式的职责边界。

**Setting 面板的 layer 视觉指示**

Setting 面板和 Popup 中 `BaseBookmarkLayerTabSwitcher` 组件已提供 layer 切换标签（pill tabs），active tab 有明确颜色区分。Widget 页面不提供常驻 layer 指示器，因为 layer 切换完全通过键盘快捷键完成，切换时已有 toast 通知反馈。
