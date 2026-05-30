# Storage 与同步机制

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/logic/config/sync/upload.ts` | 上传引擎：防抖写入、MD5 去重、Gzip 压缩、写入频率检测 |
| `src/logic/config/sync/loader.ts` | 拉取合并：版本感知同步、页面启动流程 |
| `src/logic/config/sync/state.ts` | 同步状态 + 跨上下文监听 |
| `src/logic/config/sync/manage.ts` | 用户操作：导入/导出/重置 |
| `src/logic/config/sync/pending-writes.ts` | 预期写入注册表，防 onChanged 时序竞态 |
| `src/logic/config/compress.ts` | Gzip 压缩/解压纯函数 |
| `src/logic/config/merge.ts` | 递归配置合并函数 `mergeState` |
| `src/types/global.d.ts` | `SyncPayload`、`ConfigField` 类型定义 |
| `src/logic/config/defaults.ts` | `UploadStatusItem` 类型（内联）+ `defaultUploadStatusItem` 默认值 |

## 存储架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                          NaiveTab 存储架构                          │
├──────────────────────────────┬──────────────────────────────────────┤
│  本地层 (localStorage)        │  云端层 (chrome.storage.sync)        │
│  c-general / c-keyboard…    │  naive-tab-general / naive-tab-…     │
│  l-state (同步状态 + 外观)    │                                      │
│         ↑ 800ms 防抖写入      │  ↑ 2000ms 防抖 + gzip                │
│                                                                     │
│  同设备同步：storage 事件监听（跨标签页）                             │
│  跨设备同步：chrome.storage.sync + 版本感知 Last-Write-Wins          │
└─────────────────────────────────────────────────────────────────────┘
```

### 存储 Key 命名规则

| 存储位置 | Key 格式 | 示例 |
|----------|----------|------|
| localStorage | `c-{field}` | `c-general`、`c-keyboardBookmark` |
| localStorage | `l-state` | 同步状态、外观设置 |
| chrome.storage.sync | `naive-tab-{field}` | `naive-tab-general` |

### 数据结构

**SyncPayload（云端数据包）：**
```ts
interface SyncPayload {
  syncTime: number      // 配置最后修改时间戳
  syncId: string        // MD5 哈希，内容变化指纹
  appVersion: string    // 生成该数据的客户端版本
  data: any             // 实际配置数据
}
```

**UploadStatusItem（本地同步状态）：**
```ts
interface UploadStatusItem {
  loading: boolean       // 是否正在上传
  syncTime: number       // 云端同步时间
  syncId: string         // 云端数据 MD5
  localModifiedTime: number  // 本地最后修改时间
  dirty: boolean         // 本地是否有未同步修改
  retryCount: number     // 当前 session 内自动重试次数（≤3），成功时归零
  lastError: string      // 最近一次失败的错误信息（空串表示无失败）
  syncStatus: 'idle' | 'syncing' | 'success' | 'failed' | 'quota-exceeded'
}
```

## 本地存储

本地存储使用 `useStorageLocal`（composable），为每个配置项创建独立 `ref` 并自动持久化。初始化时对 `defaultValue` 和 localStorage 值做浅合并（`{ ...defaultValue, ...value }`），**仅处理一层**：
- 顶层新增字段可自动补全
- 嵌套对象中新增字段必须在 `handleAppUpdate` 中手动补充

详见 `src/composables/useStorageLocal.ts` 源码注释。

## 防抖写入

### 配额限制

| 限制项 | 值 | 说明 |
|--------|-----|------|
| QUOTA_BYTES_PER_ITEM | 8KB | 单个 key 最大 8192 字节 |
| QUOTA_BYTES | ~100KB | 总容量约 100KB |
| MAX_ITEMS | 512 | 最多 512 个 key |
| MAX_WRITE_OPERATIONS_PER_MINUTE | 120 | 每分钟最多写入 120 次 |

### 两层防抖

| 层级 | 延迟 | 用途 |
|------|------|------|
| localStorage | 800ms | `useStorageLocal` 中配置变更后写入本地 |
| chrome.storage.sync | 2000ms（最大 5000ms） | 上传到云端，`MERGE_CONFIG_DELAY` / `MERGE_CONFIG_MAX_DELAY` |

