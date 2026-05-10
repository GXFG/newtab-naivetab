# 定时任务系统

`src/logic/task.ts` 提供四类任务系统，管理 newtab 页面的生命周期事件（键盘、定时、可见性、页面焦点）。所有 Widget 和页面逻辑必须通过这些 API 注册/注销任务，禁止直接使用 `setInterval`、`document.onkeydown` 或 `addEventListener`。

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/logic/task.ts` | 四类任务系统的注册、注销、启停 |

## 四类任务系统

```
┌─────────────────────────────────────────────────────────────┐
│                      定时任务系统                            │
├──────────────┬──────────────────────────────────────────────┤
│ 任务类型      │ 说明                                        │
├──────────────┼──────────────────────────────────────────────┤
│ keydown      │ 键盘事件分发，返回 true 短路后续 handler       │
│ timer        │ 全局 setInterval(1000ms)，统一调度秒级任务     │
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
- **设置面板**：面板打开时 `Escape` 被拦截用于关闭面板，不再传递给 task
- **启动时机**：`startKeydown()` 在 `src/newtab/App.vue` 的 `onMounted` 中调用

## 2. Timer 任务（全局 1 秒定时器）

```ts
addTimerTask(key: string, task: () => void)
removeTimerTask(key: string)
startTimer()   // setInterval(fn, 1000)
stopTimer()    // clearInterval
```

### 设计要点

- **单一全局 `setInterval`**：所有秒级任务共享同一个定时器，避免每个 Widget 各起一个 `setInterval` 造成 N 个定时器
- **注册即执行**：`addTimerTask` 会**立即执行一次** `task()`，然后再由定时器周期调度
- **任务执行顺序**：按注册顺序遍历，无优先级

### 典型用途

- ClockDigital：每秒更新时钟显示
- Calendar：检查节日/倒计时
- News/Weather：定时刷新数据（配合 `addVisibilityTask` 使用）

### 注意

`stopTimer()` 是全局操作，调用后**所有** timer task 都会停止。通常只在页面卸载时调用。

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
