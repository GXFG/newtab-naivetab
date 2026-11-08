# Widget 开发完整指南

> 新增 Widget 的快速操作步骤请使用 `/add-widget` 技能，本文档聚焦于"为什么要这样做"和"底层原理是什么"。

## 1. 整体架构

### 数据流总览

```
┌───────────────────────┐
│  Content.vue (入口)    │  v-for widgetsList → <component :is="..." />
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│  myWidget/index.vue   │  <WidgetWrap :widget-code="WIDGET_CODE">
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│  WidgetWrap.vue       │  拖拽定位、启用控制、专注模式、布局初始化
└───────────┬───────────┘
            ▼
┌───────────────────────┐
│  moveable.ts          │  全局 mousedown/mousemove/mouseup 事件派发
└───────────────────────┘
```

### 模块关系

```
config.ts → index.ts → index.vue → WidgetWrap.vue
   ↓           ↓          ↓           ↓
registry.ts ←  glob 扫描  ← 各 Widget
   ↓
codes.ts / store/ / task/  (列表、状态、定时任务)
```

## 2. Widget 生命周期

### 初始化

```
应用启动 → config.ts glob 扫描 → defaultConfig 聚合
         → registry.ts 扫描 → widgetsList 构建
         → store/ 创建 localConfig (useStorageLocal)
         → Content.vue 渲染
```

### 挂载

```
WidgetWrap mount
  ├── applyContainerLayout() → 读取 layout 设置初始位置
  ├── 向 moveState 注册拖拽回调 (mousedown/mousemove/mouseup)
  └── watch(isDragMode) → 辅助线 class
```

> 注意：`watch(isRender) → addTimerTask(widgetCode, task)`（注销同理）是**消费方 Widget** 的责任，不是 WidgetWrap 的职责。详见下方"定时任务系统"。

### 禁用 / 卸载

`v-if="isEnabled"` 在 WidgetWrap **内部**，只包住 `<slot />`：

```
div.widget__wrap            ← 常驻
└── div v-if="isEnabled"     ← 禁用时被销毁的是这一层和它的 slot DOM
      └── <slot />           ← Widget 的模板内容
```

```
enabled = false（禁用，不是卸载）
  └── slot DOM 被销毁，Widget 组件实例仍在 → onUnmounted 不触发

WidgetWrap unmount（组件真的被销毁，如 WidgetErrorBoundary 捕获异常）
  ├── 从 moveState 注销拖拽回调
  └── 消费方 Widget 的 onUnmounted 兜底注销任务
```

所以「禁用」这条路径只能由 `watch(isRender)` 感知，`onUnmounted` 感知的是另一种（罕见）情况。

## 3. WidgetWrap 核心能力

| 能力 | 实现方式 |
|------|----------|
| 启用控制 | `v-if="isEnabled"` 控制 `.widget__root` 渲染 |
| 专注模式 | `.widget__wrap--hidden` 类 |
| ID 设置 | 内层 div `:id="widgetCode"`，供 CSS `#widgetCode` selector |
| 拖拽定位 | 注册回调到 `moveState` 的 Map |
| 布局初始化 | `applyContainerLayout()` mount 和 enabled 时调用 |
| 辅助线 | watch `isDragMode` 切换 class |

### 拖拽两层架构

```
第一层（高频，每帧）                          第二层（低频，仅 key 切换）
更新 CSS 变量的「值」                           更新 container 的「属性名」
目标：widget__wrap 父 div                      目标：xxx__container 子 div
方式：:style 写入 CSS 变量                     方式：el.style 直接操作
内容：--nt-x-offset, --nt-y-offset            内容：left/right/top/bottom
每帧只更新 4 个字符串                           正常拖动中此分支不触发
```

Vue `:style` 批量合并 CSS 变量更新，减少重算。方向 key（left↔right）极少切换，可安全用 `el.style`。

### 位置持久化

```
localConfig[code].layout = {
  xOffsetKey: 'left' | 'right',   xOffsetValue: 50,     xTranslateValue: -50,
  yOffsetKey: 'top' | 'bottom',   yOffsetValue: 50,     yTranslateValue: -50,
}
```