### 上传触发流程

```
用户修改配置 → watch(localConfig[field]) → 标记 dirty + localModifiedTime
    → 触发防抖函数 → uploadConfigFn:
      1. MD5 与 prevSyncId 比较（内容未变则跳过，不记录写入速率）
      2. 构造 SyncPayload
      3. 判断是否压缩（keyboardBookmark > 4000 字节）
      4. 大小检查（8KB 硬限，7KB 警告，超限设 syncStatus='quota-exceeded'）
      5. 写入速率检查 + 警告（只记录实际会写入的调用）
      6. addPendingWrite(currConfigMd5) 注册预期写入标记
      7. 设置 syncId/syncTime（必须在 set 调用前，防止 onChanged 竞态）
      8. chrome.storage.sync.set(payload)
      9. 回调：removePendingWrite(md5) + 清除 dirty / retryCount 归零 / syncStatus 更新
```

**双重防循环机制：**
- **第一道防线 `pendingWrites`**：upload.ts 在 set 前 add MD5，state.ts 的 onChanged 先检查 pendingWrites，命中则跳过。从架构上消除自身写入的时序竞态。
- **第二道防线 `syncId`**：兜底处理其他上下文（popup 等）的写入，内容相同则跳过。**MD5 相同时会同时清除 dirty（数据已确认同步）**，避免 `handleMissedUploadConfig` 每页加载都触发无效重试。

### flushConfigSync

