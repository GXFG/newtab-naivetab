# Widget 开发完整指南

## 概述

Widget 是 NaiveTab 扩展的核心构建单元，是可拖拽、可配置、可启用/禁用的小组件（时钟、书签、搜索、天气等）。本文档深入解析 Widget 的完整生命周期、注册流程、拖拽系统、以及各模块之间的协作机制。

> 新增 Widget 的快速操作步骤请使用 `/add-widget` 技能，本文档聚焦于"为什么要这样做"和"底层原理是什么"。

---

## 1. 整体架构

### 数据流总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Content.vue (入口)                           │
│                                                                     │
│  <component :is="item.component" v-for="item in widgetsList" />     │
│                                                                     │
│  widgetsList ← registry.ts 扫描 ./widgets/**/index.ts 自动注册       │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ 每个 Widget 对应一个组件
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    myWidget/index.vue (Widget 组件)                   │
│                                                                     │
│  <WidgetWrap :widget-code="WIDGET_CODE">                            │
│    <div class="myWidget__container">...</div>                       │
│  </WidgetWrap>                                                      │
│                                                                     │
│  ← localConfig[WIDGET_CODE] 提供配置（响应式、自动持久化）            │
│  ← moveable.ts 提供拖拽能力                                          │
│  ← task.ts 提供定时任务调度                                           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ 通过 WidgetWrap 接入
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WidgetWrap.vue (统一容器)                          │
│                                                                     │
│  职责：                                                              │
│  ├── 拖拽定位注册（向 moveState 注册 mousedown/move/up 回调）          │
│  ├── 启用控制（v-if="localConfig[code].enabled"）                     │
│  ├── 专注模式可见性（isFocusVisible）                                 │
│  ├── 布局初始化（applyContainerLayout）                               │
│  ├── 拖拽辅助线 / 高亮 / 删除动效（watch 多个状态切换 class）          │
│  └── ID 设置（:id="widgetCode"，供 CSS #xxx selector 使用）           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ 拖拽事件
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    moveable.ts (拖拽系统)                             │
│                                                                     │
│  全局监听 body mousedown/mousemove/mouseup/mouseleave                │
│  → 通过 getTargetDataFromEvent() 识别目标元素                         │
│  → 查 Map 找到对应 Widget 的回调并执行                                │
│  → requestAnimationFrame 节流优化                                     │
│  → 边界约束、居中吸附、辅助线状态管理                                   │
│  → 删除动画（animateDeleteWidget）                                    │
└─────────────────────────────────────────────────────────────────────┘
```

### 模块关系

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  config.ts   │────>│   index.ts   │────>│  index.vue   │
│  (配置定义)   │     │  (元数据注册) │     │  (UI 实现)   │
└──────┬───────┘     └──────┬───────┘     └──────┬───────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌──────────────────────────────────────────────────────────┐
│                    registry.ts                            │
│  import.meta.glob('./**/index.ts') 自动扫描                │
│  构建 registry[code] 和 widgetsList                       │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  codes.ts    │     │  store.ts    │     │  task.ts     │
│  (列表/分组)  │     │ (状态管理)    │     │ (定时调度)    │
└──────────────┘     └──────────────┘     └──────────────┘
```

---

## 2. Widget 生命周期

### 2.1 初始化阶段

```
应用启动
  │
  ├─ config.ts glob 扫描 → defaultConfig 聚合
  │    └─ src/logic/config/defaults.ts: import.meta.glob('**/config.ts')
  │
  ├─ registry.ts 扫描 → widgetsList 构建
  │    └─ import.meta.glob('./**/index.ts', { eager: true })
  │       遍历 modules → registry[meta.code] = meta
  │
  ├─ store.ts 创建 localConfig
  │    └─ 遍历 WIDGET_CODE_LIST → useStorageLocal(`c-${key}`, defaultConfig[key])
  │       从 localStorage 读取已有配置，浅层合并默认值
  │
  └─ Content.vue 渲染
       └─ v-for item in widgetsList → <component :is="item.component" />
```

### 2.2 Widget 组件挂载

