# Widget 开发参考手册

## 文件结构

```
src/newtab/widgets/myWidget/
├── config.ts     # WIDGET_CODE、WIDGET_CONFIG、TWidgetConfig
├── index.ts      # 注册元信息（被 registry.ts glob 扫描）
├── index.vue     # 渲染组件
└── logic.ts      # 可选：较复杂的业务逻辑
```

## 完整 index.vue 模板示例

```vue
<script setup lang="ts">
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { getIsWidgetRender, getStyleField } from '@/logic/store/style'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

// 配置字段 → CSS 变量（前缀必须是本 widget 独有的，见文末「变量前缀」）
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')

const myStyle = computed(() => ({
  '--nt-mw-font-color': customFontColor.value,
  '--nt-mw-font-size': customFontSize.value,
}))

const updateTime = () => { /* 定时逻辑 */ }

// 启用/禁用由 isRender 表达（禁用只销毁 slot DOM，组件不卸载）
const isRender = getIsWidgetRender(WIDGET_CODE)

watch(isRender, (value) => {
  if (!value) { removeTimerTask(WIDGET_CODE); return }
  addTimerTask(WIDGET_CODE, updateTime)
}, { immediate: true })

// 兜底：错误边界让组件真的卸载时，watcher 已自动 stop
onUnmounted(() => removeTimerTask(WIDGET_CODE))
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div class="myWidget__container" :style="myStyle">
      <!-- 内容 -->
    </div>
  </WidgetWrap>
</template>

<style>
/* 必须是非 scoped：widget 的根 id 由 WidgetWrap 设置（#myWidget = WIDGET_CODE），
   不在本组件模板里，scoped 的 data-v 属性落不到它身上。
   为什么用 #id 而不是 scoped，见 docs/architecture/styles.md。 */
#myWidget {
  .myWidget__container {
    z-index: var(--nt-z-index);   /* 由 WidgetWrap 注入，拖拽层级 */
    position: absolute;            /* 必须：配合拖拽定位 */
    color: var(--nt-mw-font-color);
  }
}
</style>
```

## 关键规范速查（完整说明见 `/CLAUDE.md`）

- **颜色字段**：统一使用双元素数组 `[浅色值, 深色值]`，`getStyleField` 自动处理
- **图标**：必须先在 `src/logic/constants/icons.ts` 的 `ICONS` 定义，再从常量引用，禁止硬编码
- **Setting 原子组件**：所有表单项使用 `@/setting/fields` 中提供的 `ColorField`/`FontField`/`SliderField`/`SwitchField`/`ToggleColorField`
- **定时任务**：必须使用 `addTimerTask`/`removeTimerTask`，禁止组件内自行 `setInterval`；注册/注销挂 `watch(isRender)`，`onUnmounted` 只兜底 —— 禁用只销毁 `WidgetWrap` 内部的 slot DOM，组件不卸载，`onUnmounted` 在禁用时不会触发
- **按天刷新**：日期文本、「今」标记、第几天这类只在跨天变化的数据用 `addDailyTask`，别自己比日期
- **动态样式**：一律 `:style` + `computed` 返回 `{'--nt-{prefix}-x': value}`，禁止在 `<style>` 里写 `v-bind()`（pre-commit 会拦）。`getStyleField(code, field, unit)` 的第三个参数决定单位：尺寸用 `'vmin'`（随视口缩放）、边框/模糊用 `'px'`，颜色/字体不传
- **变量前缀**：`--nt-{prefix}-{kebab-name}`，`prefix` 必须全库唯一（如 `yp`=yearProgress、`mw`=myWidget），不得复用已有 widget 的前缀，也别只用一两个字母。命名约定与「怎么查现有前缀」见 [styles.md](../../../docs/architecture/styles.md#变量前缀)；`check-patterns` 会拦跨 widget 的前缀撞车
- **样式作用域**：widget 用非 scoped 的 `<style>` + `#widgetCode` 作根，不要用 `<style scoped>`（根 id 由 WidgetWrap 设置，scoped 属性落不上去）
