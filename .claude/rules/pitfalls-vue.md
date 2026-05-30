# Vue 组件踩坑

## WidgetWrap style 注入限制

`widget__wrap` div 的 style 由 `WidgetWrap` 组件自动注入（用于拖拽定位的绝对坐标），禁止再对该 div 进行 `:style` 绑定。

**Why：** `WidgetWrap` 内部已经通过 `:style` 注入 `xOffset`/`yOffset`/`translate` 等定位属性。外层再 `:style` 绑定会覆盖定位样式导致拖拽失效。

**How to apply：** 如需自定义样式，作用于 `WidgetWrap` 内部子元素（如 `*__container`），而非 `WidgetWrap` 本身的根 div。

## 禁止在 `<Icon>` 上直接绑定事件

`@iconify/vue` 的 `<Icon>` 组件默认渲染 `<svg aria-hidden="true" role="img">`，禁止在其上直接绑定 `@click`、`@mousedown` 等交互事件。

**Why：** Chrome 会将绑定了事件的 `<svg>` 视为可交互元素，点击后 `<svg>` 获得焦点，与自身的 `aria-hidden="true"` 产生无障碍冲突，控制台报错：`Blocked aria-hidden on an element because its descendant retained focus`。

**How to apply：** 必须用 `<button type="button">` 包裹 Icon，将事件绑定在 `<button>` 上，并在 button 上添加 `:aria-label` 提供无障碍描述。按钮样式需重置浏览器默认 `padding/border/background`。示例：

```vue
<!-- 错误 -->
<Icon :icon="ICONS.info" class="foo" @click.stop="onAction" />

<!-- 正确 -->
<button type="button" class="foo" :aria-label="$t('common.action')" @click.stop="onAction">
  <Icon :icon="ICONS.info" />
</button>
```
