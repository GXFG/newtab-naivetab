# 命令快捷键开发参考手册

## 架构概览

命令快捷键系统由三层组成：

```
┌─────────────────────────────────────────────────────────┐
│  Content Script (网页中注入)                              │
│  - index.ts: 按键采集、修饰键匹配、Port 连接               │
│  - scroll.ts: 滚动容器查找、平滑滚动                       │
│  - toast.ts: 轻量提示                                     │
│                                                          │
│  Port (name='naivetab-shortcut')                         │
│  双向通信：CS → SW 发送按键，SW → CS 回传命令               │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  Service Worker (background/main.ts)                     │
│  - Port 连接管理、消息队列、sendMessage 兜底                │
│  - command-registry.ts: SW 命令注册表 + 分发               │
│  - commands.ts: 40+ tab 操作的具体实现                    │
│  - config-cache.ts: 配置缓存加载                           │
│  - init-guard.ts: 启动编排                                │
│                                                          │
├─────────────────────────────────────────────────────────┤
│  NaiveTab 页面 (shortcut-executor.ts)                     │
│  - newtabControlExecutors: 本地控制命令                    │
│  - newtabCommandExecutors: CS 命令的 newtab 版本           │
└─────────────────────────────────────────────────────────┘
```

## 执行环境详解

### SW 命令（`execEnv: 'sw'`）

- 在 Service Worker 中执行
- 可以直接调用 `chrome.tabs`、`chrome.windows` 等浏览器 API
- 占现有命令的大多数（标签页切换、窗口操作等）
- 实现位置：[src/background/command-registry.ts](src/background/command-registry.ts)

### CS 命令（`execEnv: 'cs'`）

- 在 Content Script 中执行
- 可以操作页面 DOM（滚动、复制 URL、刷新页面等）
- 通过 Port 接收 SW 转发的命令
- 实现位置：[src/contentScripts/index.ts](src/contentScripts/index.ts) 的 `commandExecutors`

**消息流转：**
```
按键 → CS matchShortcut → Port.postMessage → SW handleCommandShortcut
→ getCommandExecEnv() === 'cs'
→ port.postMessage({ type: MSG_EXECUTE_COMMAND, command })
→ CS commandExecutors[command]()
```

### Newtab 命令（`execEnv: 'newtab'`）

- 在 NaiveTab 新标签页中直接执行
- 操作 `localConfig` / `globalState`
- **不经过 SW**，直接由 `shortcut-executor.ts` 中的 `newtabControlExecutors` 执行
- 如果命令来自普通网页的 CS，静默忽略（没有 localConfig）
- 实现位置：[src/logic/globalShortcut/shortcut-executor.ts](src/logic/globalShortcut/shortcut-executor.ts)

## 命令注册流程详解

### 1. COMMAND_CATEGORIES（单一数据源）

位置：[src/logic/globalShortcut/shortcut-command.ts](src/logic/globalShortcut/shortcut-command.ts)

这是整个系统的唯一真相来源。所有命令类型（`TCommandName`、`TSwCommandName`、`TCsCommandName`、`TNewtabCommandName`）和运行时列表（`SW_COMMANDS`、`CS_COMMANDS`、`NEWTAB_COMMANDS`）都从这里自动派生。

```ts
{
  categoryKey: 'commandCategory.tabNavigation',  // i18n key，用于 Setting 面板分组
  commands: [
    { command: 'prevTab', iconName: COMMAND_ICONS.prevTab },           // SW 命令（默认）
    { command: 'copyPageUrl', execEnv: 'cs', iconName: COMMAND_ICONS.copyPageUrl },  // CS 命令
    { command: 'toggleFocusMode', execEnv: 'newtab', iconName: COMMAND_ICONS.toggleFocusMode },  // Newtab 命令
  ],
}
```

### 2. 类型派生机制