跳过防抖，立即执行上传。用于 popup 关闭前强制同步、导入配置后、用户手动触发同步。详见 [pitfalls-config.md](../../.claude/rules/pitfalls-config.md#popup-修改配置后必须-flushsync)。

## Gzip 压缩

仅 `keyboardBookmark` 配置需要压缩，阈值 4000 字节。压缩数据带 `gzip:` 前缀，`parseStoredData` 据此自动路由。压缩失败降级使用原始数据。

```
上传：JSON → shouldCompress? → CompressionStream('gzip') → base64 → 'gzip:' + data
下载：rawData → startsWith('gzip:')? → DecompressionStream → JSON.parse
                                    → 否 → 直接 JSON.parse（兼容旧格式）
```

核心常量：`COMPRESS_PREFIX = 'gzip:'`、`AUTO_COMPRESS_THRESHOLD = 4000`。详见 `src/logic/config/compress.ts` 源码。

## 版本感知同步

### 决策树

```
loadRemoteConfig
    ├── 云端无该字段 → uploadConfigFn 初始化
    ├── syncId 相同 → 跳过
    ├── 本地 dirty = false → 版本感知合并 → updateSetting → 更新 syncId
    │       └── 合并后 MD5 ≠ 云端 syncId → 上传愈合云端（heal upload）
    ├── dirty = true 且 localModifiedTime > syncTime → 上传本地
    └── dirty = true 且 localModifiedTime <= syncTime → 版本感知合并
```

版本相同 → 直接采用远程配置；版本不同 → 以较新版本为模板调用 `mergeState` 合并。详见 `src/logic/config/sync/loader.ts` 源码注释。

**loadRemoteConfig 合并后的 syncId 处理：** `updateSetting` 完成后，用 `getUploadConfigData(field)` 的 MD5 重新设置 syncId + dirty=false。原因是 `mergeState` 会过滤掉云端数据中的未知字段，导致最终 `localConfig` 的 MD5 与云端原始 syncId 不同。如果不重新设置，watch 触发的防抖上传会因 MD5 不匹配而多余上传一次。

**heal upload（愈合上传）：** 合并后若本地 MD5 与云端 syncId 不同（`mergeState` 改变了数据结构），`loadRemoteConfig` 会调用 `uploadConfigFn` 将合并结果上传到云端。这确保云端数据与本地一致，避免每次启动都因 syncId 不匹配而重复合并。

### Dirty 标记生命周期

- **设置**：用户本地修改任何配置字段时立即设置
- **清除**：上传成功后 / 云端拉取合并后 / popup onChanged 同步后 / **MD5 去重匹配后（数据已确认同步）**
- **持久化**：存储在 localStorage 的 `l-state` 中，页面刷新后保留
- **故障恢复**：启动时 `handleMissedUploadConfig` 重试 `loading=true` 以及 `dirty=true` 且 `retryCount < 3` 的字段（含 size exceeded 路径）。每个字段在整个 session 生命周期中最多自动重试 3 次，超过后保留 `dirty` 和 `lastError` 标记，用户可手动触发同步

## Chrome 配额管理

| 限制 | 常量 | 策略 |
|------|------|------|
| 单 key 8KB | `SYNC_QUOTA_BYTES_PER_ITEM = 8192` | 超限拦截，7000 字节警告 |
| 写入频率 120 次/分钟 | `MAX_WRITE_PER_MINUTE` | 滑动窗口检测，80% 阈值警告 |

详见 `src/logic/config/sync/upload.ts` 源码注释。

## Popup 配置同步

```
Popup → flushConfigSync() 写入云端
         ↓
         ├── addPendingWrite(md5) 注册预期写入
         └── chrome.storage.sync.set(payload)
              ↓
Newtab → setupKeyboardSyncListener() 通过 onChanged 感知（keyboardBookmark + keyboardCommand）
         ↓
      isPendingWrite(md5)? → 是 → 跳过（自身写入）
      → 否 → syncId 比较防循环（相同则跳过）
```

**注意：** `setupKeyboardSyncListener` 仅在新标签页打开时生效。如果用户未打开新标签页就关闭 popup，`chrome.storage.onChanged` 事件不会触发到任何扩展页面上下文，`localConfig` 不会被更新。依赖 `useStorageLocal` 的 localStorage 即时写入保证即使无新标签页也能持久化配置（见 `src/composables/useStorageLocal.ts`）。

详见 `src/logic/config/sync/state.ts` 源码注释。

## 配置导入/导出

- **导出**：序列化 `localConfig`，文件名含版本号和日期时间
- **导入**：通过 `normalizeLegacyConfig()` 处理旧版本数据结构（6 层兼容），更新版本号后调用 `updateSetting`。**导入完成后必须将各字段的 syncId 设置为导入数据的 MD5、dirty 设为 false**，否则 `updateSetting` 逐字段写入会触发 watch 并排队上传，导致导入数据覆盖云端。MD5 计算必须使用 `getUploadConfigData`（而非直接 `JSON.stringify`），确保与上传时的序列化方式一致（如 keyboardBookmark 的 keymap 过滤）。
- **重置**：清除 chrome.storage.sync + localStorage + IndexedDB，刷新页面

详见 `src/logic/config/sync/manage.ts` 源码注释。

## 页面启动同步流程

```
setupPageConfigSync()
    ├── handleStateResetAndUpdate()      ← 初始化/重置同步状态字段
    ├── await loadRemoteConfig()          ← 拉取云端，版本感知合并
    ├── await handleMissedUploadConfig()  ← 补救未完成的上传
    ├── handleWatchLocalConfigChange()    ← 注册 watch 监听本地变更
    └── setupKeyboardSyncListener()       ← 注册 onChanged 感知 popup 修改（keyboardBookmark + keyboardCommand）
```

## 跨标签页同步

`setupLocalStorageSyncListener` 监听 `storage` 事件，感知同设备其他页面的 localStorage 变更。当 options 和 newtab 同时打开时，修改配置后实时同步。

## IndexedDB 数据库层

`src/logic/utils/database.ts` 封装 IndexedDB，用于存储背景图等大体积二进制数据。localStorage 有 5MB 配额且仅支持字符串，IndexedDB 无此限制。

### 数据库结构

```
NaiveTabDatabase (v2)
├── localBackgroundImages    ← 用户上传的本地背景图（keyPath: appearanceCode 0/1）
└── currBackgroundImages     ← 当前使用的背景图（keyPath: appearanceCode 0/1）
```

每个 Store 最多 2 条记录（浅色 + 深色各一条）。

### API

```ts
databaseInit(): Promise<boolean>
clearDatabase(): Promise<boolean>
databaseStore(storeName, type: 'add'|'put'|'get'|'delete', payload): Promise<...>
```

- `get` 使用 `readonly` 事务，`add`/`put`/`delete` 使用 `readwrite`
- `databaseStore` 内部自动调用 `databaseInit()`，无需手动初始化
- `add` vs `put`：key 已存在时 `add` 抛异常，`put` 更新。不确定时用 `put` 更安全
- `clearDatabase()` 遇到 `onblocked`（其他标签页正在使用）时直接返回 `false`，不重试

## 常见坑点

上传相关的通用陷阱（`checkWriteRate` 调用位置、`syncId` 赋值时机、popup 必须 `flushSync` 等）详见 [pitfalls-config.md](../../.claude/rules/pitfalls-config.md)。以下为 storage 特有陷阱：

### 压缩前必须判断 field 类型

`shouldCompress` 中硬编码 `field !== 'keyboardBookmark'` 时返回 `false`。新增大字段时需要同步修改此函数。

### 上传失败时 dirty 标记不清除

只有上传成功后才清除 `dirty`。失败时保留状态，`handleMissedUploadConfig` 在下次启动时重试。

### CompressionStream 兼容性

依赖 Chrome 80+。旧版浏览器中 catch 处理，降级为未压缩格式。Firefox 支持可能不完整。

### uploadConfigFn 返回值语义

`uploadConfigFn` 返回 `Promise<boolean>`：
- `true`：无需重试（上传成功、MD5 去重跳过）
- `false`：需要重试（`chrome.storage.sync.set` 回调报错、大小超限）

调用方（如 `flushConfigSync`、`BaseNaiveBookmarkManager`）依赖此返回值区分成功/失败。`handleMissedUploadConfig` 不检查返回值，依赖 `dirty` 和 `retryCount` 状态决定下次是否重试。

### pendingWrites 内存泄漏说明

`pendingWrites` 是内存 Set，不持久化。页面关闭/Service Worker 回收时自动清理。极端情况下（`chrome.storage.sync.set` 回调延迟 30 秒以上），残留的 MD5 会被第二道防线 syncId 兜底，不会导致数据丢失。

### setupLocalStorageSyncListener 版本兼容性

`setupLocalStorageSyncListener` 直接调用 `mergeState` 而不做版本感知合并。同设备上不同版本窗口共存时，新版本字段可能被旧版本的 `defaultConfig` 过滤掉。但此场景概率极低（用户极少同时打开不同版本窗口），且最坏结果是字段回退为默认值，不会丢失用户数据。

### loadRemoteConfig 分支互斥性

`loadRemoteConfig` 中每个字段只会进入 `uploadPromises` 或 `pendingConfig` 之一，不会重复处理。条件分支为：云端无字段 → 上传；syncId 相同 → 跳过；dirty=false → 合并到 pendingConfig；dirty=true + localModifiedTime > syncTime → 上传；否则 → 合并到 pendingConfig。`updateSetting` 不会覆盖已上传字段。

### 自动重试机制

`handleMissedUploadConfig` 在页面启动时调用，补救两类字段：
1. `loading=true`：上次页面生命周期中已启动但未完成的上传（如页面关闭/刷新）
2. `dirty=true` 且 `retryCount < 3`：上次上传失败后未达重试上限的字段

上传失败时 `retryCount` 递增（最多 3 次），成功时归零。超过 3 次后保留 `dirty` 和 `lastError` 标记，用户可手动触发同步。

**用户主动修改时 `retryCount` 重置为 0**，确保新数据获得全新的重试配额，不会因历史失败次数而影响 `handleMissedUploadConfig` 的启动补救。

### cancelAllDebounce

`clearStorage` 在清空 localStorage 前调用 `cancelAllDebounce()`。由于 `useDebounceFn` 不暴露 timer ID，内部用 generation 计数器实现：取消时递增 generation，排队的防抖回调检测到 generation 变化则跳过执行。

### syncStatus 状态流转

```
idle → syncing → success → idle（成功路径，dirty 清除，retryCount 归零）
           → failed（网络错误等，dirty 保留，retryCount++）
           → quota-exceeded（大小超限，dirty 保留，retryCount++，最多重试 3 次）
           → idle（MD5 去重匹配，数据已同步，dirty 同时清除）

failed → syncing → ...（下次启动 handleMissedUploadConfig 自动重试，最多 3 次）
```
