# 开发约定

## 编码风格

### CSS

**BEM 命名：** `block__element--modifier`。`block` 使用 camelCase，子元素用 `__`，修饰符用 `--`。

- **必须嵌套书写**：子元素和 modifier 必须嵌套在父级选择器内，不得平铺到根级
- `&` 只允许用于伪类/伪元素（`&:hover`）或嵌套完整类名（`&.parent-class`）
- Widget 样式外层使用 `#widgetCode`（由 WidgetWrap 自动设置 id）

CSS 踩坑（`&--modifier` 禁止、`v-bind()` 禁止、`rgba()` + `var()` 等）详见 [pitfalls.md](../../.claude/rules/pitfalls.md#css--样式)。

- **禁止在 scoped CSS 中使用 Naive UI 的 `--n-*` 变量**（`--n-primary-color`、`--n-text-color` 等），使用项目自有 token 或 `customPrimaryColor` 注入（详见下方 CSS 变量对照表）

**Naive UI → 项目 token 对照表：**

| 禁止使用 | 替换为 |
|----------|--------|
| `var(--n-primary-color)` | 通过 `customPrimaryColor` + `cssVars` 注入（见下方示例） |
| `var(--n-text-color)` | `var(--gray-alpha-85)` |
| `var(--n-text-color-2)` | `var(--gray-alpha-65)` |
| `var(--n-text-color-3)` | `var(--gray-alpha-55)` |
| `var(--n-tab-border-color)` | `var(--n-tab-border-color, var(--gray-alpha-15))`（加 fallback） |

主题色注入模式：

```ts
import { customPrimaryColor } from '@/logic/store/style'

const cssVars = computed(() => ({
  '--nt-primary-color': customPrimaryColor.value,
}))
```

```html
<div :style="cssVars">...</div>
```

```css
.el--active { color: var(--nt-primary-color); }
```

### Vue 组件

- `<script setup lang="ts">`
- Props：`withDefaults(defineProps<{}>(), {})`
- 双向绑定：`defineModel()`，多字段用具名绑定
- 内部多字段用 `reactive`，单一值用 `ref`
- 组件非全局注册，使用前必须 `import`

### 函数声明

优先箭头函数，不使用 `function` 声明（组件和需要提升的除外）。

### 导入顺序

1. 第三方库（vue、naive-ui、@vueuse）
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

- 用户可见提示用 `showToast`（统一 toast 模块）/ `window.$notification`
- 内部异常用 `log` 记录
- catch 块返回失败标志，不抛原始异常

### Chrome API

回调统一包装为 Promise，不使用裸回调。

---

## 测试

### 测试入口

```bash
pnpm test              # 交互模式（监听变化）
pnpm test -- --run     # 执行一次后退出（CI/PR）
```

### 配置

- 框架：Vitest + jsdom
- 配置：`vite.config.ts`（`globals: true, environment: 'jsdom', setupFiles: ['test/setup.ts']`）
- 测试目录：`src/logic/__tests__/`

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

详见 [config.md](architecture/config.md#配置兼容性快照测试)。

### 测试环境 Polyfill

`test/setup.ts` 提供：Chrome API mock（storage/tabs/runtime/permissions/menus/commands）、全局注入（`window.$t`/`$notification`/`appVersion`）、Blob/CompressionStream polyfill。

### 自动运行

pre-commit hook 自动执行：`pnpm lint-staged && pnpm test -- --run`。可通过 `SKIP_SIMPLE_GIT_HOOKS=1` 跳过。

### 新增测试指南

- 优先测试纯函数/近纯函数
- `vi.doMock()` + `vi.resetModules()` 避免 mock 污染
- `vi.mock()` 内联对象字面量注意 hoisting，工厂函数不能引用外部变量
- `beforeEach` 中重置 mock 状态
- `Blob.stream()` 在 jsdom 中不可用，已由 setup.ts 替换为 Node.js 原生 Blob
- `vi.mock()` 的 hoisting：mock 工厂函数不能引用外部变量，使用 `globalThis` 中转
