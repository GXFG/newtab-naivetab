# 项目踩坑记录

本文档汇总 NaiveTab 开发中的已知陷阱和易犯错误。CLAUDE.md 中引用本文档作为规则入口。

---

## CSS & 样式

### `&--modifier` 禁止

`postcss-preset-env` 不支持 `&--xxx` BEM 拼接，modifier 必须写完整类名。`&` 只允许用于伪类/伪元素或嵌套完整类名。

**Why：** 编译产物中 modifier 类名不会被正确展开，导致样式完全不生效。

**How to apply：** 始终写完整类名，如 `.widget__container--active` 而非 `&--active`。详见 [coding-style.md](docs/conventions/coding-style.md)。

### v-bind TDZ

`v-bind()` 引用的变量声明必须放在 `<script setup>` 最顶部，imports 之后、任何逻辑代码之前。

**Why：** 生产模式 Vue SFC 编译器在顶部生成 `useCssVars()` 调用，该调用同步引用所有 `v-bind()` 变量。变量未声明会触发 `ReferenceError: Cannot access 'xxx' before initialization`（TDZ 错误）。dev 模式因 ES modules 的特殊 TDZ 处理不会暴露此问题。

**How to apply：** 所有 `const xxx = getStyleField(...)` 放在 imports 之后，其他逻辑之前。详见 [coding-style.md](docs/conventions/coding-style.md#v-bind-变量声明顺序tdz-陷阱)。

### Flexbox `min-width: 0`

flex 链路上每一层都要有 `min-width: 0`，否则 `min-width: auto` 会以内容固有宽度为收缩底线。

**Why：** flex 子元素默认 `min-width: auto`，内容宽度会阻止 flex 收缩，导致溢出。

**How to apply：** 在 flex container 内的直接子元素上添加 `min-width: 0`。

### CSS `rgba()` 不支持 `var()`

alpha 通道必须写字面量。

**Why：** CSS `rgba()` 的 alpha 参数不接受 CSS 变量。

**How to apply：** 使用 `color-mix(in srgb, var(--color) 50%, transparent)` 或 `rgb(var(--color-rgb) / 0.5)` 替代。

---

## Vue 组件

### WidgetWrap style 注入限制

`widget__wrap` div 的 style 由 `WidgetWrap` 组件自动注入（用于拖拽定位的绝对坐标），禁止再对该 div 进行 `:style` 绑定。

**Why：** `WidgetWrap` 内部已经通过 `:style` 注入 `xOffset`/`yOffset`/`translate` 等定位属性。如果外层再 `:style` 绑定，会覆盖定位样式导致拖拽失效。

**How to apply：** 如需自定义样式，作用于 `WidgetWrap` 内部子元素（如 `*__container`），而非 `WidgetWrap` 本身的根 div。

---

## 配置系统

### 配置迁移黄金法则

任何持久化配置结构修改都**不能破坏老用户数据**。改配置结构时必须：升 `package.json` version → `handleAppUpdate` 新增迁移分支。

**Why：** 老用户 localStorage 中有旧结构的配置，新版本直接读取会崩溃或表现异常。`handleAppUpdate` 通过版本比较确保旧用户能执行迁移。

**How to apply：**

| 场景 | 正确做法 | 错误做法 |
|------|----------|----------|
| 新增扁平字段 | 在 `handleAppUpdate` 中赋值 | 只改 `defaultConfig` |
| 新增嵌套对象 | 整体赋值 `defaultConfig.xxx` | 只依赖浅合并 |
| 重命名字段 | 新字段=旧字段值 → delete 旧字段 | 直接改字段名 |
| 删除字段 | 先 `delete` 旧值 → 再删 `defaultConfig` | 直接从 `defaultConfig` 删 |
| 修改类型 | 新增替代字段 + 迁移 | 直接改类型 |

**关键注意：** `handleAppUpdate` 使用 `if` 而非 `if-else`，确保跨越多个版本的旧用户能依次执行所有迁移。详见 [config.md](docs/architecture/config.md#配置迁移系统)。

### mergeState 合并陷阱

`mergeState(state, acceptState)` 以 `state`（默认配置）为模板过滤 `acceptState` 中的未知/废弃字段。

**关键规则：**

| 条件 | 行为 |
|------|------|
| `acceptState` 为空 | 使用 `state` |
| 类型不同 | 使用 `state` |
| keymap 对象（Key*/Digit*/Numpad*） | **直接替换**，不深合并 |
| 数组 | **直接替换**，不深合并 |
| 普通对象 | 递归合并，**只保留 `state` 中定义的字段** |

**Why：** keymap 和数组直接替换是有意设计，避免破坏键盘映射结构和数组顺序。浅合并（`useStorageLocal` 初始化）不处理嵌套对象。

**How to apply：**
- 需要增量更新数组时，必须在业务逻辑中处理，不能依赖 `mergeState`
- 嵌套对象新增字段不能依赖浅合并自动补全，必须在 `handleAppUpdate` 中手动赋值
- 修改 `keymap` 时直接替换整个对象，不要试图只添加/删除单个 key

详见 [config.md](docs/architecture/config.md#mergestate-合并函数)。

### popup 修改配置后必须 flushSync

popup 修改书签等配置后**必须调用 `flushConfigSync`** 强制同步，否则 popup 销毁后防抖回调不会执行，配置丢失。

---

## 后台脚本

### Service Worker 异步

`onChanged` 监听器必须返回 `Promise`，否则 Service Worker 可能在异步 resolve 前休眠。

**Why：** Chrome MV3 的 Service Worker 空闲后会被回收，如果监听器不返回 Promise 等待异步完成，异步操作会被截断。

---

## 工作流

### 新增 Widget 检查 `@@@@`

全局搜索 `@@@@` 确认无遗漏（`registry.ts`、`store.ts`），共用 Setting 面板时维护 `WIDGET_SETTING_PANE_MAP`。

### 问题分析前置

接到"问题"类请求时，先判断是否真的是 bug。如果是设计意图/框架特性，则在代码中添加清晰注释说明原因，而非改代码。修复非 bug 类"问题"后，必须更新 `docs/` 下对应文档。

**Why：** 用户反馈有时不是 bug 而是设计意图，直接修改会破坏设计，不加注释则下次还会被误判。

---

## 中文输出

所有输出（对话、工具描述、注释、文档）必须使用中文。
