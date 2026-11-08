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
import { getIsWidgetRender, getStyleField } from '@/logic/store'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

// CSS v-bind 变量必须在逻辑代码之前声明（TDZ 要求）
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize  = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')

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
    <div class="myWidget__container">
      <!-- 内容 -->
    </div>
  </WidgetWrap>
</template>

<style scoped>
/* id 由 WidgetWrap 自动设为 WIDGET_CODE */
#myWidget {
  .myWidget__container {
    z-index: var(--nt-z-index);
    position: absolute;  /* 必须：配合拖拽定位 */
    /* 在此使用 v-bind(customFontColor) 等 CSS 变量 */
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
- **v-bind 变量声明顺序**：所有 CSS `v-bind()` 引用的变量必须在 `<script setup>` 最顶部声明（imports 之后、`watch`/`onMounted` 等之前），否则生产模式触发 TDZ 错误
