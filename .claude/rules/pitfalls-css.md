# CSS & 样式踩坑

> pre-commit 已集成 `pnpm check-patterns` 自动检查 `v-bind()` 和 `&--modifier` 违规。

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

## 禁止在 scoped CSS 中直接使用 Naive UI 的 `--n-*` CSS 变量

**Why：** Naive UI 的 CSS 变量在 setting panel 等通过 `to` teleport 渲染的 Drawer 上下文中不可靠，可能不存在或拿到错误值。

**How to apply：** 完整对照表和注入模式见 [development.md](../../docs/conventions/development.md#编码风格) CSS 小节。

## `NInput[autosize]` + 大量 DOM 挂载触发 ResizeObserver loop 警告

Naive UI 的 `NInput type="textarea"` 使用 `autosize` 时，会通过 `vueuc` 的共享 `ResizeObserver` 监听 textarea 尺寸。同一帧内若有大量 DOM 变更（如键盘布局渲染 60+ 键帽元素），ResizeObserver 同步回调触发 → autosize 调整高度 → 再次布局 → 浏览器检测到循环，控制台报 `ResizeObserver loop completed with undelivered notifications`。

**Why：** `vueuc`（Naive UI 底层依赖）的 `ResizeObserverDelegate` 是同步回调，无 rAF 防抖。任何时候 ResizeObserver 回调导致需要新一轮通知的布局变更时，都会触发此警告。键盘面板同时具备"海量 DOM 挂载"和"autosize textarea"两个条件，是唯一触发场景。

**How to apply：** 非必须场景用固定 `:rows` 替代 `:autosize`。参考 [UrlBlacklistInput.vue](../../src/components/UrlBlacklistInput.vue)。

## CSS `rgba()` 不支持 `var()`

alpha 通道必须写字面量。

**Why：** CSS `rgba()` 的 alpha 参数不接受 CSS 变量。

**How to apply：** 使用 `color-mix(in srgb, var(--color) 50%, transparent)` 或 `rgb(var(--color-rgb) / 0.5)` 替代。
