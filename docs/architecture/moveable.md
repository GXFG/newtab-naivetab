# 拖拽系统（moveable）

`src/logic/moveable.ts` 实现 Widget 的拖拽定位、编辑模式管理和组件库抽屉控制。键盘系统的拖拽渲染详见 [keyboard.md](../features/keyboard.md)。

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/logic/moveable.ts` | 拖拽/缩放状态机、鼠标事件分发、窗口自适应 |
| `src/newtab/widgets/WidgetWrap.vue` | Widget 包裹组件，注册鼠标任务到 moveState（拖拽 + 缩放） |
| `src/newtab/widgets/scalable-registry.ts` | 聚合所有 Widget 的可缩放字段声明（SCALABLE_FIELD_REGISTRY） |
| `src/newtab/draft/DraftDrawer.vue` | 组件库抽屉，拖拽添加 Widget 的入口 |

## 核心状态

```ts
// 编辑模式开关（toggle 函数由 WidgetWrap 中的按钮触发）
const isDragMode: Ref<boolean>
const toggleIsDragMode: () => void

// 组件库抽屉开关
const isDraftDrawerVisible: Ref<boolean>
const toggleIsDraftDrawerVisible: () => void

// 拖拽运行时状态
const moveState = reactive({
  width: number,          // 窗口宽度（缓存，避免频繁重排）
  height: number,         // 窗口高度
  mouseDownTaskMap: Map,  // mousedown 任务映射（拖拽）
  mouseMoveTaskMap: Map,  // mousemove 任务映射（拖拽）
  mouseUpTaskMap: Map,    // mouseup 任务映射（拖拽）
  resizeDownTaskMap: Map, // mousedown 任务映射（缩放，与拖拽平行）
  resizeMoveTaskMap: Map, // mousemove 任务映射（缩放）
  resizeUpTaskMap: Map,   // mouseup 任务映射（缩放）
  isWidgetStartDrag: boolean,     // 是否开始拖动 Widget
  isWidgetResizing: boolean,      // 是否正在缩放（mousedown →  true, mouseup → false）
  isDeleteHover: boolean,         // 鼠标是否在删除区域
  // 辅助线可见性
  isXAxisCenterVisible: boolean,
  isYAxisCenterVisible: boolean,
  isTopBoundVisible: boolean,
  isBottomBoundVisible: boolean,
  isLeftBoundVisible: boolean,
  isRightBoundVisible: boolean,
  // 当前拖动目标
  currDragTarget: { type: EleTargetType | '', code: EleTargetCode | '' },
})
```

## 架构：任务映射鼠标事件系统

```
WidgetWrap 挂载
    │
    ▼
注册 startDrag / onDragging / stopDrag 到 mouseDown/MouseUpTaskMap
    │
    ▼
isDragMode = true 时，body 添加 mousedown/mousemove/mouseup/mouseleave 监听器
    │
    ▼
mousedown → getTargetDataFromEvent() 识别 data-target-type/code → 执行对应 mouseDownTask
    │
    ▼
mousemove → requestAnimationFrame 节流 → 执行对应 mouseMoveTask
    │
    ▼
mouseup → 检查删除区域 → 执行对应 mouseUpTask → 恢复抽屉状态
```

### 任务注册与执行

每个 Widget 通过 `WidgetWrap` 在 `onMounted` 中向 `moveState` 的 Map 注册自己的 `startDrag`、`onDragging`、`stopDrag` 函数。拖拽时：

1. `mousedown`：通过事件冒泡，沿 DOM 树向上查找 `data-target-type` 和 `data-target-code` 属性，确定拖拽目标
2. 根据 `currDragTarget.type`（`widget` 或 `draft`）和 `code`，从对应的 Map 中获取并执行 task
3. `mousemove` 使用 `requestAnimationFrame` 节流，避免高频事件导致性能问题
4. `mouseup`：检查是否在删除区域（右上角 x > width-100, y < 100），是则触发删除动画，否则执行 `stopDrag`

### 目标识别

Widget 元素上通过 `data-target-type="widget"` 和 `data-target-code="{widgetCode}"` 属性标识。`getTargetDataFromEvent` 从事件目标沿 DOM 树向上遍历查找这些属性。

**Resize handle** 使用 `data-target-type="widget-resize"` 标识。handle 是 widget 容器（`__container`）的子元素，事件冒泡先到达 handle → `getTargetDataFromEvent` 返回 `type='widget-resize'` → `handleMousedown` 路由到 resize Task Map。设计确保了 resize 优先级天然高于拖拽。

## Resize 缩放系统

### 架构概览

Resize 与拖拽共享相同的事件路由框架（`handleMousedown → handleMousemove → handleMouseup`），但使用独立的三层 Task Map：

```
WidgetWrap.onMounted
    │
    ├── moveState.resizeDownTaskMap.set(code, startResize)
    ├── moveState.resizeMoveTaskMap.set(code, onResizing)
    └── moveState.resizeUpTaskMap.set(code, stopResize)
    