使用 vw/vh 百分比，窗口缩放时自动跟随。拖动结束时才写入 localConfig。

### widget__wrap style 注入限制

`widget__wrap` div 的 `:style` 已被 `widgetStyle` 用于注入定位 CSS 变量，**禁止再 `:style` 绑定**。详见 [pitfalls-vue.md](../../.claude/rules/pitfalls-vue.md)。

## 4. 定时任务系统

```ts
addTimerTask(key, task)    // 立即执行一次 + 注册到 Map
removeTimerTask(key)       // 从 Map 删除，最后一个任务时自动停止 rAF 循环
addDailyTask(key, task)    // 按天刷新（跨本地午夜一次），与 timer 共用同一个 rAF 循环
removeDailyTask(key)
startTimer()               // 手动启动 rAF 循环（通常不需要手动调用）
```

Widget 中使用 — **注册/注销都挂在 `watch(isRender)` 上，`onUnmounted` 只作兜底**：
```ts
const isRender = getIsWidgetRender(WIDGET_CODE)

watch(
  isRender,
  (value) => {
    if (!value) {
      removeDailyTask(WIDGET_CODE)
      return
    }
    addDailyTask(WIDGET_CODE, updateData) // 立即执行一次，首次渲染靠它
  },
  { immediate: true },
)

// 兜底：错误边界让组件真的卸载时，watcher 已随作用域 stop
onUnmounted(() => removeDailyTask(WIDGET_CODE))
```

- **为什么不是 `onMounted`/`onUnmounted`**：`Content.vue` 用 `v-for` 无条件挂载所有 Widget，
  `WidgetWrap` 的 `v-if="isEnabled"` 只销毁它内部那层 div 和 slot DOM，Widget 组件实例始终活着。
  禁用时 `onUnmounted` **不触发**，`onMounted` 也只在页面加载时跑一次 —— 这两个钩子都不对应
  「启用/禁用」。实测（真实 `WidgetWrap` + 真实 store）：启用 → `watch(true)` + `onMounted`；
  禁用 → 只有 `watch(false)` 执行，DOM 消失但 `onUnmounted` 没跑；再启用 → `watch(true)`
- **`onUnmounted` 仍要写**：`WidgetErrorBoundary` 捕获异常后 slot 被卸载、组件真的销毁，
  watcher 随作用域自动 stop，这时只有 `onUnmounted` 收得到。只写 watch 会漏掉这条路径
- **漏写注销的代价**：任务留在 Map 里，`dailyTasks` 不清空 → 共享的 rAF 循环永不停止；
  `yearProgress` 实时模式这类秒级任务还会对着一个看不见的 Widget 每秒重算
- **按天刷新用 `addDailyTask`**：日期文本、「今」标记、一年中的第几天这类只在跨天时变化的数据，
  共享同一次日期比较；不要自己在 `addTimerTask` 里比日期，更不要 `setInterval`
- 两者都是**立即执行一次**，首次渲染不必再单独调一遍
- 底层基于 `requestAnimationFrame` + 节流，后台标签页自动暂停。详见 [task.md](../architecture/task.md)
- `task/` 还提供 `addKeydownTask`、`addVisibilityTask`、`addPageFocusTask`
- 这套契约有回归用例兜着：`src/newtab/widgets/__tests__/task-lifecycle.test.ts` 会挂载真实
  `date` / `yearProgress` 组件跑启停序列，改动注册时机前先让它红一次再动手

## 5. Widget 与 Setting 面板的交互

### 配置双向绑定

```
Setting 修改 → localConfig.myWidget.fontSize = 20
  → Vue 响应式通知 Widget 重新渲染
  → useStorageLocal 800ms 防抖写入 localStorage
  → chrome.storage.sync 2秒防抖同步到云端
```

### 右键菜单跳转 Setting

`src/newtab/layers/RightClickMenu.vue` → `getWidgetSettingPane(widgetCode)` 查映射 → 打开对应 Setting pane。

