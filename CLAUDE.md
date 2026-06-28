# NaiveTab 开发规范

浏览器新标签页扩展（Vue 3 + Vite + Reka UI）。详情见 `.claude/rules/` 和 `docs/`。

## 命令速查

```bash
pnpm dev                 # 开发模式（clear → prepare → background + web + js 并行）
pnpm build               # 生产构建（chrome + firefox）
pnpm build:debug         # 不压缩的 chrome 构建
pnpm typecheck           # vue-tsc --noEmit
pnpm test                # vitest（测试文件在 src/logic/__tests__/）
pnpm lint:fix            # ESLint --fix
pnpm check-patterns      # CSS 模式检查（v-bind()、&--modifier、Reka z-index）
```

**pre-commit 自动执行**：`lint-staged → typecheck → test --run → validate-registries → check-patterns`。提交前务必全部通过。

## 核心规则

- **输出必须中文**。不清楚先问再动手。改代码前先给方案。
- 代码改动后**主动更新**受影响的文档、注释、单测（见 [documentation-sync.md](.claude/rules/documentation-sync.md)）。
- 编码行为准则见 [coding-principles.md](.claude/rules/coding-principles.md)。
- **新增 Reka 组件必须先对照标杆**（shadcn/ui + Radix Themes），步骤见 [reka-ui.md](docs/architecture/reka-ui.md#新增-reka-组件检查清单)。

## 行为规则（`.claude/rules/`，通过 `opencode.json` 自动注入）

| 文件 | 内容 |
|------|------|
| [coding-principles.md](.claude/rules/coding-principles.md) | 编码行为准则（思考优先、简单至上、手术式改动、目标驱动） |
| [communication.md](.claude/rules/communication.md) | 中文输出、不猜测、先给方案 |
| [documentation-sync.md](.claude/rules/documentation-sync.md) | 代码改动后主动同步文档 |
| [no-hardcode.md](.claude/rules/no-hardcode.md) | 禁止硬编码图标（ICONS）和文本（i18n） |
| [workflow.md](.claude/rules/workflow.md) | 不启动 dev server、不改版本号、不重复造轮子 |
| [pitfalls.md](.claude/rules/pitfalls.md) | 踩坑索引 → [CSS](.claude/rules/pitfalls-css.md) / [Vue](.claude/rules/pitfalls-vue.md) / [配置](.claude/rules/pitfalls-config.md) / [快捷键](.claude/rules/pitfalls-keyboard.md) / [后台](.claude/rules/pitfalls-background.md) |

## 架构要点

### 4 个执行上下文

| 上下文 | 入口 | 限制 |
|--------|------|------|
| **newtab** | `src/newtab/` | Vue 页面，完整 DOM/BOM API |
| **CS** | `src/contentScripts/` | 注入普通网页，不可用 `localStorage` |
| **SW** | `src/background/` | Service Worker，不可用 DOM API |
| **popup** | `src/popup/` | 扩展弹窗 |

修改 `config/`、`keyboard/`、`shortcut/`、`utils/` 等共享代码时，必须逐一验证 4 个上下文。

### 构建系统

3 个 Vite 配置，分别构建不同入口：

| 配置 | 入口 | 产物 |
|------|------|------|
| `vite.config.ts` | `src/newtab/`、`src/popup/`、`src/options/` | 主 web 页面 |
| `vite.config.content.ts` | `src/contentScripts/index.ts` | CS（IIFE） |
| `vite.config.background.ts` | `src/background/main.ts` | SW（ES module） |

`src/manifest.ts` 动态生成 `manifest.json`，非静态文件。

### 自动注入（禁止手动 import）

- `vue` 全家桶（`ref`、`computed`、`watch` 等）— 全局自动导入
- `webextension-polyfill` → `browser` 变量 — 全局可用
- `dayjs` → `dayjs` 函数 — 全局可用
- `src/components/` 下所有组件 — 自动注册，直接用 `<NtXxx />`
- 路径别名 `@/` → `src/`

## 全局状态速查

```ts
// src/logic/config/state.ts
localConfig      // Widget 配置（响应式，自动持久化，云同步）
localState       // 本地状态（currAppearanceCode 等，持久化）

// src/logic/store/state.ts
globalState      // 运行时全局状态（不持久化，不云同步）
```

## src/logic/ 目录结构

| 目录 | 职责 |
|------|------|
| `config/` | 配置系统：默认值、合并、迁移、压缩、版本比较、响应式存储 |
| `config/sync/` | 云端同步：上传/下载/合并/导入导出、跨上下文监听 |
| `constants/` | 纯常量：图标（`ICONS`/`WIDGET_ICON_META`）、天气单位 |
| `image/` | 背景图系统：状态、图库、渲染、来源常量 |
| `keyboard/` | 键盘系统：布局转换、键帽主题（80+）、19 种布局定义 |
| `bookmark/` | 浏览器书签 API 封装、书签树解析 |
| `shortcut/` | 全局快捷键：命令定义、匹配核心、Port 连接 |
| `store/` | 运行时状态：全局状态、主题切换、DOM 副作用监听 |
| `utils/` | 基础设施：数据库、GA 上报、权限、通用工具 |
| `task/` | 任务调度：keydown 分发、rAF 定时器、事件总线 |

## 文档索引

开发时**先查对应文档**，确认既有设计后再动手。

| 文档 | 主题 |
|------|------|
| [config.md](docs/architecture/config.md) | 三层配置架构、配置迁移、主题系统 |
| [storage.md](docs/architecture/storage.md) | 存储与同步、Gzip 压缩 |
| [development.md](docs/conventions/development.md) | 编码风格（CSS/Vue/TS）+ 测试架构 |
| [messaging.md](docs/architecture/messaging.md) | 背景脚本消息传递 |
| [background.md](docs/architecture/background.md) | 背景图系统 |
| [global-shortcut.md](docs/features/global-shortcut.md) | 全局命令快捷键 |
| [bookmark.md](docs/features/bookmark.md) | 书签系统 |
| [keyboard.md](docs/features/keyboard.md) | 键盘布局、拖拽、主题 |
| [widget-dev.md](docs/widgets/widget-dev.md) | Widget 生命周期、WidgetWrap、定时任务 |
| [setting.md](docs/architecture/setting.md) | Setting 面板、注册、字段组件 |
| [task.md](docs/architecture/task.md) | 定时任务系统 |
| [background-modules.md](docs/architecture/background-modules.md) | SW 内部模块 |
| [moveable.md](docs/architecture/moveable.md) | Widget 拖拽定位 |
| [api.md](docs/architecture/api.md) | 外部 API 封装 |
| [reka-ui.md](docs/architecture/reka-ui.md) | Reka UI 封装规范 + 设计标杆 |
| [pitfalls.md](.claude/rules/pitfalls.md) | 踩坑索引（CSS/Vue/配置/快捷键/后台） |

## 核心开发要点

- **配置兼容性**：任何持久化配置修改必须走 `handleAppUpdate` 迁移，不能破坏老用户数据 → [pitfalls-config.md](.claude/rules/pitfalls-config.md)
- **后台脚本**：`onChanged` 监听器必须返回 `Promise`；修改 keyboard 配置时同步改 `config/cache.ts` → [pitfalls-background.md](.claude/rules/pitfalls-background.md)
- **样式 & 主题**：颜色用双元素数组 `[浅色, 深色]`；中性灰用 `--gray-alpha-xx` token；禁止 `v-bind()` 和 `&--modifier` → [pitfalls-css.md](.claude/rules/pitfalls-css.md)
- **图标 & 文本**：图标必须用 `ICONS` 常量，文本必须 i18n（`zh-CN.json` + `en-US.json` 同步更新）→ [no-hardcode.md](.claude/rules/no-hardcode.md)
- **Widget 规则**：用 `/add-widget` 技能或查 [REGISTRY-MAP.md](src/newtab/widgets/REGISTRY-MAP.md)；定时任务用 `addTimerTask`；根组件用 `WidgetWrap` 包裹
- **Setting 面板**：在 `SETTING_GROUPS` 注册，用 `src/setting/fields` 原子组件，禁止自行封装
- **权限管理**：非核心权限放 `optional_permissions`，首次使用时请求
- **发布**：version 由用户手动改；同步更新 `CHANGELOG.md`
- **不启动 dev server**：浏览器扩展 CLI 环境无法查看页面，type-check 通过即可
- **不改版本号**：`package.json` 的 version 只能由用户手动修改
- **不留历史包袱**：重构时直接更新所有消费者，禁止 re-export 保持"向后兼容"
- **禁止自动 Git 操作**：未经明确允许，禁止 `git commit/push/revert/reset`
