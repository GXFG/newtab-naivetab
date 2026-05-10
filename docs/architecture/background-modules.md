# Background 内部模块

本文档描述 Service Worker（`src/background/`）内部各模块的职责、启动流程和协作关系。消息传递架构详见 [messaging.md](messaging.md)。

## 文件索引

| 文件 | 职责 |
|------|------|
| `background/main.ts` | SW 入口：Port 连接管理、消息路由、CS 重新注入 |
| `background/init-guard.ts` | 启动编排：等待配置加载完成，暴露守卫 |
| `background/config-cache.ts` | 配置缓存：SW 侧内存缓存 + onChanged 自动刷新 |
| `background/command-registry.ts` | SW 命令注册表：30+ 命令实现 + Record 映射分发 |
| `background/commands.ts` | 可复用的组合命令实现（标签切换、批量关闭、标签组操作等） |

## 启动流程

```
SW 加载（同步阶段，< 1ms）
  │
  ├── init-guard.ts: waitInitialized() 启动
  │   ├── loadAndCacheKeyboardBookmarkConfig()  → 读取云端配置 + 解压
  │   └── loadAndCacheKeyboardCommandConfig()   → 读取云端配置 + 解压
  │   └── 10s 超时兜底
  │
  ├── reinjectContentScripts() 启动（并发）
  │   └── chrome.tabs.query({}) → 逐个串行注入 CS
  │
  └── listener 注册完成
      ├── chrome.runtime.onConnect → Port 连接
      └── chrome.runtime.onMessage → 兜底消息
```

**为什么 `waitInitialized()` 和 `reinjectContentScripts()` 并发执行？**

SW 的所有 listener（onConnect、onMessage）在同步模块加载阶段就已注册完成，远快于任何 CS 连接请求。即使 reinject 注入的 CS 在 `waitInitialized()` 完成前建立 Port，也会走 `pendingMessages` 路径被正确处理。改为顺序执行只是延后 ~50ms，无实际收益。

## init-guard 启动守卫

```ts
// src/background/init-guard.ts
waitInitialized(): Promise<void>    // 等待双配置加载完成
getIsInitialized(): boolean         // 是否已初始化
```

### 设计目标

防止冷启动期间读到空 keymap。CS 和新tab端通过 Port 连接后收到 `INIT_COMPLETE` 消息才激活快捷键处理。

### 超时策略

10 秒超时后自动标记为已初始化（`isInitialized = true`），确保即使配置加载失败也不会永久阻塞快捷键。错误情况下标记为完成是为了降级到默认配置，比完全不可用更好。

## config-cache 配置缓存

### 为什么需要缓存

Service Worker 无法使用 Vue 响应式状态，且可能随时休眠。通过启动时加载一次配置到内存 + `chrome.storage.onChanged` 自动更新缓存，实现 ~0ms 响应：

```
CS 按键事件 ──→ SW ──→ 直读 cachedKeyboardBookmarkConfig（内存，~0ms）
                        ↓
                    查找 keymap[code] → 打开 URL
```

如果每次按键都从 `chrome.storage.sync` 读取 + gzip 解压，延迟会显著增加。

### 数据结构

```ts
// 两个独立缓存
cachedKeyboardBookmarkConfig: typeof WIDGET_CONFIG   // 书签键盘配置
cachedKeyboardCommandConfig: typeof KEYBOARD_COMMAND_CONFIG  // 命令配置
```

初始化时使用默认配置的深拷贝，`keymap` 字段清空。加载到云端数据后覆盖。

### 更新机制

`chrome.storage.onChanged` 监听器在模块加载时注册，匹配 `naive-tab-keyboardBookmark` 和 `naive-tab-keyboardCommand` 两个 key，自动更新内存缓存并返回 `Promise`（确保 SW 不会在异步操作完成前休眠）。

### 加载超时

每个配置加载有 5 秒超时（`CONFIG_LOAD_TIMEOUT_MS`），超时后 catch 并放行，避免 init-guard 永久阻塞。

## command-registry SW 命令注册表

### 架构

