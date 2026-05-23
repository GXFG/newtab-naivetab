# 定时任务系统

`src/logic/task/` 提供四类任务系统，管理 newtab 页面的生命周期事件（键盘、定时、可见性、页面焦点）。所有 Widget 和页面逻辑必须通过这些 API 注册/注销任务，禁止直接使用 `setInterval`、`document.onkeydown` 或 `addEventListener`。

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/logic/task/` | 四类任务系统的注册、注销、启停 |

## 四类任务系统

```
┌─────────────────────────────────────────────────────────────┐
│                      定时任务系统                            │
├──────────────┬──────────────────────────────────────────────┤
│ 任务类型      │ 说明                                        │
├──────────────┼──────────────────────────────────────────────┤
│ keydown      │ 键盘事件分发，返回 true 短路后续 handler       │
│ timer        │ rAF + 节流(1s)，后台标签自动暂停，统一调度秒级任务  │
│ visibility   │ document.visibilitychange 监听                │
│ pageFocus    │ 页面焦点恢复时触发（由 App.vue 手动调用）       │
└──────────────┴──────────────────────────────────────────────┘
```

## 1. Keydown 任务

```ts
addKeydownTask(key: KeydownTaskKey, task: (e: KeyboardEvent) => boolean | void)
removeKeydownTask(key: KeydownTaskKey)
startKeydown()   // 注册 document.onkeydown
stopKeydown()    // 注销 document.onkeydown
```

### 返回值约定

- 返回 `true`：已处理此事件，**后续 task 不再执行**（短路）
- 返回 `false` / `undefined`：未处理，继续传递给其他 task

### 执行顺序

`startKeydown` 遍历 `keydownTaskMap.values()`，按注册顺序执行。防冲突由各 task 内部修饰键过滤保证：

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

### 典型用途

- ClockDigital：每秒更新时钟显示
- Calendar：检查节日/倒计时
- News/Weather：定时刷新数据（配合 `addVisibilityTask` 使用）

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

- 页面恢复可见时刷新过期数据（天气、新闻、诗歌）
- 页面隐藏时暂停定时器或动画

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

## 类型安全设计

所有任务 Map 均使用泛型类型约束，禁止裸 `new Map()` 或使用 `string` 作为回调签名。

| 模块 | Map 类型 | key 类型 |
|------|---------|---------|
| keydown | `Map<KeydownTaskKey, (e: KeyboardEvent) => boolean \| void>` | 字面量联合类型 |
| timer | `Map<string, () => void>` | string |
| visibility | `Map<string, (isHidden: boolean) => void>` | string |
| pageFocus | `Map<string, (isHidden: boolean) => void>` | string |

新增任务类型时，应在对应文件中显式声明 key 联合类型，而非使用裸 `string`。

## Widget 错误边界

每个 Widget 在 `Content.vue` 中由 `WidgetErrorBoundary` 组件包裹。单个 Widget 在 `setup`/`onMounted`/渲染中抛出未捕获异常时，不会导致整个 Vue 应用崩溃，而是降级为错误占位提示。详见 `src/newtab/WidgetErrorBoundary.vue`。
