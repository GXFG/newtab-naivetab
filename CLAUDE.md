# NaiveTab 开发规范

NaiveTab 是一个浏览器新标签页扩展项目。本文档是 AI 开发入口，详情见 `.claude/rules/` 和 `docs/`。

**核心规则**：
- 所有输出**必须中文**。遇到不清楚的**先问再动手**。改代码前**先给方案**。
- 代码改动后**主动更新**受影响的文档、注释、单测（见 [documentation-sync.md](.claude/rules/documentation-sync.md)）。
- 编码行为准则见 [coding-principles.md](.claude/rules/coding-principles.md)。

技能：`/add-widget` 新增 Widget、`/add-command` 新增命令快捷键。

---

# src/logic/ 目录结构

| 目录 | 职责 | 核心文件 |
|------|------|----------|
| `config/` | 配置系统：默认值、合并、迁移、压缩、版本比较、Widget 配置重置、响应式存储 | `state.ts`（`localConfig`/`localState`）、`update.ts`（版本迁移）、`reset.ts` |
| `config/sync/` | 云端同步：上传/下载/合并/导入导出、同步状态 computed、跨上下文监听、防竞态 | `upload.ts`、`loader.ts`、`manage.ts`、`state.ts`、`pending-writes.ts` |
| `constants/` | 纯常量：应用、字体、图标、搜索、URL、天气单位 | `icons.ts`（`ICONS`/`WIDGET_ICON_META`）、`weather.ts` |
| `image/` | 背景图系统：状态、图库、渲染、工具、来源常量 | `state.ts`、`gallery.ts`、`service.ts`、`utils.ts`、`constants.ts` |
| `keyboard/` | 键盘系统：布局转换、键帽主题、常量、书签状态/导出、19 种布局定义 | `keyboard-layout.ts`、`themes/`（80+ 主题）、`layouts/`（19 种布局） |
| `bookmark/` | 纯书签：浏览器书签 API 封装、书签树解析、书签变更操作 | `api.ts`、`parser.ts`、`mutations.ts` |
| `shortcut/` | 全局快捷键：命令定义、匹配核心、Port 连接、newtab 页面执行器 | `shortcut-command.ts`、`matcher.ts`、`port.ts`、`shortcut-executor.ts` |
| `store/` | 运行时状态：全局状态、样式工具、主题切换、DOM 副作用监听 | `state.ts`（`globalState`）、`style.ts`、`theme.ts`、`dom.ts` |
| `utils/` | 基础设施：数据库、GA 上报、权限、通用工具 | `database.ts`、`gtag.ts`、`permission.ts`、`common.ts` |
| `task/` | 任务调度：keydown 事件分发、rAF 定时器、页面可见性/focus 监听、事件总线 | `index.ts`、`keydown.ts`、`timer.ts`、`events.ts` |

根目录独立子系统：`moveable.ts`（拖拽定位）、`guide.ts`（引导）、`poetry.ts`（诗词）。

---

# 文档索引

开发时**必须先查阅对应文档**，确认既有设计后再动手。

| 文档 | 主题 |
|------|------|
| [config.md](docs/architecture/config.md) | 三层配置架构、配置迁移、主题系统 |
| [storage.md](docs/architecture/storage.md) | 存储与同步、Gzip 压缩、版本感知同步 |
| [development.md](docs/conventions/development.md) | 编码风格（CSS/Vue/TS）+ 测试架构 |
| [messaging.md](docs/architecture/messaging.md) | 背景脚本消息传递 |
| [background.md](docs/architecture/background.md) | 背景图系统 |
| [global-shortcut.md](docs/features/global-shortcut.md) | 全局命令快捷键 |
| [bookmark.md](docs/features/bookmark.md) | 书签系统、双模式、同步、权限 |
| [keyboard.md](docs/features/keyboard.md) | 键盘布局、拖拽、主题 |
| [widget-dev.md](docs/widgets/widget-dev.md) | Widget 生命周期、WidgetWrap、定时任务 |
| [setting.md](docs/architecture/setting.md) | Setting 面板、注册、字段组件 |
| [task.md](docs/architecture/task.md) | 定时任务系统 |
| [background-modules.md](docs/architecture/background-modules.md) | SW 内部模块 |
| [moveable.md](docs/architecture/moveable.md) | Widget 拖拽定位系统 |
| [api.md](docs/architecture/api.md) | 外部 API 封装（天气、图片、搜索、诗词） |
| [pitfalls.md](.claude/rules/pitfalls.md) | 踩坑索引（CSS/Vue/配置/快捷键/后台） |

## 行为规则（`.claude/rules/` 自动加载）

| 文件 | 内容 |
|------|------|
| [coding-principles.md](.claude/rules/coding-principles.md) | 编码行为准则（思考优先、简单至上、手术式改动、目标驱动） |
| [communication.md](.claude/rules/communication.md) | 中文输出、不猜测、先给方案 |
| [documentation-sync.md](.claude/rules/documentation-sync.md) | 代码改动后主动同步文档 |
| [no-hardcode.md](.claude/rules/no-hardcode.md) | 禁止硬编码图标（ICONS）和文本（i18n） |
| [workflow.md](.claude/rules/workflow.md) | 不启动 dev server、不改版本号、不重复造轮子 |
| [pitfalls.md](.claude/rules/pitfalls.md) | 踩坑索引 → [CSS](.claude/rules/pitfalls-css.md) / [Vue](.claude/rules/pitfalls-vue.md) / [配置](.claude/rules/pitfalls-config.md) / [快捷键](.claude/rules/pitfalls-keyboard.md) / [后台](.claude/rules/pitfalls-background.md) |

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

---

# 核心开发要点

- **配置兼容性**：任何持久化配置修改不能破坏老用户数据，必须走 `handleAppUpdate` 迁移 → [pitfalls-config.md](.claude/rules/pitfalls-config.md)
- **后台脚本**：`onChanged` 监听器必须返回 `Promise`；修改 keyboard 配置时同步改 `config/cache.ts` → [pitfalls-background.md](.claude/rules/pitfalls-background.md)
- **样式 & 主题**：颜色用双元素数组 `[浅色, 深色]`；中性灰用 `--gray-alpha-xx` token → [pitfalls-css.md](.claude/rules/pitfalls-css.md)
- **Widget 规则**：用 `/add-widget` 技能或查 [REGISTRY-MAP.md](src/newtab/widgets/REGISTRY-MAP.md)；定时任务用 `addTimerTask`；根组件用 `WidgetWrap` 包裹 → [pitfalls-vue.md](.claude/rules/pitfalls-vue.md)
- **Setting 面板**：在 `SETTING_GROUPS` 注册，用 `src/setting/fields` 原子组件，禁止自行封装 → [setting.md](docs/architecture/setting.md)
- **权限管理**：非核心权限放 `optional_permissions`，首次使用时请求 → [permission.ts](src/logic/utils/permission.ts)
- **发布**：version 由用户手动改；同步更新 `CHANGELOG.md`
- **注册点校验**：pre-commit 自动运行 `scripts/check/validate-registries.ts`
