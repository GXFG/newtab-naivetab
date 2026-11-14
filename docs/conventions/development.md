# 开发约定

## 环境要求

- **Node.js**：`>=26.0.0`（与 `package.json` 的 `engines` 一致）
  - 使用 **Node 26**（Active LTS，EOL 2029-04）；实测测试耗时比 Node 22 快约 19%
  - 选 26 而非 24：Node 24 已于 2026-10 进入 Maintenance（只修 bug，不再加特性）
  - 依赖侧其实更宽松（最严的 `npm-run-all2` 只要 `>=22.22.2`），这里收紧到 26 是为了统一构建环境
  - 版本文件：`.node-version`，供 fnm / nvm / Volta 等版本管理器读取
  - `pnpm-workspace.yaml` 已开启 `engineStrict: true`：Node 版本不符时 `pnpm install` 会直接失败（`ERR_PNPM_UNSUPPORTED_ENGINE`），不会静默用错版本构建
- **pnpm**：`12.16.1`（见 `package.json` 的 `packageManager`）

## 编码风格

### CSS

**BEM 命名：** `block__element--modifier`。`block` 使用 camelCase，子元素用 `__`，修饰符用 `--`。

- **必须嵌套书写**：子元素和 modifier 必须嵌套在父级选择器内，不得平铺到根级
- `&` 只允许用于伪类/伪元素（`&:hover`）或嵌套完整类名（`&.parent-class`）
- Widget 样式外层使用 `#widgetCode`（由 WidgetWrap 自动设置 id）

CSS 踩坑（`&--modifier` 禁止、`v-bind()` 禁止、`rgba()` + `var()` 等）详见 [pitfalls-css.md](../../.claude/rules/pitfalls-css.md)。

- **使用项目 Token**：颜色用 `--nt-*` 系列（`--nt-primary-color`、`--nt-text-primary`、`--nt-gray-*` 等），详见 [tokens.css](../../src/styles/tokens.css)

### Vue 组件

- `<script setup lang="ts">`
- Props：`withDefaults(defineProps<{}>(), {})`
- 双向绑定：`defineModel()`，多字段用具名绑定
- 内部多字段用 `reactive`，单一值用 `ref`
- 组件非全局注册，使用前必须 `import`

### 函数声明

优先箭头函数，不使用 `function` 声明（组件和需要提升的除外）。

### 导入顺序

1. 第三方库（vue、reka-ui、@vueuse）
2. 内部模块（@/logic/*、@/types/*）
3. 相对路径（./、../）

`import type` 与值导入可合并一行。

### 命名规范

| 类型 | 风格 | 示例 |
|------|------|------|
| 类型/接口 | PascalCase | `SettingMeta`、`TWidgetConfig` |
| 变量/函数 | camelCase | `createSettingMeta` |
| 常量 | UPPER_SNAKE_CASE | `SETTING_GROUPS`、`ICONS` |
| 文件 | kebab-case | `setting-registry.ts` |
| Vue 组件 | PascalCase | `SettingPaneContent.vue` |
| CSS 类名 | camelCase + BEM | `clockDigital__container` |

### 模块拆分

提取代码到新模块后，**禁止重导出做兼容**。直接修改所有调用方的 import 指向新模块。

### TypeScript

- 函数参数与返回值必须显式标注
- 纯类型使用 `import type`
- 未使用的变量必须删除
- 一行超过 120 字符时换行

### 注释

多行注释用 `/** ... */`，禁止 `//` 逐行拼接。

### 错误处理

- 用户可见提示统一用 `showToast`（`@/common/toast`，顶部胶囊 toast，Shadow DOM 隔离样式，提供 `success`/`error`/`warning`/`info` 四个方法，默认 3.5s 自动消失），不要自建提示组件或浮层
- 内部异常用 `log` 记录
- catch 块返回失败标志，不抛原始异常
- **禁止空 catch 块**：ESLint `no-empty` 强制，静默降级时必须在 catch 块内加注释说明原因

### Chrome API

回调统一包装为 Promise，不使用裸回调。

---

## 测试

### 测试入口

```bash
pnpm test              # 交互模式（监听变化）
pnpm test -- --run     # 执行一次后退出
```

### 配置

- 框架：Vitest 5 + happy-dom
- 配置：`vite.config.ts`（`globals: true, environment: 'happy-dom', clearMocks: true, setupFiles: ['test/setup.ts']`）
- 测试目录：与被测代码同级，统一放在 `__tests__/` 下（如 `src/logic/__tests__/`、`src/setting/__tests__/`）

### 测试策略（按依赖复杂度分层）

| 层级 | 模块 | Mock 程度 |
|------|------|----------|
| 纯函数 | merge、util（版本比较） | 零 mock |
| 轻量 mock | compress、task | 最少 mock |
| Vue 依赖 | config/update、store | mock reactive |
| 重度 mock | config/sync/ | mock 整个依赖树 |
| 快照测试 | config-snapshot | 基于真实用户配置快照的端到端迁移验证 |

### 配置兼容性快照测试

新增迁移分支后，运行 `npx vitest run src/logic/__tests__/config-snapshot.test.ts` 验证不破坏老用户数据。

| 文件 | 职责 |
|------|------|
| `src/logic/__tests__/config-snapshot.test.ts` | 从不同历史版本的用户配置快照出发，运行完整迁移流程 |
| `test/fixtures/snapshot-v*.json` | 用户配置快照 JSON，可从线上用户 localStorage 导出或手动构造 |

详见 [config.md](../architecture/config.md#配置兼容性快照测试)。

### 测试环境 Polyfill

`test/setup.ts` 提供：Chrome API mock（storage/tabs/runtime/permissions/menus/commands）、全局注入（`window.$t`/`$notification`/`appVersion`）、Blob/CompressionStream polyfill。

### 自动运行

pre-commit hook 自动执行：`lint-staged → typecheck → test --run → format:check → check:icons → validate-registries → check-patterns → check-boundaries`。可通过 `SKIP_SIMPLE_GIT_HOOKS=1` 跳过（不建议）。

### 新增测试指南

- 优先测试纯函数/近纯函数
- `vi.doMock()` + `vi.resetModules()` 避免 mock 污染
- `vi.mock()` 内联对象字面量注意 hoisting，工厂函数不能引用外部变量
- `beforeEach` 中重置 mock 状态
- `Blob.stream()` 在部分 DOM 模拟环境中不可用，setup.ts 统一替换为 Node.js 原生 Blob
- happy-dom 的 `localStorage` 是 Proxy，方法由 getter 返回绑定函数：spy 要打在实例上（`vi.spyOn(localStorage, 'setItem')`），打 `Storage.prototype` 拦不到
- happy-dom 的 `document.designMode` 是 `undefined`（jsdom 是 `'off'`），依赖该属性的测试需自行赋值
- happy-dom 自带 `ResizeObserver`、`matchMedia`、`IntersectionObserver`，测试里对这些 API 的 polyfill 只是兜底、通常不执行（别误以为缺了才写的）
- Vitest 5 的快照键不再保留测试名里的引号：`describe(\`快照: '${name}'\`)` 在 v4 下键为 `快照: 'x'`，v5 下为 `快照: x`。升级时旧键会被标记 obsolete 并静默重录 —— 重录前先用 `git diff` 确认快照**值**未变，再跑 `vitest run --update` 清理死键
- `vi.mock()` 的 hoisting：mock 工厂函数不能引用外部变量，使用 `globalThis` 中转
