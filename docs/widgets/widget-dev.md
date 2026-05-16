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

> 注意：`watch(isRender) → addTimerTask(widgetCode, task)` 是**消费方 Widget** 的责任，不是 WidgetWrap 的职责。详见下方"定时任务系统"。

### 卸载

```
WidgetWrap unmount
  ├── 从 moveState 注销拖拽回调
  └── enabled=false → removeTimerTask
```

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

`widget__wrap` div 的 `:style` 已被 `widgetStyle` 用于注入定位 CSS 变量，**禁止再 `:style` 绑定**。详见 [pitfalls.md](../../.claude/rules/pitfalls.md#vue-组件)。

## 4. 定时任务系统

```ts
addTimerTask(key, task)   // 立即执行一次 + 注册到 Map
removeTimerTask(key)      // 从 Map 删除，最后一个任务时自动停止 rAF 循环
startTimer()              // 手动启动 rAF 循环（通常不需要手动调用）
```

Widget 中使用：
```ts
watch(isRender, (value) => {
  if (!value) { removeTimerTask(WIDGET_CODE); return }
  addTimerTask(WIDGET_CODE, updateData)
}, { immediate: true })
```

- 组件卸载**无需手动移除任务**，`isEnabled` watch 会在 `enabled=false` 时自动调用
- `addTimerTask` 会**立即执行一次**，确保数据不会等到 1000ms 后才刷新
- 底层基于 `requestAnimationFrame` + 节流，后台标签页自动暂停。详见 [task.md](../architecture/task.md)
- `task/` 还提供 `addKeydownTask`、`addVisibilityTask`、`addPageFocusTask`

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
import { getIsWidgetRender } from '@/logic/store/style'
import { getStyleField } from '@/logic/store/style'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const cssVars = computed(() => ({
  '--nt-w-font-color': getStyleField(WIDGET_CODE, 'fontColor').value,
  '--nt-w-font-size': getStyleField(WIDGET_CODE, 'fontSize', 'vmin').value,
}))

const isRender = getIsWidgetRender(WIDGET_CODE)
watch(isRender, (value) => {
  if (!value) { removeTimerTask(WIDGET_CODE); return }
  addTimerTask(WIDGET_CODE, updateData)
}, { immediate: true })
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

详见 [pitfalls.md](../../.claude/rules/pitfalls.md) 和 `/add-widget` 技能。以下为 Widget 特有陷阱：

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

### 定时任务不需要手动清理

`watch(isRender)` 管理即可，`enabled=false` 会自动触发 `removeTimerTask`。

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
