# Background 内部模块

本文档描述 Service Worker（`src/background/`）内部各模块的职责、启动流程和协作关系。消息传递架构详见 [messaging.md](messaging.md)。

## 文件索引

| 文件 | 职责 |
|------|------|
| `main.ts` | SW 入口：启动编排、Port 管理注册、CS 重新注入 |
| `messaging/port-manager.ts` | Port 连接管理、消息队列、sendMessage 兜底 |
| `messaging/toast.ts` | 层切换 toast 通知 |
| `config/cache.ts` | 配置缓存：SW 侧内存缓存 + onChanged 自动刷新 |
| `config/init-guard.ts` | 启动守卫：等待三配置（keyboardBookmark + keyboardCommand + systemKeymap）加载完成后放行 |
| `commands/registry.ts` | SW 命令注册表：命令定义 + Record 映射分发 |
| `commands/handlers.ts` | 可复用的组合命令实现 |
| `commands/layer-keymap-builder.ts` | 书签层 keymap 构建 |

## 目录结构

```
src/background/
├── main.ts                           ← 入口：启动编排 + listener 注册（胶水层）
├── messaging/
│   ├── port-manager.ts               ← Port 连接生命周期 + 消息分发
│   └── toast.ts                      ← 层切换 toast 通知
├── commands/
│   ├── registry.ts                   ← 命令定义 + Record 分发
│   ├── handlers.ts                   ← tab/窗口/标签组操作
│   └── layer-keymap-builder.ts       ← 书签层 keymap 构建
└── config/
    ├── cache.ts                      ← 配置加载 + 内存缓存 + onChanged
    └── init-guard.ts                 ← 启动守卫
```

### 模块依赖关系

```
main.ts → messaging/ → commands/ (双向，业务必然)
main.ts → config/ (单向)
config/ → 无内部依赖，只导入 logic/
```

详见 `src/background/main.ts` 源码注释。

## 启动流程

```
SW 加载（同步 < 1ms）
  ├── waitInitialized()        ← 并发加载双配置 + system keymap，10s 超时兜底
  ├── reinjectContentScripts()  ← 并发注入 CS 到已有页面
  ├── initLayerToast(portMap)   ← 注入 Port 映射到 toast
  └── setupPortManager()        ← 注册 onConnect/onMessage listener
```

`waitInitialized()` 和 `reinjectContentScripts()` 并发执行：SW listener 在同步模块加载阶段就注册完成，远快于任何 CS 连接请求。即使 CS 在 wait 完成前建立 Port，也会走 `pendingMessages` 路径。

## config/init-guard 启动守卫

防止冷启动期间读到空 keymap。CS 通过 Port 连接后收到 `INIT_COMPLETE` 消息才激活快捷键。10s 超时后自动标记已初始化，降级到默认配置。

## config/cache 配置缓存

SW 无法使用 Vue 响应式状态，采用启动时加载 + `onChanged` 自动更新模式。按键事件直读缓存（~0ms 响应）。

### 层切换冷却控制

采用 `isBuildingLayerKeymap` 标志位防护：从命令触发到 `onChanged` 完成期间始终为 true，不依赖具体耗时，无间隙。

**异常安全**：`isBuildingLayerKeymap` 有两类清除路径——成功路径在 `onChanged` 中清除，非成功路径在 `buildAndSaveLayerKeymap` 中清除。两者互不冲突，覆盖所有退出路径。详见 `src/background/config/cache.ts` 源码注释。

### 导出 API

```ts
// 配置加载
loadAndCacheKeyboardBookmarkConfig(): Promise<void>
loadAndCacheKeyboardCommandConfig(): Promise<void>
loadAndCacheSystemKeymap(): Promise<void>
// 读取缓存
getCachedKeyboardBookmarkConfig() / getCachedKeyboardCommandConfig() / getCachedSystemKeymap()
getCachedKeyboardBookmarkLayers()  // 层配置，避免循环依赖
// 层切换冷却
markLayerKeymapBuilding() / buildLayerKeymapComplete() / isInLayerSwitchCooldown()
```

## commands/registry SW 命令注册表

每个命令定义为独立命名函数，通过 `Record<TSwCommandName, CommandHandler>` 做 O(1) 分发。按功能分组：Tab 操作(27)、窗口操作(8)、会话与去重(3)、标签组(4)、书签层切换(4)。

**为什么不用 switch：** TS 类型约束自动检查遗漏；新增命令只需添加函数 + 注册项；函数名即命令名，grep 定位更快。

**错误处理：** 统一 `logLastError` 处理 Chrome API 错误。async handler 的 Promise 由 `execSwCommand` 统一 catch。

**Pinned Tab 快捷键：** `switchToPinnedTab1-9` + `switchToPinnedTabLast` 是 10 个独立 handler（而非带参数的单个函数），因为命令系统基于字符串名称匹配。

## commands/layer-keymap-builder 书签层 keymap 构建

### 为什么由 SW 构建

书签层切换命令 `execEnv = 'sw'`，可在任意页面执行。SW 直接构建的优势：`chrome.bookmarks` API 可用、不依赖 newtab 页面是否存在。UI 端（newtab/popup）通过 `runtime.sendMessage` 通知 SW 执行，SW 原子写入 keymap + activeLayer，避免 UI 端两步写入的中间状态。

### 构建流程

```
命令/UI触发 → markLayerKeymapBuilding() → 标志位置 true
    → parseBookmarkFolder() 读取书签树 → 构建 keymap
    → chrome.storage.local.set({ keymap, activeLayer })  原子写入
    → onChanged 触发 → cachedSystemKeymap 更新
    → buildLayerKeymapComplete() 清除标志位
    → toast 通知
```

### 异常处理

| 场景 | 行为 |
|------|------|
| 层未配置 | 清除标志位，返回空对象，不写入 storage |
| 书签权限未授予 | 清除标志位，返回空对象 |
| storage 配额超限 | 清除标志位 |

**保证**：所有退出路径必须调用 `buildLayerKeymapComplete()`，否则 `isBuildingLayerKeymap` 永久为 `true`，书签快捷键被永久拦截。详见 `src/background/commands/layer-keymap-builder.ts` 源码注释。

## main.ts 职责

`main.ts` 是胶水层，专注启动编排 + listener 注册：

1. **启动编排**：`waitInitialized()` + `reinjectContentScripts()` 并发执行
2. **Port 管理注册**：`setupPortManager(execSwCommand)` 注册 listener
3. **Toast 初始化**：`initLayerToast(portMap)`
4. **标签页追踪**：`chrome.tabs.onActivated` 监听器用于最近标签页切换

### Port 连接生命周期

冷启动时 CS 连接先注册暂存 listener，`waitInitialized()` resolve 后批量处理积压消息并切换正常 listener。正常路径下立即 `postMessage INIT_COMPLETE`。

### reinjectContentScripts 注入策略

- `chrome.tabs.query({})` 查询所有 tab（含 `file://` 和 `about:blank`）
- 串行 for 循环注入（大量 tab 时避免 `Promise.all` 卡顿）
- 注入失败静默忽略（受限页面是预期的）