```
myWidget/index.vue mount
  │
  ├─ WidgetWrap mount
  │    ├─ applyContainerLayout() — 读取 layout 配置，设置容器初始位置
  │    └─ 向 moveState 注册拖拽回调
  │         mouseDownTaskMap.set(widgetCode, startDrag)
  │         mouseMoveTaskMap.set(widgetCode, onDragging)
  │         mouseUpTaskMap.set(widgetCode, stopDrag)
  │
  ├─ watch(isRender) — 控制渲染和定时任务
  │    ├─ enabled=true → addTimerTask(widgetCode, task)
  │    └─ enabled=false → removeTimerTask(widgetCode)
  │
  └─ watch(isDragMode) — 拖拽模式下添加辅助线 class
```

### 2.3 组件卸载

```
myWidget/index.vue unmount
  │
  ├─ WidgetWrap unmount
  │    └─ 从 moveState 注销拖拽回调
  │         mouseDownTaskMap.delete(widgetCode)
  │         mouseMoveTaskMap.delete(widgetCode)
  │         mouseUpTaskMap.delete(widgetCode)
  │
  └─ watch(isRender)
       └─ enabled=false → removeTimerTask(widgetCode)
```

---

## 3. WidgetWrap 深度解析

WidgetWrap 是所有 Widget 的根容器，位于 `src/newtab/widgets/WidgetWrap.vue`。

### 3.1 提供的核心能力

| 能力 | 实现方式 | 说明 |
|------|----------|------|
| **启用控制** | `v-if="isEnabled"` 控制 `.widget__root` 渲染 | 基于 `localConfig[code].enabled` |
| **专注模式** | `.widget__wrap--hidden` 类 | 基于 `localConfig.general.focusVisibleWidgetMap[code]` |
| **ID 设置** | 内层 div `:id="widgetCode"` | 供 CSS `#widgetCode` selector 使用 |
| **拖拽定位** | 注册回调到 `moveState` 的 Map | onMounted 注册，onUnmounted 注销 |
| **布局初始化** | `applyContainerLayout()` | mount 和 enabled 时调用 |
| **辅助线** | watch `isDragMode` 切换 class | `widget-auxiliary-line`、`widget-bg-hover` 等 |
| **删除动效** | watch `moveState.isDeleteHover` | 添加 `widget-delete` class，触发脉冲动画 |

### 3.2 拖拽两层架构

WidgetWrap 的拖拽样式更新采用**两层分离设计**，核心目的是减少浏览器样式重算开销：

```
第一层（高频，每帧执行）                    第二层（低频，仅 key 切换时执行）
┌────────────────────────────┐            ┌────────────────────────────┐
│ 更新 CSS 变量的「值」         │            │ 更新 container 的「属性名」  │
│                             │            │                            │
│ 目标：widget__wrap 父 div    │            │ 目标：xxx__container 子 div  │
│ 方式：v-bind 写入 CSS 变量   │            │ 方式：el.style 直接操作      │
│ 内容：--nt-x-offset,         │            │ 内容：left/right/top/bottom  │
│        --nt-y-offset 等      │            │       指向 var(--nt-x-offset)│
│                             │            │                            │
│ 每帧只更新 4 个字符串         │            │ 正常拖动中此分支不触发        │
│ Vue 在下次 flush 批量写入     │            │ 仅当 left↔right 切换时执行   │
└─────────────────────────────┘            └────────────────────────────┘
```

**为什么需要分离？**

直接 `el.style.xxx = value` 会触发浏览器样式计算。如果每帧都执行，开销巨大。通过 CSS 变量 + v-bind，Vue 会批量合并更新，大幅减少重算次数。而方向 key（left vs right）在正常拖动中极少切换，所以可以安全地用 `el.style` 直接操作。

### 3.3 位置持久化机制

Widget 位置使用**视口百分比坐标**，确保不同分辨率下位置一致：

```
localConfig[code].layout = {
  xOffsetKey: 'left' | 'right',     // 水平方向锚点
  xOffsetValue: 50,                  // 水平百分比值（vw）
  xTranslateValue: -50,              // CSS translate 百分比（用于居中）
  yOffsetKey: 'top' | 'bottom',      // 垂直方向锚点
  yOffsetValue: 50,                  // 垂直百分比值（vh）
  yTranslateValue: -50,              // CSS translate 百分比
}
```

**关键设计：**

- 使用 vw/vh 百分比而非 px，窗口缩放时 Widget 自动跟随比例
- xOffsetKey 在 center 左侧时用 `left`，右侧时用 `right`，始终用较小值减少定位偏差
- 拖动结束时（stopDrag）才写入 localConfig，拖动过程中只更新 CSS 变量

