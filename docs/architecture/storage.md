# Storage 与同步机制

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/logic/config/sync/upload.ts` | 上传引擎：防抖写入、MD5 去重、Gzip 压缩、写入频率检测 |
| `src/logic/config/sync/loader.ts` | 拉取合并：版本感知同步、页面启动流程 |
| `src/logic/config/sync/state.ts` | 同步状态 + 跨上下文监听 |
| `src/logic/config/sync/manage.ts` | 用户操作：导入/导出/重置 |
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
      1. MD5 与 prevSyncId 比较（内容未变则跳过）
      2. 构造 SyncPayload
      3. 判断是否压缩（keyboardBookmark > 4000 字节）
      4. 上传到 chrome.storage.sync
      5. 成功后更新 syncTime/syncId，清除 dirty
```

### flushConfigSync

跳过防抖，立即执行上传。用于 popup 关闭前强制同步、导入配置后、用户手动触发同步。详见 [pitfalls.md](../../.claude/rules/pitfalls.md#popup-修改配置后必须-flushsync)。

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
    ├── 本地 dirty = false → 版本感知合并（以版本较新方为模板）
    ├── dirty = true 且 localModifiedTime > syncTime → 上传本地
    └── dirty = true 且 localModifiedTime <= syncTime → 版本感知合并
```

版本相同 → 直接采用远程配置；版本不同 → 以较新版本为模板调用 `mergeState` 合并。详见 `src/logic/config/sync/loader.ts` 源码注释。

### Dirty 标记生命周期

- **设置**：用户本地修改任何配置字段时立即设置
- **清除**：上传成功后 / 云端拉取合并后 / popup onChanged 同步后
- **持久化**：存储在 localStorage 的 `l-state` 中，页面刷新后保留
- **故障恢复**：启动时 `handleMissedUploadConfig` 重试 `loading=true` 的字段

## Chrome 配额管理

| 限制 | 常量 | 策略 |
|------|------|------|
| 单 key 8KB | `SYNC_QUOTA_BYTES_PER_ITEM = 8192` | 超限拦截，7000 字节警告 |
| 写入频率 120 次/分钟 | `MAX_WRITE_PER_MINUTE` | 滑动窗口检测，80% 阈值警告 |

详见 `src/logic/config/sync/upload.ts` 源码注释。

## Popup 书签同步

```
Popup → flushConfigSync() 写入云端
         ↓
Newtab → setupKeyboardSyncListener() 通过 onChanged 感知
         ↓
      syncId 比较防循环（相同则跳过）
```

详见 `src/logic/config/sync/state.ts` 源码注释。

## 配置导入/导出

- **导出**：序列化 `localConfig`，文件名含版本号和日期时间
- **导入**：通过 `normalizeLegacyConfig()` 处理旧版本数据结构（6 层兼容），更新版本号后调用 `updateSetting`
- **重置**：清除 chrome.storage.sync + localStorage + IndexedDB，刷新页面

详见 `src/logic/config/sync/manage.ts` 源码注释。

## 页面启动同步流程

```
setupPageConfigSync()
    ├── handleStateResetAndUpdate()      ← 初始化/重置同步状态字段
    ├── await loadRemoteConfig()          ← 拉取云端，版本感知合并
    ├── await handleMissedUploadConfig()  ← 补救未完成的上传
    ├── handleWatchLocalConfigChange()    ← 注册 watch 监听本地变更
    └── setupKeyboardSyncListener()       ← 注册 onChanged 感知 popup 修改
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

详见 `.claude/rules/pitfalls.md` 中「配置系统」章节。以下为 storage 特有陷阱：

### 压缩前必须判断 field 类型

`shouldCompress` 中硬编码 `field !== 'keyboardBookmark'` 时返回 `false`。新增大字段时需要同步修改此函数。

### 上传失败时 dirty 标记不清除

只有上传成功后才清除 `dirty`。失败时保留状态，`handleMissedUploadConfig` 在下次启动时重试。

### CompressionStream 兼容性

依赖 Chrome 80+。旧版浏览器中 catch 处理，降级为未压缩格式。Firefox 支持可能不完整。
