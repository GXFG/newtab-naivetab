# NaiveTab 开发规范

浏览器新标签页扩展（Vue 3 + Vite + Reka UI）。详情见 `.claude/rules/` 和 `docs/`。

## 命令速查

```bash
pnpm dev                 # 开发模式（clear → prepare → background + web + js 并行）
pnpm build               # 生产构建（chrome + firefox）
pnpm build:debug         # 不压缩的 chrome 构建
pnpm typecheck           # vue-tsc --noEmit
pnpm test                # vitest（用例放在被测模块旁的 __tests__/）
pnpm lint                # ESLint 校验（不改文件）
pnpm lint:fix            # ESLint --fix
pnpm check-patterns      # CSS 模式检查（v-bind()、&--modifier、:deep() 误用、Reka z-index）
pnpm check-boundaries    # 架构边界检查（4 个执行上下文的 import 方向 + 循环依赖）
pnpm impact <文件|目录>   # 改动影响面：依赖者、涉及上下文、相关测试、已知风险
pnpm gen:icons           # 重新生成离线图标集（新增/更换图标后必须执行，见 docs/architecture/icons.md）
pnpm check:icons         # 校验产物与常量表一致（只在内存生成比对，不落盘；pre-commit 用）
```

**改共享层前先跑 `pnpm impact`**：输出「谁依赖它、波及哪些执行上下文、哪些测试会覆盖、有哪些已知坑」。动手前看一眼，比事后被检查拦下便宜得多。

**pre-commit 自动执行**：`lint-staged → typecheck → test --run → format:check → check:icons → validate-registries → check-patterns → check-boundaries`。提交前务必全部通过，禁止 `--no-verify` 绕过。

**本地不进 pre-commit、发版前手动跑的检查**：覆盖率门槛（`pnpm test:coverage`，阈值在 `vite.config.ts` 的 `test.coverage.thresholds`）与完整构建（`pnpm release` 内含 `build:chrome` / `build:firefox`，抓 manifest 生成、i18n 编译等构建期问题）。本项目不设代码检查类 CI，唯一保留的工作流是 `docs-deploy.yml`（部署 site 站）。

## 核心规则

