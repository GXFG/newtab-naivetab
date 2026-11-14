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

## Reka Root 不渲染元素时，组件的 class 会被静默丢弃

给封装组件传 `class` / `style` 前先确认它**渲染出一个真实元素**。Reka 的 `SelectRoot`、`PopoverRoot`、`RadioGroupRoot` 等根组件是 Fragment 或注释节点，且内部写了 `inheritAttrs: false`，attrs 不会落到任何 DOM 上。

**Why：** Vue 只在组件有单一元素根时才自动透传 attrs；根是 Fragment 时直接丢弃，**不报错、不警告**。样式静默失效，排查时只会看到「CSS 写了但没效果」。实测代价：`NTSelect` 的 `class="setting__fill-input"` 一直没生效，年进度面板的「自定义格式」输入框被挤到 **0 宽**并推到可视区之外（`<NTSelect class>` 的 class 丢失 → 拿不到 `flex: 1 1 0%` → 按 `width: 100%` 占满整行）。

**How to apply：**

- 封装这类组件时显式接收并绑定：`defineOptions({ inheritAttrs: false })` + 在真正承载元素的那层写 `v-bind="$attrs"`（见 `NTSelect.vue`）
- 给别人的封装组件传 class 前，先挂载看一眼 `wrapper.get('.目标元素').classes()`，别靠「应该会透传」的直觉
- 确实需要多个元素承载属性时，用 `useAttrs()` 手动分发，而不是留着默认行为

## NTPopover 的 trigger 里再放按钮，点击会被 Reka 反手关掉

用 `trigger="manual"` + 自己控制 `show` 时，`#trigger` 插槽里**不要**再放带 `@click` 的元素，除非那个 click 加了 `.stop`。

**Why：** `NTPopover` 的 `PopoverTrigger` 内部是 Reka 的 `PopoverTrigger`，它给触发器元素绑了 `onClick: onOpenToggle`。自己的按钮先收到 click 把 `open` 置为 true，事件继续冒泡到触发器时 Reka 再翻一次 —— 于是「打开」和「关闭」发生在同一个点击里，表现是**弹层闪一下就消失**。

关键在于这段时序只在**真实点击**里成立：浏览器在同一个 click 的两个监听器之间会做一次 microtask checkpoint，Vue 正好把 `open = true` 刷进 props，Reka 读到的就是已打开的状态；而从 JS 里 `el.dispatchEvent(new Event('click'))` 调用（`@vue/test-utils` 的 `trigger('click')` 也是）整个派发是同步 JS，没有 checkpoint，单测里永远是绿的。**这类 bug 只能靠真机点，或者靠「点击不冒泡」的显式断言锁住。**

**How to apply：**

- 自己的按钮上写 `@click.stop="toggle"`，让开关只有一个来源（见 `MonthPicker.vue`）
- 需要验证时，在触发器元素上挂一个 listener，断言它**没有**被调用
- 反过来，`trigger="click"` 模式下不要再自己处理 click，交给 NTPopover