```
TCommandName = 从 COMMAND_CATEGORIES 中所有命令的 command 字段自动推导
TCsCommandName = 手动维护的联合类型（必须与 execEnv: 'cs' 的条目一致）
TNewtabCommandName = 手动维护的联合类型（必须与 execEnv: 'newtab' 的条目一致）
TSwCommandName = TCommandName 排除 TCsCommandName 和 TNewtabCommandName
```

### 3. SW 命令分发

位置：[src/background/command-registry.ts](src/background/command-registry.ts)

```ts
const COMMAND_HANDLERS: Record<TSwCommandName, CommandHandler> = {
  closeTab,      // 函数名必须与 TSwCommandName 的值完全一致
  nextTab,
  // ...
}

export const execSwCommand = (command: TSwCommandName, tabId: number) => {
  COMMAND_HANDLERS[command](tabId)
}
```

TS Record 约束确保遗漏 handler 时编译报错，不会运行时空指针。

### 4. Content Script 命令执行

位置：[src/contentScripts/index.ts](src/contentScripts/index.ts)

```ts
const commandExecutors: Record<string, () => void> = {
  scrollUp: () => startContinuousScroll('scrollUp'),
  copyPageUrl: () => { navigator.clipboard.writeText(location.href) },
  // ...
}

// Port 消息监听：
port.onMessage.addListener((msg) => {
  if (msg.type === MSG_EXECUTE_COMMAND) {
    const executor = commandExecutors[msg.command]
    if (executor) executor()
  }
})
```

### 5. NaiveTab 本地命令执行

位置：[src/logic/globalShortcut/shortcut-executor.ts](src/logic/globalShortcut/shortcut-executor.ts)

```ts
const newtabControlExecutors: Record<string, () => void> = {
  toggleFocusMode: () => {
    localState.value.isFocusMode = !localState.value.isFocusMode
  },
  // ...
}
```

## 现有命令分类一览

| 分类 | 分类 key | 命令数 | execEnv |
|------|---------|-------|---------|
| 标签页导航 | `commandCategory.tabNavigation` | 8 | sw |
| 标签页管理 | `commandCategory.tabManagement` | 8 | sw |
| 批量关闭 | `commandCategory.batchClose` | 5 | sw |
| 标签组 | `commandCategory.tabGroup` | 4 | sw |
| 页面操作 | `commandCategory.pageAction` | 5 | 4cs + 1sw |
| 窗口操作 | `commandCategory.windowAction` | 5 | sw |
| 页面滚动 | `commandCategory.pageScroll` | 10 | cs |
| 固定标签页 | `commandCategory.switchToPinnedTab` | 10 | sw |
| NaiveTab 控制 | `commandCategory.naiveTabControl` | 3 | newtab |

## 消息类型速查

| 常量 | 值 | 方向 | 说明 |
|------|---|------|------|
| `MSG_KEYDOWN` | `NAIVETAB_KEYDOWN` | CS/newtab → SW | 按键事件 |
| `MSG_EXECUTE_COMMAND` | `NAIVETAB_EXECUTE_COMMAND` | SW → CS | 命令回传执行 |
| `MSG_INIT_COMPLETE` | `NAIVETAB_INIT_COMPLETE` | SW → CS/newtab | 初始化完成 |
| `MSG_HELLO` | `NAIVETAB_HELLO` | CS/newtab → SW | 握手消息 |

## 关键注意事项

1. **`COMMAND_CATEGORIES` 中 `as const` 不可省略**：否则类型推导失效，`TCommandName` 退化为 `string`。
2. **`execEnv` 必须用 `as const`**：否则 TypeScript 推断为 `string` 而非字面量类型，`getCommandExecEnv()` 返回类型不准确。
3. **SW handler 签名必须为 `(tabId: number) => void`**：`command-registry.ts` 的 `CommandHandler` 类型约束。
4. **Chrome API 调用必须 `.catch(logLastError)`**：避免 SW 中未捕获异常导致进程终止。
5. **CS 命令中 DOM 操作要考虑兼容**：例如 `clipboard API` 不可用时需要 `fallbackCopyText`（`document.execCommand('copy')`）。