### 3.4 拖拽辅助线系统

当进入拖拽模式（`isDragMode = true`）时，WidgetWrap 会自动添加辅助线：

```css
/* 虚线边框 */
.widget-auxiliary-line {
  outline: 2px dashed var(--nt-auxiliary-line-widget);
  outline-offset: 2px;
}

/* hover 高亮 */
.widget-bg-hover:hover {
  background-color: var(--nt-bg-moveable-widget-main);
  box-shadow: 0 2px 12px rgba(100, 181, 246, 0.25);
}

/* 选中激活态 */
.widget-active {
  background-color: var(--nt-bg-moveable-widget-active) !important;
}

/* 拖拽进行中 */
.widget-dragging {
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.28), ...;
  opacity: 0.92;
}

/* 拖入删除区 */
.widget-delete {
  animation: widget-delete-pulse 1.2s ease-in-out infinite;
}
```

这些 class 通过 watch 多个状态自动切换，Widget 开发者**无需手动管理**。

---

## 4. 拖拽系统工作原理

### 4.1 moveState 全局状态

```ts
// src/logic/moveable.ts
export const moveState = reactive({
  width: window.innerWidth,              // 视口宽度（缓存，避免频繁重排）
  height: window.innerHeight,            // 视口高度
  mouseDownTaskMap: Map<string, ...>,    // 各 Widget 的 mousedown 回调
  mouseMoveTaskMap: Map<string, ...>,    // 各 Widget 的 mousemove 回调
  mouseUpTaskMap: Map<string, ...>,      // 各 Widget 的 mouseup 回调
  isWidgetStartDrag: false,              // 是否开始拖拽（控制删除图标悬浮）
  isDeleteHover: false,                  // 是否悬停在删除区
  isXAxisCenterVisible: false,           // 水平居中辅助线
  isYAxisCenterVisible: false,           // 垂直居中辅助线
  isTopBoundVisible: false,              // 上边界辅助线
  isBottomBoundVisible: false,           // 下边界辅助线
  isLeftBoundVisible: false,             // 左边界辅助线
  isRightBoundVisible: false,            // 右边界辅助线
  currDragTarget: {                      // 当前拖拽的目标元素
    type: 'widget' | 'draft' | '',
    code: WidgetCodes | '',
  },
})
```

### 4.2 事件派发流程

```
用户 mousedown
  │
  ▼
handleMousedown(e)
  │
  ├─ 检查：isDragMode && 左键
  │
  ├─ getTargetDataFromEvent(e)
  │    向上遍历 DOM 树，寻找 data-target-type 属性
  │    找到 → {type: 'widget', code: 'clockDigital'}
  │
  ├─ moveState.currDragTarget = targetData
  │
  └─ mouseDownTaskMap.get(code)(e)
       → WidgetWrap.startDrag(e)
          ├─ 记录初始位置（getBoundingClientRect）
          └─ moveState.isWidgetStartDrag = true

用户 mousemove（requestAnimationFrame 节流）
  │
  ▼
handleMousemove(e)
  │
  ├─ requestAnimationFrame(() => {
  │    └─ mouseMoveTaskMap.get(code)(proxyEvent)
  │         → WidgetWrap.onDragging(e)
  │              ├─ 计算鼠标偏移
  │              ├─ 判断 left/right、top/bottom
  │              ├─ 居中吸附检查（DRAG_TRIGGER_DISTANCE 阈值内）
  │              ├─ 边界约束检查
  │              ├─ 第一层：更新 CSS 变量值
  │              └─ 第二层：方向 key 切换时更新 el.style
  │  })

用户 mouseup
  │
  ▼
handleMouseup(e)
  │
  ├─ 检查是否在删除区（右上角 100x100 区域）
  │    └─ 是 → animateDeleteWidget(code) → localConfig[code].enabled = false
  │
  └─ mouseUpTaskMap.get(code)(e)
       → WidgetWrap.stopDrag()
          ├─ 将 offsetData 写入 localConfig[code].layout
          └─ scheduleApplyContainerLayout()
```

### 4.3 居中吸附算法

