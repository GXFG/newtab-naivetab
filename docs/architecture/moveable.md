# 拖拽系统（moveable）

`src/logic/moveable.ts` 实现 Widget 的拖拽定位、编辑模式管理和组件库抽屉控制。键盘系统的拖拽渲染详见 [keyboard.md](../features/keyboard.md)。

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/logic/moveable.ts` | 拖拽状态机、鼠标事件分发、窗口自适应 |
| `src/newtab/widgets/WidgetWrap.vue` | Widget 包裹组件，注册鼠标任务到 moveState |
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
  mouseDownTaskMap: Map,  // mousedown 任务映射
  mouseMoveTaskMap: Map,  // mousemove 任务映射
  mouseUpTaskMap: Map,    // mouseup 任务映射
  isWidgetStartDrag: boolean,     // 是否开始拖动 Widget
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

`widget__wrap` div 的 `style` 由 `WidgetWrap` 组件自动注入定位值，不可再对其进行 `:style` 绑定。这是项目规则之一（见 `pitfalls.md`）。

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
