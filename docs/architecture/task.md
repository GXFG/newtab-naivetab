# 定时任务系统

`src/logic/task/` 提供五类任务系统，管理 newtab 页面的生命周期事件（键盘、定时、日切、可见性、页面焦点）。所有 Widget 和页面逻辑必须通过这些 API 注册/注销任务，禁止直接使用 `setInterval`、`document.onkeydown` 或 `addEventListener`。

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/logic/task/` | 五类任务系统的注册、注销、启停 |

## 五类任务系统

```
┌─────────────────────────────────────────────────────────────┐
│                      定时任务系统                            │
├──────────────┬──────────────────────────────────────────────┤
│ 任务类型      │ 说明                                        │
├──────────────┼──────────────────────────────────────────────┤
│ keydown      │ 键盘事件分发，返回 true 短路后续 handler       │
│ timer        │ rAF + 节流(1s)，后台标签自动暂停，统一调度秒级任务  │
│ daily        │ 跨本地午夜触发一次，复用 timer 的循环，不另起定时器 │
│ visibility   │ document.visibilitychange 监听                │
│ pageFocus    │ 页面焦点恢复时触发（由 App.vue 手动调用）       │
└──────────────┴──────────────────────────────────────────────┘
```

## 1. Keydown 任务

```ts
addKeydownTask(key: KeydownTaskKey, task: (e: KeyboardEvent) => boolean | void, priority: TaskPriority)
removeKeydownTask(key: KeydownTaskKey)
startKeydown()   // 注册 document.onkeydown
stopKeydown()    // 注销 document.onkeydown
```

`TaskPriority` 类型：`0 | 10 | 20 | 30`（数字越小越优先）。

### 返回值约定

- 返回 `true`：已处理此事件，**后续 task 不再执行**（短路）
- 返回 `false` / `undefined`：未处理，继续传递给其他 task

### 执行顺序

`startKeydown` 按 **优先级升序** 遍历 task（同优先级按 Map 注册顺序）。当前分配：

| Priority | Task | 说明 |
|----------|------|------|
| 0 | `globalShortcut` | 命令快捷键，最高优先 |
| 10 | `keyboardBookmark` | 书签键盘 |
| 20 | `bookmarkFolder` | 书签文件夹导航（仅 Escape） |
| 30 | `draft-tool` | 草稿工具（仅 Escape） |

防冲突由各 task 内部修饰键过滤保证：

| Task | 过滤规则 |
|------|---------|
| globalShortcut | 需要至少一个修饰键（ctrl/shift/alt/meta） |
| keyboard widget | 过滤 ctrlKey \|\| metaKey |
| bookmarkFolder | 仅响应 Escape |

### 特殊处理

- **引导模式**：`globalState.isGuideMode` 为 `true` 时，所有按键被忽略
- **设置面板**：面板打开时 `Escape` 被拦截用于关闭面板，不再传递给 task。通过 `globalState.drawerStack` 实现逐层关闭：栈长度 >1 时关闭最上层子 Drawer，否则关闭 Setting 主面板。子 Drawer 通过 `useDrawerStack` composable 自动注册/注销。详见 [setting.md](setting.md#drawer-stack-架构)。
- **启动时机**：`startKeydown()` 在 `src/newtab/App.vue` 的 `onMounted` 中调用

## 2. Timer 任务（rAF 秒级定时器）

```ts
addTimerTask(key: string, task: () => void)   // 立即执行一次 + 注册
removeTimerTask(key: string)                   // 删除，最后一个任务时自动停止
startTimer()                                   // 手动启动 rAF 循环
stopTimer()                                    // 取消 rAF
```

### 实现机制

基于 `requestAnimationFrame` + 节流（`TICK_INTERVAL = 1000ms`），而非 `setInterval`。详见 `src/logic/task/timer.ts`。

**核心优势：** 后台标签页自动暂停，切换回前台自动恢复，不会像 `setInterval` 那样在后台累积执行。

### 行为

- **注册即执行**：`addTimerTask` 会**立即执行一次** `task()`，然后再由定时器周期调度
- **自动停止**：删除最后一个任务时自动取消 rAF 循环，不需要页面卸载时手动 `stopTimer()`
- **任务执行顺序**：按 Map 注册顺序遍历，无优先级
- **逐个隔离异常**：某个任务抛错只记 `console.error`，不影响同批次其它任务与下一帧。**不加这一层时，任一任务抛错会中断 for 循环、`requestAnimationFrame` 也跑不到，整条 rAF 链永久断开**（所有定时任务冻结直到页面重载）
- **注册时的首次执行不在隔离范围内**：错误照常抛回调用方，便于在组件 `setup` 阶段暴露问题
- **注册/注销时机**：挂 `watch(isRender)`，`onUnmounted` 只作兜底。禁用只是销毁 `WidgetWrap` 内部的 slot DOM、组件不卸载，`onUnmounted` 收不到这条路径；结构说明与实测记录见 [widget-dev.md §4](../widgets/widget-dev.md#4-定时任务系统)

### 典型用途

- ClockDigital / ClockAnalog / ClockFlip / ClockNeon：每秒更新时钟显示
- Countdown：每秒刷新剩余时间
- YearProgress：开启「实时」模式时每秒重算百分比（跨天部分见 [§5](#5-daily-任务日切)）

News / Weather **不用** timer：数据自带 `syncTime` + 刷新间隔（TTL），挂载时判断是否过期再拉取。

## 3. Visibility 任务（页面可见性）

```ts
addVisibilityTask(key: string, task: (isHidden: boolean) => void)
removeVisibilityTask(key: string)
```

### 行为

- 监听 `document.addEventListener('visibilitychange', ...)`
- 页面从后台切换回前台时 `isHidden = false`，切换走时 `isHidden = true`
- **自动注册**：监听器在模块加载时就注册，不需要手动启动/停止

### 典型用途

- `keyboardBookmark`：页面恢复可见时重新读取书签数据（页面焦点时也会刷一次）
- `clockAnalog`：切到后台时关掉指针动画，回前台延迟恢复，避免切页时动画堆积

## 4. PageFocus 任务（页面焦点恢复）

```ts
addPageFocusTask(key: string, task: (isHidden: boolean) => void)
removePageFocusTask(key: string)
onPageFocus()   // 手动触发，由 App.vue 调用
```

### 与 Visibility 的区别

- **PageFocus** 由 `App.vue` 的 `handleFocusPage()` 手动触发，对应配置 `openPageFocusElement`（打开新标签页时聚焦的元素）
- **Visibility** 由浏览器自动触发（标签切换、最小化/恢复等）
- 两者可能同时触发，task 注册方需要根据业务需求选择合适的类型

### 触发时机

`handleFocusPage()` 在以下场景被调用：
1. 新标签页初始化完成
2. 用户配置了 `openPageFocusElement` 且页面加载后需要转移焦点到指定 Widget

## 5. Daily 任务（日切）

```ts
addDailyTask(key: string, task: (now: Date) => void)   // 注册即执行一次，之后每个本地午夜执行一次
removeDailyTask(key: string)
```

### 行为

- **复用 timer 循环**：内部只向 timer 注册一个比较函数（`DAILY_TIMER_KEY`），每秒比较一次本地日期键，真正跨天才回调消费者。N 个消费者只付一次比较成本，**不新增定时器**
- **注册即执行**：与 `addTimerTask` 一致，消费者不必自己再调一遍初始化
- **共享同一时刻**：同一次触发里所有消费者拿到同一个 `Date`（只读），避免在午夜边界上各自 `new Date()` 得到两个日期
- **异常隔离**：单个消费者抛错只记 `console.error`，不影响同批次的其它消费者。这一层不能用 timer 的 try/catch 代替——timer 保护的是「任务之间」，而 `checkDayChange` 在 timer 眼里只是一个任务，它内部某个消费者抛错会让同批次后面的消费者漏掉当天更新
- **自动收尾**：最后一个消费者移除时连同 timer 任务一起摘掉
- **注册/注销时机**：同 timer —— 挂 `watch(isRender)` 注册/注销，`onUnmounted` 兜底（原理见 [§2](#2-timer-任务raf-秒级定时器)）。漏注销的后果比 timer 更重：`dailyTasks` 一直非空，共享的 rAF 循环就永远停不下来

### 典型用途

| Widget | 用途 |
|--------|------|
| Calendar | 更新「今天」标记与节日倒计时基准 |
| Date | 更新日期文本（格式不含时间，每天一次即可）|
| YearProgress | 更新「第几天」；跨年时重建全年表格 |

### 为什么不用 visibilitychange

合盖恢复、或标签页一直可见只是窗口失焦时，`document` 不会触发 `visibilitychange`；而 timer 在后台暂停、恢复后会立即补跑一次，能覆盖这些路径。

### 不要自己实现日切

```ts
// ❌ 每个 Widget 各写一份日期比较，口径迟早分叉；date 这类还会每秒白格式化一次
addTimerTask(WIDGET_CODE, () => {
  if (dayjs().format('YYYY-MM-DD') !== lastDay) { /* ... */ }
})

