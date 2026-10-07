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

## 模板内联 handler 不要写配置赋值

模板里的内联箭头函数**不要直接给 `localConfig` 赋值**，抽成 `<script setup>` 里的函数再调用。

**Why：** vue-tsc 3.3.x 对这类写法会误报

```
error TS2339: Property 'value' does not exist on type '{ keyboardBookmark: … }'
```

报错位置指向 `localConfig.…`，但类型却是配置对象本身，排查时极其误导（实测：同一段赋值抽成 script 函数后报错立即消失，行为完全一致）。

**How to apply：**

```vue
<!-- 错误：内联 handler 里赋值 -->
<CustomColorPicker
  v-for="(color, ci) in localConfig.general.shimmerBackgroundColors[localState.currAppearanceCode]"
  :value="color"
  @update:value="(val: string) => { localConfig.general.shimmerBackgroundColors[localState.currAppearanceCode][ci] = val }"
/>

<!-- 正确：抽成 script 函数 -->
<script setup lang="ts">
const updateShimmerColor = (index: number, value: string) => {
  localConfig.general.shimmerBackgroundColors[localState.value.currAppearanceCode][index] = value
}
</script>
<CustomColorPicker … @update:value="(val: string) => updateShimmerColor(ci, val)" />
```

顺带一提：`localState` 是 ref，在 script 里必须写 `.value`，在模板里则不要写——两种上下文的差异正是上面这个误报的来源。