```
                    视口中心线
                        │
     ┌──────────┐       │       ┌──────────┐
     │          │       │       │          │
     │  Widget  │  ≤阈值 │ ←吸附 → 中心对齐  │
     │          │       │       │          │
     └──────────┘       │       └──────────┘
                        │
   当 Widget 中心点与视口中心线的距离 ≤ DRAG_TRIGGER_DISTANCE 时，
   自动吸附到中心位置，并显示对应辅助线
```

关键代码：

```ts
if (Math.abs(targetCenterX - xCenterLine) <= DRAG_TRIGGER_DISTANCE) {
  moveState.isXAxisCenterVisible = true
  offsetData.xOffsetKey = 'left'
  offsetData.xOffsetValue = 50           // 50vw
  offsetData.xTranslateValue = -50        // translateX(-50%)
}
```

### 4.4 窗口大小缓存优化

```ts
// 使用 ResizeObserver 代替 window.resize 事件
if (typeof ResizeObserver !== 'undefined') {
  resizeObserver = new ResizeObserver(handleUpdateWindowSize)
  resizeObserver.observe(document.documentElement)
}
```

`moveState.width` 和 `moveState.height` 被缓存，避免频繁读取 `window.innerWidth` 触发浏览器重排。配合 `useThrottleFn` 限制更新频率为 100ms。

---

## 5. 定时任务系统

### 5.1 task.ts 任务管理

```ts
// src/logic/task.ts
let timer: ReturnType<typeof setInterval> | undefined
const tasks = new Map()

export const addTimerTask = (key: string, task: () => void) => {
  task()                    // 立即执行一次
  tasks.set(key, task)      // 注册到 Map
}

export const removeTimerTask = (key: string) => {
  tasks.delete(key)
}

export const startTimer = () => {
  timer = setInterval(() => {
    for (const task of tasks.values()) {
      task()               // 每 1000ms 遍历执行所有任务
    }
  }, 1000)
}
```

### 5.2 Widget 中使用方式

```ts
// myWidget/index.vue
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { localConfig, getIsWidgetRender } from '@/logic/store'

const isRender = getIsWidgetRender(WIDGET_CODE)

watch(
  isRender,
  (value) => {
    if (!value) {
      removeTimerTask(WIDGET_CODE)
      return
    }
    addTimerTask(WIDGET_CODE, updateTime)  // 立即执行一次，之后每 1000ms 自动触发
  },
  { immediate: true },
)
```

**关键约定：**

- 组件卸载**无需手动移除任务**，`WidgetWrap` 的 `isEnabled` watch 会在 `enabled=false` 时自动调用 `removeTimerTask`
- `addTimerTask` 会**立即执行一次**，确保数据不会等到 1000ms 后才刷新
- 全局 timer 统一为 1000ms 间隔，所有 Widget 共享同一个 setInterval

### 5.3 其他任务类型

task.ts 还提供了其他任务管理器：

| 函数 | 触发时机 | 用途 |
|------|----------|------|
| `addKeydownTask` | 键盘按下 | 全局快捷键、搜索等 |
| `addVisibilityTask` | 页面可见性变化 | 标签页切换/最小化时的数据处理 |
| `addPageFocusTask` | 页面焦点变化 | 窗口失焦/聚焦时的数据刷新 |

---

## 6. Widget 与 Setting 面板的交互

### 6.1 配置双向绑定

```
Setting 面板修改
  │
  ▼
localConfig.myWidget.fontSize = 20
  │
  ├─ Vue 响应式自动通知 Widget 组件重新渲染
  │
  ├─ useStorageLocal 800ms 防抖写入 localStorage
  │    └─ key: 'c-myWidget'
  │
  └─ chrome.storage.sync 2秒防抖同步到云端（如果开启云同步）
       └─ 版本感知 Last-Write-Wins 策略

Widget 渲染读取
  │
  ▼
localConfig.myWidget.fontSize
  │
  └─ getStyleField('myWidget', 'fontSize', 'vmin')
       ├─ 读取 localConfig 值
       ├─ 自动处理颜色双数组（取 currAppearanceCode 对应值）
       └─ 自动拼接单位（vmin 时 ×0.1，px 时直接拼接）
```

### 6.2 右键菜单跳转到 Setting

