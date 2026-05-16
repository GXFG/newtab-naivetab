# NaiveTab 开发规范

NaiveTab 是一个浏览器新标签页扩展项目。本文档定义开发规范，所有 AI 必须遵守。

**MUST**：
- 所有输出**必须中文**（对话、工具描述、注释、文档）。
- 遇到不清楚的点**不要猜测**，及时确认。改代码前**先给方案**。
- 代码改动后**主动更新**受影响的文档和注释（`CLAUDE.md`、`docs/`、路径注释）。
- 本文件持续维护：新规律及时补充，过时描述及时修正。

新增 Widget 使用 `/add-widget` 技能。

---

# src/logic/ 目录结构

| 目录 | 职责 | 核心文件 |
|------|------|----------|
| `config/` | 配置系统：默认值、合并、迁移、压缩、版本比较、Widget 配置重置、响应式存储 | `state.ts`（`localConfig`/`localState`）、`update.ts`（版本迁移）、`reset.ts`（Widget 配置重置） |
| `config/sync/` | 云端同步：上传/下载/合并/导入导出、同步状态 computed、跨上下文监听 | `upload.ts`（上传引擎）、`loader.ts`（拉取合并）、`manage.ts`（导入导出）、`state.ts`（同步状态与监听） |
| `constants/` | 纯常量：应用、字体、图标、搜索、URL、天气单位 | `icons.ts`（`ICONS`/`WIDGET_ICON_META`）、`weather.ts`（天气单位映射） |
| `image/` | 背景图系统：状态、图库、渲染、工具、来源常量 | `state.ts`（状态）、`gallery.ts`（图库）、`service.ts`（生命周期）、`utils.ts`（图片工具）、`constants.ts`（图片来源枚举） |
| `keyboard/` | 键盘系统：布局转换、键帽主题、常量、书签状态/导出、19 种布局定义 | `keyboard-layout.ts`（布局转换）、`themes/`（80+ 主题，4 系列 6 文件）、`keyboard-constants.ts`（强调键/默认映射）、`bookmark-state.ts`（书签共享状态）、`bookmark-export.ts`（书签导出）、`layouts/`（19 种布局） |
| `bookmark/` | 纯书签：浏览器书签 API 封装、书签树解析、书签变更操作 | `api.ts`（`getBrowserBookmark`/`getFaviconFromUrl`）、`parser.ts`（`parseBookmarkFolder`/`findFolderByPath`）、`mutations.ts`（`swapBookmarksInSourceFolder`/`removeBookmarkFromSourceFolder`） |
| `shortcut/` | 全局快捷键：命令定义、匹配核心、Port 连接、newtab 页面执行器 | `shortcut-command.ts`（命令定义）、`matcher.ts`（匹配）、`port.ts`（长连接）、`utils.ts`（工具）、`shortcut-executor.ts`（newtab 页面统一执行器） |
| `store/` | 运行时状态：全局状态、样式工具、主题切换、DOM 副作用监听 | `state.ts`（`globalState`）、`style.ts`（`getStyleField`）、`theme.ts`（主题与语言）、`dom.ts`（DOM 同步） |
| `utils/` | 基础设施：数据库、GA 上报、权限、通用工具 | `database.ts`、`gtag.ts`、`permission.ts`、`common.ts` |
| `task/` | 任务调度：keydown 事件分发、rAF 定时器、页面事件 | `index.ts`（统一导出）、`keydown.ts`、`timer.ts`、`events.ts` |

根目录独立子系统：`moveable.ts`（拖拽定位）、`guide.ts`（引导）、`poetry.ts`（诗词）。

---

# 文档索引

开发时**必须先查阅对应文档**，确认既有设计后再动手。

| 文档 | 主题 |
|------|------|
| [config.md](docs/architecture/config.md) | 三层配置架构、配置迁移、主题系统 |
| [storage.md](docs/architecture/storage.md) | 存储与同步、Gzip 压缩、版本感知同步、IndexedDB |
| [development.md](docs/conventions/development.md) | 编码风格（CSS/Vue/TS）+ 测试架构 |
| [messaging.md](docs/architecture/messaging.md) | 背景脚本消息传递 |
| [background.md](docs/architecture/background.md) | 背景图系统 |
| [global-shortcut.md](docs/features/global-shortcut.md) | 全局命令快捷键 |
| [bookmark.md](docs/features/bookmark.md) | 书签系统、双模式、同步、权限 |
| [keyboard.md](docs/features/keyboard.md) | 键盘布局、拖拽、主题 |
| [widget-dev.md](docs/widgets/widget-dev.md) | Widget 生命周期、WidgetWrap、定时任务 |
| [keyboard-bookmark-widget.md](docs/widgets/keyboard-bookmark-widget.md) | KeyboardBookmark Widget |
| [search-widget.md](docs/widgets/search-widget.md) | Search Widget |
| [setting.md](docs/architecture/setting.md) | Setting 面板、注册、字段组件 |
| [task.md](docs/architecture/task.md) | 定时任务系统 |
| [background-modules.md](docs/architecture/background-modules.md) | SW 内部模块 |
| [moveable.md](docs/architecture/moveable.md) | Widget 拖拽定位系统 |
| [api.md](docs/architecture/api.md) | 外部 API 封装（天气、图片、搜索、诗词） |
| [pitfalls.md](.claude/rules/pitfalls.md) | 项目踩坑记录（唯一来源） |

