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
  isGlobalShortcutEnabled: true,              // 全局快捷键开关
  noModifierMode: false,                      // 无修饰键模式
  shortcutInInputElement: true,               // 输入框内是否触发全局快捷键
  globalShortcutModifiers: ['alt'],           // 全局快捷键修饰键
  urlBlacklist: string[],                     // URL 黑名单
  isNewTabOpen: false,                        // 始终在新标签页打开
  bindingMode: true,                          // source=1 键位绑定开关（所有层共用）
  defaultExpandFolder: null | string,         // 自动展开的书签文件夹标题（仅顺序模式）
  layers: [                                   // source=1 时最多 4 层，每层绑定一个浏览器书签文件夹
    { sourceFolderTitle: 'NaiveTab' },
    { sourceFolderTitle: '' },                // 空字符串表示未配置
    { sourceFolderTitle: '' },
    { sourceFolderTitle: '' },
  ],
  keymap: Record<string, TBookmarkEntry>,     // key code → {url, name?}
  layout: { ... }                             // 页面位置（vw/vh）
}
```

**PRESERVE_FIELDS** = `['source', 'isGlobalShortcutEnabled', 'noModifierMode', 'shortcutInInputElement', 'globalShortcutModifiers', 'urlBlacklist', 'keymap', 'layers', 'bindingMode']` — 快速重置时保护用户数据。

**activeLayer**（当前激活层索引）不存储在 `localConfig` 中（会被云同步），而是以模块级变量 + `chrome.storage.local` 独立 key（`naive-tab-activeLayer`）管理，设备级持久化、不同步。

---

## 双模式运行机制

### source = 1（系统书签）

通过 `chrome.bookmarks` API 读取浏览器书签树，由 `parseBookmarkFolder()` 解析器构建 keymap。支持**多层书签**机制：最多 4 层，每层绑定一个独立的浏览器书签文件夹，通过全局命令快捷键（如 `Alt+1/2/3/4`）切换。`bindingMode` 为所有层共用同一个开关。层激活状态（`activeLayer`）设备级持久化（`chrome.storage.local`），不云同步；`layers` 配置跨设备同步（`chrome.storage.sync`）。

进一步分为两种子模式：

#### 顺序模式（`bindingMode = false`，默认）

- 书签按深度优先遍历顺序填充到键盘键位
- 首键始终为"返回"按钮
- 支持文件夹导航栈（`selectedFolderTitleStack`）
- `defaultExpandFolder` 配置初始展开的文件夹
- 书签名称/文件夹名以 `_` 开头的条目不参与解析
- keymap 按遍历顺序填充，供全局快捷键使用

#### 键位绑定模式（`bindingMode = true`）

- 仅读取带有 `[X]` 前缀的书签（如 `[Q] Google`、`[F1] 日历`），精确绑定到对应键位
- 无前缀书签被忽略
- 不支持文件夹导航
- 用户可在设置面板或 popup 通过键盘预览点击键位，选择浏览器书签后系统自动为其添加 `[X]` 前缀
- 也支持直接在表单区编辑 URL/名称，输入时自动同步到 Chrome 书签
- 解绑时自动移除 `[X]` 前缀
- 需要 `bookmarks` 可选权限，未授权时弹出授权对话框

书签解析器详见 [bookmark-parser.ts](../../src/logic/keyboard/bookmark-parser.ts)。

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
                    ├── keycap__img    — favicon / 文件夹图标
                    └── keycap__name   — 书签名称
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
2. 屏蔽修饰键组合
3. 过滤不在当前布局中的按键
4. **命令快捷键开启无修饰键模式时静默跳过**（`keyboardCommand.noModifierMode` 为 true 时返回，避免与命令快捷键冲突）
5. folder/back 类型：调用 `handleSpecialKeycapExec` 导航书签树
6. 其他：通过 `openPage()` 打开 URL，设置 `currSelectKeyCode` 做视觉反馈

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
| 布局定义（16 种） | 通用引擎 | [keyboard.md](../features/keyboard.md) |
| 键帽渲染（GMK/DSA/flat） | 通用引擎 | [keyboard.md](../features/keyboard.md) |
| 主题预设（80+） | 通用引擎 | [keyboard.md](../features/keyboard.md) |
| 拖拽系统（moveable） | 通用基础设施 | [keyboard.md](../features/keyboard.md) |
| 书签数据绑定 | keyboardBookmark Widget | 本文档 |
| 全局快捷键执行 | keyboardBookmark + shortcut-executor | [global-shortcut.md](../features/global-shortcut.md) |

配置命名空间也分为两块：

| 命名空间 | 配置文件 | 用途 |
|----------|----------|------|
| `keyboardCommon` | `src/logic/keyboard/keyboard-config.ts` | 视觉样式（布局、键帽、外壳、配色） |
| `keyboardBookmark` | `src/newtab/widgets/keyboardBookmark/config.ts` | Widget 业务数据（keymap、位置、来源模式） |

---

## Widget 注册与扩展点

- Widget 注册在 `src/newtab/widgets/keyboardBookmark/registry.ts`
- Setting 面板注册在 `src/setting/registry.ts` 的 `widget` 分组中
- Setting 面板代码在 `src/setting/panes/keyboardBookmark/`
- Setting 图标注册在 `src/logic/icons.ts` 的 `SETTING_ICON_META` 中

---

## 注意事项

- 修改 `keyboardBookmark` 配置字段时，**必须同步修改** `src/background/main.ts` 中的字段引用
- popup 修改书签后必须在 `handleCommit` 中调用 `flushConfigSync` 强制同步
- `isDragMode` 激活时，keydown handler 提前返回，防止拖拽 Widget 时误触书签打开
- 全局快捷键 `source=2` 时从 `keymap` 读取 URL 执行，详情见 [global-shortcut.md](../features/global-shortcut.md)
- 命令快捷键开启无修饰键模式（`noModifierMode`）时，键盘 Widget 的 keydown handler 会被短路，按键由命令快捷键独占处理
- **多层书签**（source=1）：`layers` 数组固定 4 个元素，每层 `sourceFolderTitle` 指向一个浏览器书签文件夹。所有外部调用统一通过 `getCurrentLayerFolderTitle()` 获取当前激活层的文件夹名称。层切换通过 `switchBookmarkLayer1-4` 全局命令快捷键触发，`activeLayer` 设备级持久化（`chrome.storage.local`），不云同步
- `findFolderByName` 通过 DFS 按 title 匹配文件夹，若两个层绑定了同名但不同位置的文件夹，可能匹配到非预期结果。这是现有机制的已知限制，留作后续迭代