```
用户右键点击 Widget
  │
  ▼
RightClickMenu.vue
  │
  ├─ 获取 widgetCode
  │
  ├─ getWidgetSettingPane(widgetCode)
  │    └─ 查 WIDGET_SETTING_PANE_MAP[code] ?? code
  │         clockDigital → 'clockDate'（共用面板）
  │         memo         → 'memo'（自身 code）
  │
  └─ globalState.currSettingTabCode = paneCode
       globalState.isSettingDrawerVisible = true
```

**为什么需要 WIDGET_SETTING_PANE_MAP？**

所有时钟类 Widget（clockDigital、clockAnalog、clockFlip、clockNeon、date）共用同一个 `clockDate` 设置面板。Map 负责将 Widget code 映射到正确的 pane code。

未在 Map 中的 Widget，默认使用自身 code 作为 pane code。

### 6.3 设置面板注册与加载

```
src/setting/registry.ts
  │
  ├─ SETTING_GROUPS 定义分组和面板列表
  │
  ├─ PANE_DIR_MAP 处理目录名与 code 不一致的情况
  │
  └─ createSettingMeta(item)
       └─ defineAsyncComponent → import(`./panes/${dirName}/index.vue`)
            异步懒加载，首次访问时才加载对应面板
```

---

## 7. 标准 Widget 文件结构

### 最简结构（无专属 Setting 面板）

```
src/newtab/widgets/myWidget/
├── config.ts          # 配置定义（WIDGET_CODE、WIDGET_CONFIG、TWidgetConfig）
├── index.ts           # 元数据注册（code、component、config、icon、label）
└── index.vue          # Widget 组件（使用 WidgetWrap 作为根容器）
```

### 完整结构（含专属 Setting 面板）

```
src/newtab/widgets/myWidget/
├── config.ts
├── index.ts
├── index.vue
├── logic.ts              # 可选：业务逻辑抽离
└── components/           # 可选：子组件
    └── MySubComponent.vue
```

Setting 面板在 `src/setting/panes/myWidget/index.vue` 中独立管理，不在 Widget 目录内。

### config.ts 模板

```ts
export const WIDGET_CODE = 'myWidget'

export const WIDGET_CONFIG = {
  enabled: false,
  layout: {
    xOffsetKey: 'left',
    xOffsetValue: 50,
    xTranslateValue: -50,
    yOffsetKey: 'top',
    yOffsetValue: 50,
    yTranslateValue: -50,
  },
  // 自定义配置字段
  fontColor: ['rgba(255,255,255,1)', 'rgba(0,0,0,1)'],  // [浅色, 深色]
  fontSize: 20,
}

export type TWidgetConfig = typeof WIDGET_CONFIG
```

### index.ts 模板

```ts
import Index from './index.vue'
import { WIDGET_CODE, WIDGET_CONFIG } from './config'
import { WIDGET_ICON_META } from '@/logic/icons'

export default {
  code: WIDGET_CODE,
  component: Index,
  config: WIDGET_CONFIG,
  iconName: WIDGET_ICON_META[WIDGET_CODE].iconName,
  iconSize: WIDGET_ICON_META[WIDGET_CODE].widgetSize,
  widgetLabel: 'setting.myWidget',  // i18n key
}
```

### index.vue 模板

```vue
<script setup lang="ts">
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { localConfig, getIsWidgetRender, getStyleField } from '@/logic/store'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

// v-bind 变量必须放在最顶部（TDZ 要求）
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')

const isRender = getIsWidgetRender(WIDGET_CODE)

const state = reactive({
  // Widget 内部状态
})

// 定时任务
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
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="myWidget__container"
      :style="{ '--my-widget-color': customFontColor, '--my-widget-size': customFontSize }"
    >
      <!-- Widget 内容 -->
    </div>
  </WidgetWrap>
</template>

<style>
#myWidget {
  .myWidget__container {
    position: absolute;
    /* Widget 样式 */
  }
}
</style>
```

---

## 8. 快速上手：新增 Widget 完整流程

以下以新增一个「天气」Widget 为例，说明完整的开发流程。实际操作中请使用 `/add-widget` 技能确保每一步都不遗漏。

### Step 1：类型注册（最易遗漏）

在 `src/types/global.d.ts` 中将新 code 加入 `WidgetCodes` 联合类型：

```ts
// @@@@ add widget type
type WidgetCodes = 'news' | 'weather' | ... | 'myWidget'
```