每个命令定义为独立的命名函数，通过 `Record<TSwCommandName, CommandHandler>` 做 O(1) 分发。按功能分为 4 组：

| 组别 | 命令数量 | 示例 |
|------|---------|------|
| Tab 操作 | 25 | `nextTab`, `prevTab`, `closeTab`, `switchToPinnedTab1-9` |
| 窗口操作 | 7 | `closeWindow`, `moveTabLeft`, `newWindow`, `newIncognito` |
| 会话与去重 | 3 | `reopenClosedTab`, `closeDuplicateTabs`, `mergeAllWindows` |
| 标签组 | 4 | `groupCurrentTab`, `ungroupCurrentTab`, `toggleGroupCollapse`, `closeGroupTabs` |

### 为什么不用 switch

- TS 类型约束自动检查遗漏（缺少 `Record` 属性编译报错）
- 新增命令只需添加函数 + 注册项，不膨胀 `main.ts`
- 函数名即命令名，grep 定位更快
- 按功能分组，视觉结构清晰

### 组合命令（commands.ts）

复杂命令（如标签切换、批量关闭、标签组操作）实现在 `commands.ts` 中，由 `command-registry.ts` 导入并适配为 `CommandHandler` 签名。例如：

```ts
// commands.ts 中的组合命令
const switchTab = (tabId: number, offset: number) => { ... }
const closeTabsAround = (tabId: number, direction: 'others' | 'left' | 'right') => { ... }

// command-registry.ts 中的薄适配层
const nextTab = (tabId: number) => { switchTab(tabId, 1) }
const closeOtherTabs = (tabId: number) => { closeTabsAround(tabId, 'others') }
```

### 错误处理

所有命令使用统一的 `logLastError` 处理 Chrome API 错误。`get(tabId)` 失败时直接 catch，不向调用方抛异常（快捷键不应因 API 错误中断）。

### Pinned Tab 快捷键

`switchToPinnedTab1` ~ `switchToPinnedTab9` + `switchToPinnedTabLast` 是 10 个独立的 handler 函数（而非带参数的单个函数），因为命令系统基于字符串名称匹配，不传参数。这是为了与 keymap 配置保持一致（每个快捷键映射到一个命令名）。

## main.ts 职责

`main.ts` 专注连接管理和消息路由：

1. **Port 连接管理**：`portMap` 维护 tabId → Port 的映射
2. **冷启动消息队列**：`pendingMessages` 暂存初始化前的按键消息
3. **消息分发**：Port 消息 → `execSwCommand` 或转发给 CS
4. **CS 重新注入**：`reinjectContentScripts()` 扩展重载后恢复已有页面的 CS
5. **onMessage 兜底**：处理 CS 通过 `sendMessage` 唤醒休眠 SW 的场景

### Port 连接生命周期

```
CS: chrome.runtime.connect({ name: 'naivetab-shortcut' })
  ↓
SW: onConnect → portMap.set(tabId, port)
  ↓
  ├── 冷启动（!isInitialized）：
  │   ├── 注册暂存 listener（命名箭头函数）
  │   ├── waitInitialized() resolve 后：
  │   │   ├── 批量处理积压消息
  │   │   ├── removeListener 暂存 handler
  │   │   ├── addListener 正常 handler
  │   │   └── postMessage INIT_COMPLETE
  │
  └── 正常路径（isInitialized）：
      ├── 立即 postMessage INIT_COMPLETE
      └── 注册正常 listener
```

### reinjectContentScripts 注入策略

| 决策 | 选择 | 理由 |
|------|------|------|
| `chrome.tabs.query({})` vs `query({ url: ['*://*/*'] })` | `{}` 查询所有 tab | `*://*/*` 会遗漏 `file://` 和 `about:blank` |
| 前置过滤 `chrome://` 等受限页面 | 不需要 | `executeScript` 对受限页面会抛异常，try/catch 已处理 |
| 并发 vs 串行 | 串行 for 循环 | 大量 tab 时 `Promise.all` 可能导致浏览器短暂卡顿 |
| 注入失败处理 | 静默忽略 | 受限页面注入失败是预期的，不记录日志避免噪声 |
