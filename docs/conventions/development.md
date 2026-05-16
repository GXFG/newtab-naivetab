# 开发约定

## 编码风格

### CSS

**BEM 命名：** `block__element--modifier`。`block` 使用 camelCase，子元素用 `__`，修饰符用 `--`。

- 子元素可使用简短前缀（Reblock 模式），但**必须嵌套在父级选择器内**，不得平铺到根级
- **禁止 `&--modifier` 拼接**：`postcss-preset-env` 不支持，modifier 必须写完整类名
- `&` 只允许用于伪类/伪元素（`&:hover`）或嵌套完整类名（`&.parent-class`）
- Widget 样式外层使用 `#widgetCode`（由 WidgetWrap 自动设置 id）
- **禁止 `v-bind()`**，使用 `:style` + `computed` + `var()` 注入
- `widget__wrap` div 的 style 由 WidgetWrap 自动注入，不可再 `:style` 绑定
- `rgba()` 的 alpha 通道写**字面量**，不可用 `var()`

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