发布材料：`docs/app-store/store-description-zh.txt` / `store-description-en.txt`

## 行为规则（`.claude/rules/` 自动加载）

| 文件 | 内容 |
|------|------|
| [communication.md](.claude/rules/communication.md) | 中文输出、不猜测、先给方案 |
| [documentation-sync.md](.claude/rules/documentation-sync.md) | 代码改动后主动同步文档 |
| [no-hardcode.md](.claude/rules/no-hardcode.md) | 禁止硬编码图标（ICONS 常量）和文本（i18n） |
| [workflow.md](.claude/rules/workflow.md) | 不启动 dev server、不改版本号、不重复造轮子 |
| [pitfalls.md](.claude/rules/pitfalls.md) | 项目历史踩坑清单 |

---

# 全局状态速查

```ts
// src/logic/config/state.ts（localConfig / localState）
// src/logic/store/state.ts（globalState）
localConfig      // Widget 配置（响应式，自动持久化，云同步）
localState       // 本地状态（currAppearanceCode 等，持久化）
globalState      // 运行时全局状态（不持久化，不云同步）
```

完整字段说明见 [config.md](docs/architecture/config.md#三层配置架构)。

键盘事件由 `matchShortcut` 分发，`isInInputElement()` 决定输入框内是否生效。面板打开时 `Escape` 由 `task.ts` 拦截，通过 `drawerStack` 逐层关闭子 Drawer，最终关闭 Setting 主面板。

---

# 核心开发要点

## 配置兼容性

任何持久化配置修改**不能破坏老用户数据**，popup 修改配置后**必须调用 `flushConfigSync`**。详细规则见 [.claude/rules/pitfalls.md](.claude/rules/pitfalls.md#配置系统)。详见 [config.md](docs/architecture/config.md#配置迁移系统)。

## 后台脚本

`src/background/main.ts`（胶水层）及 `src/background/config/cache.ts`（配置缓存）以 Service Worker 运行。修改 keyboard 配置时，重命名/删除字段必须同步修改 `config/cache.ts`。`onChanged` 监听器必须返回 `Promise`（详见 [pitfalls.md](.claude/rules/pitfalls.md#后台脚本)）。详见 [background-modules.md](docs/architecture/background-modules.md)。

## 样式 & 主题

颜色使用**双元素数组** `[浅色, 深色]`，由 `currAppearanceCode` 自动取对应值。中性灰色用 `--gray-alpha-xx` 系列 token，禁止硬编码 `rgba(128,128,128,...)`。详见 [config.md](docs/architecture/config.md#主题与颜色系统)、[development.md](docs/conventions/development.md#编码风格)。

## Widget 硬规则

- 新增 Widget 时必须查阅 [REGISTRY-MAP.md](src/newtab/widgets/REGISTRY-MAP.md) 或使用 `/add-widget` 技能
- 共用 Setting 面板时必须维护 `WIDGET_SETTING_PANE_MAP`
- 必须在 `WIDGET_GROUPS` 对应分组中追加 code
- 定时任务必须用 `addTimerTask`/`removeTimerTask`，禁止 `setInterval`
- 根组件必须用 `<WidgetWrap :widget-code="WIDGET_CODE">` 包裹
- 其他限制见 [pitfalls.md](.claude/rules/pitfalls.md#vue-组件)

## Setting 面板

必须在 `src/setting/registry.ts` 的 `SETTING_GROUPS` 中注册，组件文件为 `src/setting/panes/{code}/index.vue`。必须使用 `src/setting/fields` 中的原子组件，禁止自行封装。详见 [setting.md](docs/architecture/setting.md)。

## 权限管理

非核心权限声明在 `optional_permissions` 中，请求逻辑统一在 `src/logic/utils/permission.ts`。仅在用户**首次主动使用**时请求授权。

## 发布

version 只能由用户手动修改。发布前同步更新 `CHANGELOG.md`，格式：`[+/^/#/!] 描述`。

## 注册点校验

pre-commit 会自动运行 `scripts/validate-registries.ts`，检查 Widget/Command 注册完整性和 i18n key 同步。遗漏注册点会导致提交失败。