所有时钟类 Widget 共用 `clockDate` 设置面板，通过 `WIDGET_SETTING_PANE_MAP` 映射。未在 Map 中的 Widget 默认使用自身 code。

## 6. 标准 Widget 文件结构

### 最简结构
```
src/newtab/widgets/myWidget/
├── config.ts          # WIDGET_CODE、WIDGET_CONFIG、TWidgetConfig
├── index.ts           # code、component、config、icon、label
└── index.vue          # 使用 WidgetWrap 作为根容器
```

### 完整结构（含 Setting 面板）
```
src/newtab/widgets/myWidget/
├── config.ts / index.ts / index.vue
Setting 面板在 src/setting/panes/myWidget/index.vue
```

### index.vue 模板
```vue
<script setup lang="ts">
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { getIsWidgetRender, getStyleField } from '@/logic/store/style'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const cssVars = computed(() => ({
  '--nt-w-font-color': getStyleField(WIDGET_CODE, 'fontColor').value,
  '--nt-w-font-size': getStyleField(WIDGET_CODE, 'fontSize', 'vmin').value,
}))

const isRender = getIsWidgetRender(WIDGET_CODE)

watch(
  isRender,
  (value) => {
    if (!value) {
      removeTimerTask(WIDGET_CODE)
      return
    }
    addTimerTask(WIDGET_CODE, updateData)
  },
  { immediate: true },
)

onUnmounted(() => removeTimerTask(WIDGET_CODE))
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div class="myWidget__container" :style="cssVars">...</div>
  </WidgetWrap>
</template>

<style>
#myWidget {
  .myWidget__container { position: absolute; /* 样式 */ }
}
</style>
```

## 7. 常见坑点

详见 [pitfalls.md](../../.claude/rules/pitfalls.md)（踩坑索引）和 `/add-widget` 技能。以下为 Widget 特有陷阱：

### Widget 根容器 class 命名

`WidgetWrap` 通过 `document.querySelector('.${widgetCode}__container')` 查找容器。**class 必须严格为 `{widgetCode}__container`**，否则拖拽失效。

### CSS selector 必须使用 #id

Widget 样式块的外层 selector 必须为 `#widgetCode`（由 WidgetWrap 内层 div 自动设置 id）：

```css
/* ✅ 正确 */
#myWidget { .myWidget__container { ... } }
/* ❌ 错误 */
.myWidget { ... }
```

### 颜色字段双模式

所有颜色必须双元素数组 `[浅色, 深色]`，`getStyleField` 自动取当前主题值。

### 图标必须用 ICONS 常量

禁止硬编码图标字符串（如 `'mdi:play'`），必须通过 `ICONS` 常量引用。

### 定时任务的注销要挂 `isRender`，不是 `onUnmounted`

`WidgetWrap` 的 `v-if="isEnabled"` 在内部、只销毁 slot DOM，Widget 组件实例不会因为禁用而卸载，
`onUnmounted` 在禁用时**不会触发**。所以注销写在 `onUnmounted` 里等于「禁用后任务永远留着」——
`dailyTasks` 不清空，共享 rAF 循环就不会停。注册/注销挂 `watch(isRender)`，
再把 `onUnmounted` 留着兜住真实的卸载（错误边界）路径。

## 8. 附录

### 关键文件索引

| 文件 | 职责 |
|------|------|
| `src/common/widget-constants.ts` | 代码列表、分组、Setting 面板映射、类型 |
| `src/newtab/widgets/registry.ts` | glob 扫描 + 构建 widgetsList |
| `src/newtab/widgets/WidgetWrap.vue` | Widget 统一容器 |
| `src/logic/moveable.ts` | 全局拖拽系统 |
| `src/logic/task/` | 定时任务管理 |
| `src/setting/registry.ts` | Setting 面板注册表 |
| `src/logic/constants/icons.ts` | 图标常量 |

### 存储 Key 规则

| 数据类型 | Key 格式 | 示例 |
|----------|----------|------|
| Widget 配置 | `c-{widgetCode}` | `c-clockDigital` |
| 通用配置 | `c-general` | `c-general` |
| 本地状态 | `l-state` | `l-state` |