遗漏此步会导致全项目类型报错。

### Step 2：创建配置文件

新建 `src/newtab/widgets/myWidget/config.ts`：

```ts
export const WIDGET_CODE = 'myWidget'

export const WIDGET_CONFIG = {
  enabled: false,
  layout: {
    xOffsetKey: 'left',
    xOffsetValue: 50,
    xTranslateValue: -50,
    yOffsetKey: 'top',
    yOffsetValue: 50,
    yTranslateValue: -50,
  },
  // 颜色字段必须用双元素数组 [浅色, 深色]
  fontColor: ['rgba(228,228,231,1)', 'rgba(228,228,231,1)'],
  fontSize: 20,
}

export type TWidgetConfig = typeof WIDGET_CONFIG
```

### Step 3：创建 Widget 组件

新建 `src/newtab/widgets/myWidget/index.vue`，必须：

- 使用 `WidgetWrap` 作为根容器
- 直接子元素必须有 `{widgetCode}__container` class（BEM 命名）
- 容器设 `position: absolute`
- 使用 `getStyleField` 读取配置
- 使用 `getIsWidgetRender` + `watch` 管理定时任务

### Step 4：创建元数据注册

新建 `src/newtab/widgets/myWidget/index.ts`。

### Step 5：图标注册

在 `src/logic/icons.ts` 中：
- 5-A：在 `ICONS` 对象中添加图标常量
- 5-B：在 `WIDGET_ICON_META` 中引用

### Step 6：类型注册

在 `src/newtab/widgets/registry.ts` 的 `WidgetConfigByCode` 中添加类型映射。

### Step 7：代码列表和分组

在 `src/newtab/widgets/codes.ts` 中：
- 7-A：添加到 `WIDGET_CODE_LIST`
- 7-B：若共用 Setting 面板，添加到 `WIDGET_SETTING_PANE_MAP`
- 7-C：添加到 `WIDGET_GROUPS` 对应分组

### Step 8：i18n

在 `src/locales/zh-CN.json` 和 `en-US.json` 中添加翻译。

### Step 9（可选）：创建专属 Setting 面板

如果需要独立的设置面板而非共用已有面板：

1. 新建 `src/setting/panes/MyWidgetSetting/index.vue`
2. 在 `src/setting/registry.ts` 的 `SETTING_GROUPS` 对应分组中注册
3. 在 `src/logic/icons.ts` 的 `SETTING_ICON_META` 中添加图标
4. 在 `src/newtab/widgets/codes.ts` 的 `WIDGET_SETTING_PANE_MAP` 中建立映射

---

## 9. 常见坑点与注意事项

### 9.1 CSS v-bind TDZ 错误（最高频）

**症状：** 生产模式下报错 `ReferenceError: Cannot access 'xxx' before initialization`，但 dev 模式正常。

**根因：** Vue SFC 编译器将 `<script setup>` 编译为 `setup()` 函数，并在顶部生成 `useCssVars()` 调用，该调用同步引用所有 `v-bind()` 变量。如果这些变量在非 hoistable 代码之后声明，生产模式下会触发 TDZ 错误。

**解决：** 所有 CSS `v-bind()` 引用的变量声明，必须放在 `<script setup>` 的最顶部——imports 之后、任何逻辑代码之前。

```vue
<script setup lang="ts">
import { getStyleField } from '@/logic/store'

// ✅ 正确：v-bind 变量在最顶部
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')

// 之后才能写 onMounted、watch 等
onMounted(() => { ... })
</script>
```

### 9.2 Widget 根容器 class 命名

`WidgetWrap` 通过 `document.querySelector('.${widgetCode}__container')` 查找容器元素。**container 的 class 必须严格为 `{widgetCode}__container`**，否则拖拽定位会失效。

### 9.3 CSS selector 必须使用 #id

Widget 样式块的外层 selector 必须为 `#widgetCode`（由 `WidgetWrap` 内层 div 自动设置 id），不是 `.{widgetCode}` 或其他选择器。

```css
/* ✅ 正确 */
#myWidget {
  .myWidget__container { ... }
}

/* ❌ 错误：用 class 而不是 id */
.myWidget { ... }
```

### 9.4 颜色字段双模式

