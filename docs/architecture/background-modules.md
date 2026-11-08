# Background 内部模块

Service Worker（`src/background/`）的模块划分与启动顺序。消息如何投递见 [messaging.md](messaging.md)，为什么这么设计见 [decisions/](../decisions/)。

## 目录

```
src/background/
├── main.ts                       胶水层：启动编排 + listener 注册
├── messaging/
│   ├── port-manager.ts           Port 连接生命周期 + 消息分发
│   └── toast.ts                  层切换 toast（经 Port 下发）
├── commands/
│   ├── registry.ts               命令定义 + Record 映射分发
│   ├── handlers.ts               可复用的组合命令
│   └── layer-keymap-builder.ts   书签层 keymap 构建
└── config/
    ├── cache.ts                  配置内存缓存 + onChanged 刷新
    └── init-guard.ts             启动守卫
```

依赖方向：`main → messaging → commands`（业务上双向，属必然），`main → config`，`config/` 只依赖 `logic/`，不反向依赖任何 UI 目录。这条由 `pnpm check-boundaries` 强制。

## 启动流程

```
SW 加载（同步 < 1ms，listener 注册完成）
  ├── waitInitialized()         并发加载双配置 + system keymap，10s 超时兜底
  ├── reinjectContentScripts()  并发注入 CS 到已有页面
  ├── initLayerToast(portMap)
  └── setupPortManager()        注册 onConnect / onMessage
```

`waitInitialized()` 与 `reinjectContentScripts()` 并发，不串行。原因：listener 在同步加载阶段就绪，远早于任何 CS 连接；即便注入的 CS 先连上来，也会走 `pendingMessages` 被正确处理。串行只是延后 ~50ms，没有收益。

## config/init-guard 启动守卫

防止冷启动期间读到空 keymap。CS 连上后要收到 `INIT_COMPLETE` 才激活快捷键。10s 超时后强制标记已初始化，降级到默认配置——宁可让用户用默认键位，也不要让快捷键永久无响应。

## config/cache 配置缓存

SW 用不了 Vue 响应式，改为「启动时加载 + `onChanged` 自动刷新」：按键路径直读内存，响应约 0ms。

### 层切换冷却

用 `isBuildingLayerKeymap` 标志位，而不是时间窗口：从命令触发到 `onChanged` 完成期间始终为 `true`，与具体耗时无关，没有缝隙可钻。

标志位有两条清除路径：成功路径在 `onChanged` 里清，失败路径在 `buildAndSaveLayerKeymap` 里清。两条互不冲突，覆盖所有退出路径——**这是必须守住的，漏一条会让书签快捷键永久失灵**（见 [ADR 0004](../decisions/0004-sw-builds-layer-keymap.md)）。

## commands/registry 命令注册表

每个命令是一个独立命名函数，用 `Record<TSwCommandName, CommandHandler>` 做 O(1) 分发。分组（Tab / 窗口 / 会话 / 标签组 / 最近标签页 / 书签层）以 `registry.ts` 的分段注释为准，本文不记数量。

不用 `switch` 的原因：TS 类型约束能自动发现遗漏（少一个 key 就编译报错）；新增命令只需加函数 + 加注册项；函数名即命令名，grep 定位快。

错误统一走 `logLastError`；async handler 的 Promise 由 `execSwCommand` 统一 catch，避免未处理拒绝泄漏到全局。

`switchToPinnedTab1-9`、`switchToPinnedTabLast` 各自是独立 handler，而不是带参数的单个函数——命令系统按字符串名称匹配，没有传参通道。

## commands/layer-keymap-builder

构建流程：

```
命令 / UI 触发 → markLayerKeymapBuilding()（标志位置 true）
  → parseBookmarkFolder() 读书签树 → 构建 keymap
  → chrome.storage.local.set({ keymap, activeLayer }) 原子写入
  → onChanged → cachedSystemKeymap 更新
  → buildLayerKeymapComplete()
  → toast
```

异常分支（层未配置 / 书签权限未授予 / 配额超限）一律清除标志位后返回，不写 storage。为什么必须原子写入、为什么放在 SW，见 [ADR 0004](../decisions/0004-sw-builds-layer-keymap.md)。

## main.ts 职责

只做四件事：启动编排（`waitInitialized` + `reinjectContentScripts` 并发）、`setupPortManager(execSwCommand)` 注册 listener、`initLayerToast(portMap)`、`chrome.tabs.onActivated` 追踪最近标签页。业务逻辑不进 main.ts。

`reinjectContentScripts` 的三个取舍：`tabs.query({})` 查全部（按 URL 过滤会漏掉 `file://` 与 `about:blank`）；串行 for 循环（大量 tab 时 `Promise.all` 会让浏览器卡顿）；注入失败静默忽略（受限页面失败是预期，记日志只是噪声）。

## 相关决策

[0004 书签层 keymap 由 SW 构建](../decisions/0004-sw-builds-layer-keymap.md) · [0001 Port 长连接](../decisions/0001-port-over-sendmessage.md)