mousedown（data-target-type='widget-resize'）
    │
    ├── moveState.isWidgetResizing = true
    └── 执行 resizeDownTaskMap[code] → startResize（快照容器尺寸和字段值）
    
mousemove（rAF 节流）
    │
    └── moveState.isWidgetResizing === true
        → resizeMoveTaskMap[code] → onResizing（计算缩放因子 → 写入 localConfig）
    
mouseup
    │
    ├── resizeUpTaskMap[code] → stopResize（fields = null sentinel）
    └── moveState.isWidgetResizing = false
```

关键差异：resize 的 mouseup **不清除** `currDragTarget`（`drag` 路径会清除）。这是有意设计——resize 结束后 widget 保持选中态，拖拽 handle 持续可见，方便连续操作。

### SCALABLE_FIELD_REGISTRY

各 Widget 通过 `config.ts` 中的 `SCALABLE_FIELDS` 导出声明自己的可缩放字段，`scalable-registry.ts` 在模块初始化时通过 `import.meta.glob` 聚合为 `SCALABLE_FIELD_REGISTRY`。

```ts
// 单个 Widget 声明示例（clockAnalog/config.ts）
export const SCALABLE_FIELDS = {
  width: { min: 100, max: 500 },
}

// 跨 section 示例（keyboardBookmark/config.ts）
export const SCALABLE_FIELDS = {
  keycapSize: { min: 30, max: 150, configSection: 'keyboardCommon' },
}

// 聚合后类型
type SCALABLE_FIELD_REGISTRY: Partial<Record<WidgetCodes, TScalableFieldsMap>>
```

### 缩放算法：对角投影法

```
scaleFactor = 1 + (dx + dy) / (startWidth + startHeight)
```

将鼠标位移向量 `(dx, dy)` 投影到容器对角线方向，所有可缩放字段按统一 scaleFactor 缩放，保持视觉比例一致。

**算法假设**：handle 固定在右下角（`right: 3px; bottom: 3px; cursor: nwse-resize`）。
- 向东南拖拽（右下角）：dx > 0, dy > 0 → scaleFactor > 1 → 放大
- 向西北拖拽（右下角）：dx < 0, dy < 0 → scaleFactor < 1 → 缩小

**为什么直接写入 localConfig**：与拖拽的 offsetData 缓冲 → stopDrag 批量写入不同，resize 的 scaleFactor 是相对增量，下一帧计算依赖当前帧的容器实际尺寸。延迟批量写入会导致下一帧读到旧的 rect 尺寸，计算偏差累积。

### Resize Handle DOM 管理

Handle 通过原生 DOM API（`container.appendChild`）注入到 widget 容器（`__container`）内，而非 Vue 模板渲染。

**原因**：容器是子组件（Widget）的根元素，WidgetWrap 无法通过 `<slot>` 向其根元素注入额外子元素；且 handle 需要与容器保持一致的 `position: absolute` 定位锚点。

**Vue vdom diff 防御**：Vue 重渲染 widgets 时，vdom diff 会把外部 append 的元素当作多余节点移除。因此有两层保障：
- `onUpdated` 钩子 → 每次 Widget 重渲染后检查 handle 是否仍连接
- `watch(shouldShowHandle)` → 选中状态/拖拽模式/字段可用性变化时同步显隐

### Resize 与页面窗口 resize 的区别

| 概念 | 含义 | 位置 |
|------|------|------|
| Widget resize | 拖拽右下角 handle 缩放 Widget 尺寸字段 | `WidgetWrap.vue` + `moveState.resize*TaskMap` |
| 窗口 resize（ResizeObserver） | 监听浏览器窗口尺寸变化，更新 moveState.width/height | `moveable.ts` updateWindowSize |

两者名称相似但无关联关系。ResizeObserver 缓存窗口尺寸供拖拽边界计算使用，Widget resize 依赖的 `moveState.width/height` 正是由此更新。

## Widget 定位系统

### 数据结构

```ts
localConfig[code].layout = {
  xOffsetKey: 'left' | 'right',      // 水平对齐基准
  xOffsetValue: number,              // vw 单位
  xTranslateValue: number,           // CSS translate 百分比（居中）
  yOffsetKey: 'top' | 'bottom',      // 垂直对齐基准
  yOffsetValue: number,              // vh 单位
  yTranslateValue: number,           // CSS translate 百分比（居中）
}
```

### 为什么用 vw/vh

使用视口百分比而非像素存储位置，确保 Widget 在不同屏幕尺寸和缩放比例下保持相对位置。拖拽时在 `mouseup` 时写入 `localConfig`，避免拖拽过程中频繁存储。

## 删除机制

拖到右上角区域（`x > moveState.width - 100` 且 `y < 100`）触发删除：

```ts
animateDeleteWidget(code: WidgetCodes) →
  1. 找到 .${code}__container
  2. 添加 transition: transform 250ms + opacity 250ms
  3. 应用 scale(0.3) + opacity: 0
  4. setTimeout(260ms) → localConfig[code].enabled = false