所有涉及颜色的字段必须同时考虑浅色和深色两种主题，使用双元素数组 `[浅色值, 深色值]`。

```ts
// ✅ 正确
fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)']

// ❌ 错误：只有一个值
fontColor: 'rgba(44, 62, 80, 1)'
```

`getStyleField` 会自动读取 `localState.currAppearanceCode` 返回对应主题的值。

### 9.5 配置兼容性

修改 Widget 配置结构时，必须在 `handleAppUpdate` 中写迁移逻辑，不能直接修改已有字段的语义。

- 新增字段：在 `defaultConfig` 中加默认值，浅合并自动生效
- 修改字段：新增替代字段 + 迁移旧值 + 删除旧字段
- 删除字段：先在迁移中 `delete`，再从 `defaultConfig` 移除

每次修改配置结构都**必须同步升级 package.json 版本号**。

### 9.6 定时任务不需要手动清理

使用 `watch(isRender)` 管理定时任务即可，Widget 卸载时 `enabled=false` 会自动触发 `removeTimerTask`，无需在 `onUnmounted` 中手动清理。

### 9.7 拖拽模式下才注册事件

拖拽事件监听（mousedown/mousemove/mouseup）只在 `isDragMode = true` 时才添加到 body 上。Widget 的 `onMounted` 中向 `moveState` 的 Map 注册回调，`onUnmounted` 中从 Map 删除。

### 9.8 图标必须用 ICONS 常量

禁止在模板或代码中硬编码图标字符串（如 `'mdi:play'`），必须通过 `ICONS` 常量引用，否则 unplugin-icons 会报错。

```ts
// ✅ 正确
import { ICONS } from '@/logic/icons'
iconName: ICONS.myWidget

// ❌ 错误
iconName: 'mdi:some-icon'
```

### 9.9 禁止硬编码图标字符串，必须通过 ICONS 常量引用

```ts
// ✅ 正确
import { ICONS } from '@/logic/icons'
<Icon :icon="ICONS.countdownPlay" />

// ❌ 错误
<Icon icon="mdi:play" />
```

### 9.10 widget__wrap 的 style 已被占用

`WidgetWrap` 中 `widget__wrap` div 的 `style` 属性被用于存放 v-bind 的 CSS 变量，**不能再对其进行 `:style` 操作**。如果需要注入额外样式变量，应合并到 WidgetWrap 内部的 `widgetStyle` computed 中，或在内层元素上操作。

---

## 10. 附录

### 10.1 关键文件索引

| 文件 | 职责 |
|------|------|
| `src/newtab/widgets/registry.ts` | Widget 注册表，glob 扫描 + 构建 widgetsList |
| `src/newtab/widgets/codes.ts` | Widget 代码列表、分组、Setting 面板映射 |
| `src/newtab/widgets/WidgetWrap.vue` | Widget 统一容器，提供拖拽、启用控制、专注模式等能力 |
| `src/logic/moveable.ts` | 全局拖拽系统，事件派发、居中吸附、删除动画 |
| `src/logic/task.ts` | 定时任务管理（1000ms 全局 timer） |
| `src/logic/store.ts` | 状态管理（localConfig、localState、globalState、getStyleField） |
| `src/logic/config/defaults.ts` | 配置聚合（glob 扫描所有 config.ts） |
| `src/setting/registry.ts` | Setting 面板注册表，异步加载 |
| `src/types/global.d.ts` | 全局类型定义（WidgetCodes 等） |
| `src/logic/icons.ts` | 图标常量与元数据 |

### 10.2 存储 Key 规则

| 数据类型 | Key 格式 | 示例 |
|----------|----------|------|
| Widget 配置 | `c-{widgetCode}` | `c-clockDigital` |
| 通用配置 | `c-general` | `c-general` |
| 本地状态 | `l-state` | `l-state` |

`useStorageLocal` 有 **800ms 防抖**，避免频繁写入 localStorage。

### 10.3 拖拽布局坐标说明

```
视口坐标系：
(0,0) ───────────────────────────► width (100vw)
  │
  │
  ▼
height (100vh)

Widget 位置：
- xOffsetKey='left' + xOffsetValue=50 → 左边距 50vw
- xOffsetKey='right' + xOffsetValue=20 → 右边距 20vw
- xTranslateValue=-50 → 水平向左平移自身宽度的 50%（居中效果）
```
