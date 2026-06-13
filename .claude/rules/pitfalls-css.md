# CSS & 样式踩坑

> pre-commit 已集成 `pnpm check-patterns` 自动检查 `v-bind()`、`&--modifier` 和 **Reka 组件 z-index 遗漏**。

## `&--modifier` 禁止

`postcss-preset-env` 不支持 `&--xxx` BEM 拼接，modifier 必须写完整类名。`&` 只允许用于伪类/伪元素或嵌套完整类名。

**Why：** 编译产物中 modifier 类名不会被正确展开，导致样式完全不生效。

**How to apply：** 始终写完整类名，如 `.widget__container--active` 而非 `&--active`。详见 [development.md](../../docs/conventions/development.md#编码风格)。

## 禁止 `v-bind()`

**Why：** Vue 的 `v-bind()` 在 `<style>` 中动态绑定会导致样式计算性能问题，且与项目 CSS 变量方案冲突。

**How to apply：** 动态样式使用 `:style` + `computed` + `var()` 注入。

## Flexbox `min-width: 0`

flex 链路上每一层都要有 `min-width: 0`，否则 `min-width: auto` 会以内容固有宽度为收缩底线。

**Why：** flex 子元素默认 `min-width: auto`，内容宽度会阻止 flex 收缩，导致溢出。

**How to apply：** 在 flex container 内的直接子元素上添加 `min-width: 0`。

## ResizeObserver loop 警告（textarea autosize + 大量 DOM 挂载）

同一帧内大量 DOM 变更（如键盘布局渲染 60+ 键帽元素）时，textarea 的 autosize 通过 ResizeObserver 触发高度调整 → 再次布局 → 浏览器检测到循环，控制台报 `ResizeObserver loop completed with undelivered notifications`。

**Why：** `ResizeObserver` 同步回调无 rAF 防抖，变更触发回调 → 回调修改 DOM → 再次变更，形成循环。

**How to apply：** 非必须场景用固定 `:rows` 替代 `:autosize`。参考 [UrlBlacklistInput.vue](../../src/components/UrlBlacklistInput.vue)。

## CSS `rgba()` 不支持 `var()`

alpha 通道必须写字面量。

**Why：** CSS `rgba()` 的 alpha 参数不接受 CSS 变量。

**How to apply：** 使用 `color-mix(in srgb, var(--color) 50%, transparent)` 或 `rgb(var(--color-rgb) / 0.5)` 替代。

## Reka UI 深色模式阴影遗漏

Reka UI 组件的阴影（`box-shadow`）在浅色模式使用 `rgba(0,0,0,...)` 表达暗影深度，但在深色模式下黑色阴影会融入暗色背景，导致组件"贴平"，立体层次感消失。

**Why：** 深色背景 RGB 接近 `(30,30,35)`，叠加 `rgba(0,0,0,0.15)` 几乎无视觉差异。这是 Reka UI 开发中最容易遗漏的问题——因为开发者通常在浅色模式下调试，容易忘记验证深色模式。

**How to apply：**
- 每写一个 `box-shadow` 或 `text-shadow`，**立即在同一组件区块末尾**写对应的深色模式覆盖
- 浅色用 `rgba(0,0,0, opacity)` → 深色用 `rgba(255,255,255, opacity)`，opacity 需适当降低（白半透比黑半透更显眼）
- `color-mix()` 中混入的 `rgba(0,0,0,...)` 基底色也要同步切换
- 指示器纯白（`white` / `#fff`）→ 深色降纯为 `#f0f0f0`

**深色模式覆盖必须写在每个组件区块末尾**，使用固定头部注释：
```css
/* ============================================================
 * 深色模式覆盖（原则5：双模式自适应）
 * 核心规则：浅色用黑半透阴影（暗影深度），深色用白半透阴影（微光环抱）。
 * ============================================================ */
```

完整对照表见 [reka-ui.md](../../docs/architecture/reka-ui.md#深色模式防遗漏)。

## Reka Portal Content 遗漏 z-index

Reka 的 Portal Content 组件（`SelectContent`、`ComboboxContent`、`PopoverContent`、`DropdownMenuContent`、`TooltipContent`、`DialogContent` 等）渲染到 `document.body`，处于同一堆叠上下文。缺少 `z-index` 会导致下拉面板被其他元素遮挡。

**Why：** 所有 Portal 内容都挂载在 body 下，是兄弟节点。如果没有显式 `z-index`，渲染顺序决定堆叠——后渲染的覆盖先渲染的，导致下拉面板可能藏在 Dialog、Popover 等后面。

**How to apply：**
- 新增 Reka 组件时，如果包含 Portal Content（`__content` / `__overlay`），**必须在第一个 `__content` / `__overlay` 规则块中设置 `z-index`**
- 值参考 [z-index 层级体系](../../docs/architecture/reka-ui.md#z-index-层级体系)：表单下拉 3000、菜单 4000、Popover 9999、Tooltip 10000
- pre-commit 已集成自动检查：`check-patterns.ts` 会扫描 `src/styles/reka/*.css`，缺少 z-index 的 `__content`/`__overlay` 规则会报错阻断提交
- 内联渲染（如 Tabs）的 `__content` 不需要全局 z-index，但需显式标注 `z-index: 0` 并通过注释说明，既通过检查又表明已考虑此问题

## Reka Content 动画：入场用 animation + backwards，退场用 [data-state='closed']

Reka 的 Portal Content 组件（PopoverContent、SelectContent、TooltipContent 等）通过 Presence 挂载/卸载 DOM，使用 `data-state` 属性控制动画时机。

### 入场动画

**Presence mount 时 `data-state` 直接就是 `open`**，不存在从 `closed` 到 `open` 的过渡。因此 `transition` 不会触发——元素直接以最终状态渲染，无动画。

**Why：** `transition` 只在 CSS 属性值变化时触发。Presence mount 时元素带着 `data-state="open"` 出现，`opacity: 0` 和 `opacity: 1` 的规则同时生效，浏览器取最终值 `1`，没有过渡。

**How to apply：**
- Reka Content 组件的入场动画**必须用 `animation`**，配合 `backwards` fill mode 防止首帧闪烁
- `animation-fill-mode: backwards` — 动画开始前保持 `from` 关键帧状态，消除 mount 瞬间的闪白

### 退场动画

**Presence 关闭时 `data-state` 从 `open` 变为 `closed`**，Presence 监听 `animationend` 事件，等动画播完再卸载 DOM。因此退场动画通过 `[data-state='closed']` 选择器触发，用 `forwards` fill mode 保持结束状态直到 DOM 移除。

**Why：** 不写 `[data-state='closed']` 规则 → 无退场动画 → 元素瞬间消失。`forwards` 保持 `opacity: 0` 防止移除前闪回。

**How to apply：**
- 退场动画写在 `[data-state='closed']` 选择器上，覆盖基类的 `animation`
- 时长通常比入场短（~150ms），缓动用 `ease`（退场不需要弹簧感）
- `animation-fill-mode: forwards` — 保持动画结束状态，防止 DOM 移除前闪回

```css
/* ✅ 正确：入场 + 退场完整动画 */
.reka-select__content {
  animation: reka-select-content-in 240ms var(--transition-spring-bounce) backwards;
}
@keyframes reka-select-content-in {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

.reka-select__content[data-state='closed'] {
  animation: reka-select-content-out 150ms ease forwards;
}
@keyframes reka-select-content-out {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-4px); }
}

/* ❌ 错误：transition 不触发（入场无效） */
.reka-popover { opacity: 0; transition: opacity 200ms; }
.reka-popover[data-state='open'] { opacity: 1; }

/* ❌ 错误：缺少 [data-state='closed'] 退场动画（关闭瞬间消失） */
```

## `all: unset` 后必须显式设置 `display`

`all: unset` 将 `<button>` 等元素的 `display` 重置为 CSS 初始值 `inline`（浏览器 UA 默认值是 `inline-block`）。`display: inline` 元素忽略 `width`/`height`，导致控件尺寸由内容撑开而非显式声明的宽高。

**Why：** CSS 规范中 `display` 的初始值是 `inline`。`all: unset` 对非继承属性使用 `initial` 值。不同浏览器对 form 元素的 `all: unset` 渲染有差异——Chrome 可能保留部分 UA 样式，Firefox/Safari 严格重置。依赖浏览器特例的行为不可预期。

**How to apply：**
- 每个 Reka 根元素在 `all: unset` 后**第一行**显式设置 `display`
- 需固定尺寸的控件（Switch、Checkbox）：`display: inline-block`
- 需 flex 居中内容的（Checkbox 含 SVG）：`display: flex`
- 子元素：`display: block`（恢复被 `all: unset` 重置的 display）

## Reka Indicator Presence 导致布局抖动

Reka UI 的 Indicator 组件（`CheckboxIndicator`、`RadioGroupIndicator` 等）内部使用 `Presence` 控制 DOM 挂载/卸载。当指示器从"无"变为"有"（如 Checkbox 勾号出现），Presence 先挂载 DOM 再执行动画，这个 mount/unmount 过程导致 flex 容器重算布局，产生高度/宽度抖动。

**Why：** Presence 的 mount 使元素从"不存在于 DOM"到"突然出现"，flex/grid 容器的子元素数量变化触发 layout recalculation。即便 mount 和动画仅间隔一帧，视觉上仍有可感知的跳动。

**How to apply：**
- 指示器内容始终渲染在 Root 内，不依赖 Indicator 组件的条件渲染
- 用 CSS `[data-state]` 选择器 + `opacity`/`transform` 控制显隐动画
- 仅当指示器在两种状态下**视觉尺寸一致**（如 Switch thumb）时，才适合用 Indicator
- 完整说明见 [reka-ui.md](../../docs/architecture/reka-ui.md#indicator-替代模式)

## 交互状态（hover/active/checked+hover）遗漏 `:not(:disabled)` 守卫

`:hover` 和 `:disabled` 伪类互不排斥。disabled 元素仍可触发 hover 样式变化（底色加深、光环出现），与 `cursor: not-allowed` 语义矛盾。

**Why：** CSS 规范中 `:hover` 仅匹配鼠标悬停，不检查元素是否 disabled。`:disabled` + `:hover` 同时匹配时，hover 规则优先级可能高于 disabled 规则（取决于选择器特异性），导致 disabled 元素出现不该有的交互反馈。

**How to apply：**
- 所有 `:hover` 规则必须加 `:not(:disabled)`：`.reka-{name}:not(:disabled):hover`
- 所有 `[data-state='checked']:hover` 同样：`.reka-{name}[data-state='checked']:not(:disabled):hover`
- 所有 `:active` 规则同理：`.reka-{name}:not(:disabled):active`
- 模板已固化，新组件从模板复制即可避免此问题
