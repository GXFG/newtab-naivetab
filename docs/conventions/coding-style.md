# 编码风格规范

本文档定义 NaiveTab 项目的编码风格，AI 辅助开发时须遵守。CLAUDE.md 中仅留索引，开发前须查阅本文档。

---

## CSS

### BEM 命名

**必须采用 BEM 命名规范：`block__element--modifier`，使用双下划线分隔元素、双连字符分隔修饰符。**

- `block`：组件级名称，使用 camelCase（如 `clockDigital`、`bookmarkFolder`、`settingCollapseSection`）
- `block__element`：子元素使用双下划线连接（如 `time__text`、`text__digit`）
- `block__element--modifier`：状态/变体使用双连字符（如 `text__divide--dim`）
- `block--modifier`：状态/变体也可作用于 block 级别（如 `.draft-tool--active`、`.animation--fade-in`）
- 全局公共类定义在 `src/styles/setting-utils.css`，使用 `setting__` 前缀（如 `.setting__section-title`、`.setting__num-input`）

**子元素允许使用简短前缀（Reblock 模式）：** 嵌套结构下，子元素的 BEM block 可简化为语义缩写，但**必须嵌套在父级选择器内部书写**，不得平铺到根级。

```scss
/* ✅ 正确：子元素嵌套在 block 内部，使用简短前缀 */
.setting-collapse-section {
  .section__header {
    .header__title { ... }
    .header__chevron { ... }
  }
  .section__body { ... }
}

/* ❌ 错误：子元素平铺到根级，失去层级关系 */
.setting-collapse-section__header { ... }
.header__title { ... }
.header__chevron { ... }
.setting-collapse-section__body { ... }
```

**为什么禁止 `&--modifier` 拼接：** `postcss-preset-env` 的 `nesting-rules` 不支持 `&--xxx` 这种 BEM 拼接语法，会错误编译为 `--pending:is(...)` 而非 `.block__element--pending`，导致样式完全不生效。`&` 只允许用于伪类/伪元素（`&:hover`、`&::before`）或嵌套完整类名（`&.parent-class`）。modifier 必须写完整类名。

```scss
/* ✅ 正确：modifier 使用完整类名 */
.setting-collapse-section {
  .section__header {
    &.setting-collapse-section__header--expanded { ... }
  }
}

/* ❌ 错误：&-- 拼接，编译结果不可预期 */
.setting-collapse-section {
  &__header--expanded { ... }
}
```

- Widget 样式外层使用 `#widgetCode` 作为最外层选择器（由 `WidgetWrap` 自动设置 id）
- 嵌套层级不强制限制，但过深时建议拆分以提升可读性
- **禁止在 CSS `<style>` 中使用 `v-bind()`**
- 需要动态值时，通过 `:style` + `computed` 注入 CSS 自定义变量：`const cssVars = computed(() => ({ '--nt-xxx': value }))`，CSS 中用 `var()` 引用
- `var()` 可引用全局 token（`--gray-alpha-xx`、`--n-primary-color` 等）或自定义注入变量
- `widget__wrap` div 的 style 由 `WidgetWrap` 自动注入配置变量，不可再对其进行 `:style` 绑定

## Vue 组件

- 统一使用 `<script setup lang="ts">` 语法
- Props 使用 `withDefaults(defineProps<{}>(), {})` 定义默认值
- 双向绑定统一使用 `defineModel()`，多字段使用具名绑定（`defineModel<string>('fieldName')`）
- 内部多字段状态使用 `reactive`，单一状态值使用 `ref`
- 组件类型通过 `typeof` 推导，不重复定义接口
- 组件不是全局注册的，使用前必须 `import`

### v-bind 变量声明顺序（TDZ 陷阱）

**所有 CSS `v-bind()` 引用的变量声明，必须放在 `<script setup>` 的最顶部——imports 之后、任何逻辑代码（函数调用、`watch`、`onMounted`、`reactive` 等）之前。**

**根因：** Vue SFC 编译器会将 `<script setup>` 编译为 `setup()` 函数，并在顶部生成 `useCssVars()` 调用，该调用同步引用所有 `v-bind()` 变量。如果这些变量声明在非 hoistable 代码之后，生产模式下会触发 `ReferenceError: Cannot access 'xxx' before initialization`（TDZ 错误）。dev 模式因 ES modules 的特殊 TDZ 处理不会暴露此问题。

```vue
<script setup lang="ts">
import { getStyleField } from '@/logic/store'

// ✅ 正确：v-bind 变量在最顶部
const WIDGET_CODE = 'myWidget'
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')

// 之后才能写 onMounted、watch、函数声明等
onMounted(() => { ... })
</script>
```

```vue
<script setup lang="ts">
import { getStyleField } from '@/logic/store'

// ❌ 错误：v-bind 变量声明在 onMounted 之后
onMounted(() => { ... })

const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
</script>
```

## 函数声明

**优先使用箭头函数，不使用 `function` 声明。**

例外：顶层导出的 Vue 组件（`.vue`）和少数需要函数提升的声明。

## 导入顺序

导入语句按以下顺序排列，用空行分隔不同分组：
1. **第三方库**（vue、naive-ui、@vueuse 等）
2. **内部框架/工具模块**（@/logic/*、@/types/* 等）
3. **本地相对路径导入**（./、../）

`import type` 与值导入分离，可合并写在一行。

## 命名规范

| 类型 | 风格 | 示例 |
|------|------|------|
| 类型/接口 | PascalCase | `SettingMeta`、`TWidgetConfig` |
| 变量/函数 | camelCase | `createSettingMeta`、`updateTime` |
| 常量 | UPPER_SNAKE_CASE | `SETTING_GROUPS`、`ICONS` |
| 文件 | kebab-case | `setting-registry.ts` |
| Vue 组件 | PascalCase | `SettingPaneContent.vue` |
| CSS 类名 | camelCase + BEM | `clockDigital__container--shadow` |

## 模块拆分规范

**当从模块 A 提取代码到新模块 B 后，禁止在 A 中写 `export { xxx } from './B'` 做兼容重导出。**

有更新就要立即修改所有调用方的 import 语句，不留过渡层。这样做避免增加维护成本、模糊模块边界。

**正确做法：** 提取代码后，搜索所有引用了被提取符号的文件，逐一修改其 import 指向新模块，确认 type-check 通过即完成。

## TypeScript

- 函数参数与返回值类型必须显式标注
- 使用 `import type` 导入纯类型
- 类型注解必须显式，不依赖 implicit any
- 未使用的变量必须删除，不保留注释掉的死代码
- 一行超过 120 字符时换行

## 注释规范

**多行注释必须使用 `/** ... */` 格式，禁止用 `//` 逐行拼接。**

```ts
// ❌ 禁止：// 拼接多行
// 架构说明：
// 1. 本地缓存 keymap
// 2. 直接调用 chrome.tabs.create

/**
 * 架构说明
 * 1. 本地缓存 keymap
 * 2. 直接调用 chrome.tabs.create
 */
```

## 错误处理

- 用户可见提示统一使用 `window.$message` / `window.$notification`
- 内部异常使用 `log` 记录，不向用户暴露技术细节
- catch 块中对外返回失败标志（`resolve(false)` 或 `return`），不抛出原始异常

## Chrome API

Chrome API 回调统一包装为 Promise，不使用裸回调。