// ✅
addDailyTask(WIDGET_CODE, (now) => { /* ... */ })
```

## 常见踩坑

### 1. 禁止使用 `setInterval`

项目规则要求所有定时任务必须用 `addTimerTask`/`removeTimerTask`。直接使用 `setInterval` 会导致：
- 多个 Widget 各自起定时器，浏览器中累积 N 个 `setInterval`
- Widget 卸载时如果忘记 `clearInterval`，定时器会永久泄漏
- 页面隐藏时定时器继续执行，浪费资源

### 2. Timer 注册即执行

`addTimerTask` 内部会**立即调用一次** `task()`**。如果你的 task 依赖异步数据（如 API 返回），首次调用可能拿到空数据。需要在 task 内部做守卫检查。

### 3. Keydown 短路行为

如果自定义 task 返回 `true`，后续注册的 task 不会被执行。确认你确实要拦截所有后续 handler 再返回 `true`。不确定的话返回 `false` 或 `undefined`。

### 4. Visibility task 自动注册

`addVisibilityTask` 不需要手动 start/stop，模块被 import 后监听器就生效了。但如果模块被动态卸载（如 Widget 禁用），需要调用 `removeVisibilityTask` 清理。

### 5. 按天刷新不要用 timer

只需要「跨天更新一次」的 Widget（日期文本、今天是第几天、「今」标记）用 `addTimerTask` 会每秒重算一次——date 实测每秒多付一次 `dayjs().format()`（约 1.2 µs），且跨天判定各写各的。用 `addDailyTask`，它共享同一次日期比较。反之，**秒级需求（时钟、倒计时）不要用 daily**。

## 类型安全设计

所有任务 Map 均使用泛型类型约束，禁止裸 `new Map()` 或使用 `string` 作为回调签名。

| 模块 | Map 类型 | key 类型 |
|------|---------|---------|
| keydown | `Map<KeydownTaskKey, { task, priority }>` | 字面量联合类型 + 优先级 |
| timer | `Map<string, () => void>` | string |
| daily | `Map<string, (now: Date) => void>` | string |
| visibility | `Map<string, (isHidden: boolean) => void>` | string |
| pageFocus | `Map<string, (isHidden: boolean) => void>` | string |

新增任务类型时，应在对应文件中显式声明 key 联合类型，而非使用裸 `string`。

## Widget 错误边界

每个 Widget 在 `Content.vue` 中由 `WidgetErrorBoundary` 组件包裹。单个 Widget 在 `setup`/`onMounted`/渲染中抛出未捕获异常时，不会导致整个 Vue 应用崩溃，而是降级为错误占位提示。详见 `src/newtab/WidgetErrorBoundary.vue`。