```

**注意**：动画时长 250ms，延迟 260ms 才设置 `enabled = false`，确保 CSS transition 完成后再隐藏组件。

## 窗口自适应

### ResizeObserver

使用 `ResizeObserver` 监听 `document.documentElement` 尺寸变化，节流 100ms 更新 `moveState.width/height`。降级方案：不支持 ResizeObserver 的浏览器使用 `window.addEventListener('resize', ...)`。

```
ResizeObserver.observe(document.documentElement)
    ↓
handleUpdateWindowSize (useThrottleFn, 100ms)
    ↓
moveState.width = innerWidth
moveState.height = innerHeight
```

### 性能优化

`window.innerWidth` 属于 Layout 属性，频繁读取会触发浏览器重排。缓存后速度提升约 30%（Chrome 118 测试）。

## 抽屉自动隐藏

拖拽开始时自动关闭 DraftDrawer（避免遮挡视线），拖拽结束后恢复之前的状态：

```ts
// mousemove 中
if (lastIsDraftDrawerVisible === null) {
  lastIsDraftDrawerVisible = isDraftDrawerVisible.value
  if (lastIsDraftDrawerVisible) {
    toggleIsDraftDrawerVisible(false)
  }
}

// mouseup 中
if (lastIsDraftDrawerVisible) {
  toggleIsDraftDrawerVisible(true)
  lastIsDraftDrawerVisible = null
}
```

## 辅助线

`moveState` 中有 6 个辅助线可见性标志位（X/Y 轴居中、四边边界），由具体 Widget 的 `onDragging` 函数控制。当前主要用于 DraftDrawer 中拖拽新 Widget 时的定位参考。

## 常见踩坑

### 1. WidgetWrap 的 style 由系统控制

`widget__wrap` div 的 `style` 由 `WidgetWrap` 组件自动注入定位值，不可再对其进行 `:style` 绑定。这是项目规则之一（见 `pitfalls-vue.md`）。

### 2. 删除区域检测的边界

删除区域固定在右上角（x > width-100, y < 100）。鼠标抬起时还会额外检查 `isInDeleteZone`，防止鼠标移出删除区域后 delete icon 缩回导致 `isDeleteHover` 丢失。

### 3. rAF 事件对象捕获

`mousemove` 中使用 `requestAnimationFrame` 时，必须在 rAF 回调外捕获 `clientX/clientY/buttons`，因为 rAF 回调执行时原始 `event` 对象可能已被浏览器更新。

### 4. rAF 回调中的 currMouseTaskKey 必须在同步上下文中捕获

拖动 A widget 释放后快速点击 B，A 的最后一个 `mousemove` 已提交 rAF 回调但尚未执行，此时 `mousedown(B)` 已将 `currDragTarget.code` 改为 B。若 rAF 回调中直接读取 `currMouseTaskKey.value`，会拿到 B 的 key，导致用 A 的坐标调 B 的 `onDragging`。

**正确做法**：在 `handleMousemove` 的同步作用域中捕获 `currTaskKey = currMouseTaskKey.value`，rAF 回调使用捕获值。

### 5. handleMousedown 的 async/await 不会导致 mousemove 竞态

`handleMousedown` 是 async 函数，内部 `await task(e)` 调用 `startDrag`（含 `await nextTick()`）。虽然 async 函数遇到 await 会返回 Promise，但浏览器的事件派发模型是**串行**的：当前事件的所有监听器（含 Promise）resolve 之前，不会派发下一个鼠标事件。且用户从按下鼠标到产生位移至少需要几十毫秒，远超 `await nextTick()` 的执行时间。

### 6. 编辑模式退出时的清理

`isDragMode` 变为 `false` 时会自动：
- 移除所有鼠标事件监听器
- 重置 `moveState` 所有状态
- 清除 `requestAnimationFrame` 请求

### 7. `isWidgetResizing` 不清除 `currDragTarget`

Resize mouseup 路径**不清除** `currDragTarget`（drag mouseup 路径会清除）。这是有意设计：resize 结束后 widget 保持选中态，handle 持续可见，方便连续操作。

### 8. `onResizing` 在 rAF 回调中直接写入 `localConfig`

与拖拽的 `offsetData` 缓冲机制不同，resize 直接写 `localConfig`。因为缩放因子是相对增量，下一帧计算依赖当前帧的容器实际尺寸——延迟写入会导致下帧读到旧 rect。`reactive()` 响应性保证写入后 Vue 自动驱动 Widget 重渲染。

### 9. `stopResize` 的 sentinel 模式

`stopResize` 只将 `fields` 设为 `null`，不清除 `clientX`/`clientY`/`rect`/`fieldValues`。`onResizing` 首行检查 `if (!fields) return`，其余字段仅在 `fields` 非 null 时才被访问，无副作用。这种 sentinel 模式避免了不必要的属性重置操作。