- **输出必须中文**。不清楚先问再动手。改代码前先给方案。
- **问题分析前置**：动手前先判定「这真的是问题吗」。是 → 修复；不是（设计如此、框架特性、有意为之）→ 在代码里写清原因注释，避免下次又被当成 bug；不确定的点先问。修掉非 bug 类"问题"后必须回填 `docs/` 的设计说明 → [workflow.md](.claude/rules/workflow.md#日常规则)
- 代码改动后**主动更新**受影响的文档、注释、单测（见 [documentation-sync.md](.claude/rules/documentation-sync.md)）。
- 编码行为准则见 [coding-principles.md](.claude/rules/coding-principles.md)：思考优先、**库优先（不自造轮子，含脚本）**、简单至上、手术式改动、目标驱动。
- **新增 Reka 组件必须先对照标杆**（shadcn/ui + Radix Themes），步骤见 [reka-ui.md](docs/architecture/reka-ui.md#新增-reka-组件检查清单)。

## 行为规则（`.claude/rules/`，改动前按需查阅）

| 文件 | 内容 |
|------|------|
| [coding-principles.md](.claude/rules/coding-principles.md) | 编码行为准则（思考优先、**库优先**、简单至上、手术式改动、目标驱动） |
| [communication.md](.claude/rules/communication.md) | 中文输出、不猜测、先给方案 |
| [documentation-sync.md](.claude/rules/documentation-sync.md) | 代码改动后主动同步文档 |
| [no-hardcode.md](.claude/rules/no-hardcode.md) | 禁止硬编码图标（ICONS）和文本（i18n） |
| [workflow.md](.claude/rules/workflow.md) | **改动半径**、**问题分析前置**、基线先行、新增行为先有失败用例、检查失败不绕过；不启动 dev server、不改版本号 |
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
| `keyboard/` | 键盘系统：布局转换、键帽主题、布局定义（清单以 `layouts/index.ts`、`themes/index.ts` 为准） |
| `bookmark/` | 浏览器书签 API 封装、书签树解析 |
| `calendar/` | 日历：适配层（唯一依赖 tyme4ts，只出农历与黄历）+ 节假日 ICS 订阅（预设地区 + 自定义）+ 通用节日表 + 网格布局 |
| `shortcut/` | 全局快捷键：命令定义、匹配核心、Port 连接 |
| `store/` | 运行时状态：全局状态、主题切换、DOM 副作用监听 |
| `utils/` | 基础设施：数据库、GA 上报、权限、通用工具 |
| `task/` | 任务调度：keydown 分发、rAF 定时器、事件总线 |

## 文档索引

开发时**先查对应文档**，确认既有设计后再动手。

- **全量索引 + 写作约定 + 什么内容该放哪种载体**：[docs/README.md](docs/README.md)
- **某个设计为什么是这样、否决过什么方案**：[docs/decisions/](docs/decisions/)

下表只列高频入口：

| 文档 | 主题 |
|------|------|
| [config.md](docs/architecture/config.md) | 三层配置架构、配置迁移、主题系统 |
| [storage.md](docs/architecture/storage.md) | 存储与同步、Gzip 压缩 |
| [messaging.md](docs/architecture/messaging.md) | 三上下文通信、三层兜底 |
| [background-modules.md](docs/architecture/background-modules.md) | SW 内部模块、启动顺序、层切换冷却 |
| [setting.md](docs/architecture/setting.md) | 设置面板结构、注册、drawerStack |
| [keyboard.md](docs/features/keyboard.md) | 键盘布局、拖拽、主题 |
| [bookmark.md](docs/features/bookmark.md) | 书签系统、层绑定 |
| [global-shortcut.md](docs/features/global-shortcut.md) | 命令体系与执行路由 |
| [widget-dev.md](docs/widgets/widget-dev.md) | Widget 生命周期、WidgetWrap、定时任务 |
| [reka-ui.md](docs/architecture/reka-ui.md) | Reka UI 封装规范 + 设计标杆 |
| [ai-collaboration.md](docs/conventions/ai-collaboration.md) | 三层约束模型、架构边界规则 |
| [pitfalls.md](.claude/rules/pitfalls.md) | 踩坑索引（CSS/Vue/配置/快捷键/后台） |

## 核心开发要点

- **配置兼容性**：任何持久化配置修改必须在 `config/migrations.ts` 的 `MIGRATION_STEPS` 追加迁移步骤（**不要**在 `handleAppUpdate` 里写 `if`，导入路径不经过它），不能破坏老用户数据 → [pitfalls-config.md](.claude/rules/pitfalls-config.md)
- **后台脚本**：`onChanged` 监听器必须返回 `Promise`；修改 keyboard 配置时同步改 `config/cache.ts` → [pitfalls-background.md](.claude/rules/pitfalls-background.md)
- **样式 & 主题**：颜色用双元素数组 `[浅色, 深色]`；中性灰用 `--gray-alpha-xx` token；禁止 `v-bind()`、`&--modifier` 和非 scoped 样式里的 `:deep()` → [pitfalls-css.md](.claude/rules/pitfalls-css.md)
- **图标 & 文本**：图标必须用 `ICONS` 常量，文本必须 i18n（`zh-CN.json` + `en-US.json` 同步更新）→ [no-hardcode.md](.claude/rules/no-hardcode.md)
- **图标离线**：图标统一从 `@iconify/vue/offline` 引入，数据由 `pnpm gen:icons` 从 `ICONS` / `COMMAND_ICONS` 生成（`src/logic/constants/icon-set.json`，需提交）。**新增图标后不重跑生成脚本 = 渲染空白**，`icon-set.test.ts` 会拦；产物是否与常量表一致由 `pnpm check:icons` 在 pre-commit 校验 → [icons.md](docs/architecture/icons.md)
- **用户反馈**：toast 唯一入口是 `showToast`（`@/common/toast`，顶部胶囊 toast，`success`/`error`/`warning`/`info`），不要自建提示组件或页面内常驻结果文案
- **Widget 规则**：用 `/add-widget` 技能或查 [REGISTRY-MAP.md](src/newtab/widgets/REGISTRY-MAP.md)；定时任务用 `addTimerTask`，只需按天刷新（日期文本、「今天」标记）用 `addDailyTask`；根组件用 `WidgetWrap` 包裹
- **Setting 面板**：在 `SETTING_GROUPS` 注册，用 `src/setting/fields` 原子组件，禁止自行封装
- **权限管理**：非核心权限放 `optional_permissions`，首次使用时请求
- **发布**：version 由用户手动改；同步更新 `CHANGELOG.md`（**面向用户**，合并同类项、不写内部实现细节）→ [documentation-sync.md](.claude/rules/documentation-sync.md#changelog-写作规则)
- **不启动 dev server**：浏览器扩展 CLI 环境无法查看页面，type-check 通过即可
- **不改版本号**：`package.json` 的 version 只能由用户手动修改
- **不留历史包袱**：重构时直接更新所有消费者，禁止 re-export 保持"向后兼容"
- **依赖升级**：`vue-tsc` 必须锁定 `3.3.12`（升到 3.3.14 后模板里的 `localConfig` / `ICONS` 会批量误报 `TS2339`）；Vite 8 底层是 rolldown，函数式 `output.manualChunks` 不生效，不要按它设计分包
- **依赖取舍**：本项目**不为减小体积替换库**，但**已废弃/不再维护**的依赖（如 `crypto-js`）要换掉；判断标准是运行时行为与维护状态，不是 bundle 大小。能用平台 API 解决的通用能力优先用平台 API —— 例如内容指纹用 WebCrypto 的 SHA-256（`sync/fingerprint.ts`），不引第三方哈希库
- **禁止自动 Git 操作**：未经明确允许，禁止 `git commit/push/revert/reset`
