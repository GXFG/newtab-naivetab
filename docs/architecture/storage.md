# Storage 与压缩机制

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/logic/sync/core.ts` | 同步引擎核心：防抖写入、版本感知合并、配额管理、故障恢复 |
| `src/logic/sync/state.ts` | 同步状态（`isUploadConfigLoading`/`lastSyncTime`）+ 跨上下文监听 |
| `src/logic/sync/manage.ts` | 用户操作：导入/导出 JSON、全量重置 |
| `src/logic/compress.ts` | Gzip 压缩/解压纯函数模块 |
| `src/composables/useStorageLocal.ts` | localStorage 响应式封装 + 800ms 防抖写入 |
| `src/logic/config/merge.ts` | 递归配置合并函数 `mergeState` |
| `src/types/global.d.ts` | `SyncPayload`、`ConfigField` 类型定义 |
| `src/logic/config/defaults.ts` | `defaultConfig`、`defaultUploadStatusItem` 默认值 |
| `src/logic/store.ts` | `localConfig`、`localState`、`globalState` 状态管理 |

## 存储架构总览

```
┌─────────────────────────────────────────────────────────────────────┐
│                          NaiveTab 存储架构                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  本地层 (localStorage)                    云端层 (chrome.storage)   │
│  ┌──────────────────────────────┐        ┌──────────────────────┐   │
│  │ c-general                    │        │ naive-tab-general    │   │
│  │ c-keyboardCommon             │        │ naive-tab-keyboard…  │   │
│  │ c-keyboardBookmark           │  ◄──►  │ naive-tab-keyboard…  │   │
│  │ c-keyboardCommand            │  同步   │ naive-tab-keyboard…  │   │
│  │ c-clockDigital               │        │ naive-tab-clockDig…  │   │
│  │ ... (每个 Widget 一个 key)   │        │ ...                  │   │
│  │ l-state (同步状态 + 外观)    │        │                      │   │
│  └──────────────────────────────┘        └──────────────────────┘   │
│         ↑ 800ms 防抖写入                    ↑ 2000ms 防抖 + gzip     │
│                                                                     │
│  同设备同步：storage 事件监听（跨标签页）                            │
│  跨设备同步：chrome.storage.sync + 版本感知 Last-Write-Wins          │
│                                                                     │
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

## useStorageLocal：本地响应式存储

`useStorageLocal` 是 localStorage 的 Vue 响应式封装，为每个配置项创建独立的 `ref`，并自动持久化。

### 实现原理

```ts
export const useStorageLocal = <T>(key: string, defaultValue: T): Ref<UnwrapRef<T>> => {
  // 1. 读取已有值或使用默认值
  const localItem = localStorage.getItem(key)
  let value = localItem ? JSON.parse(localItem) : defaultValue

  // 2. 浅层合并（仅一层），自动补全新字段
  const mergeValue = { ...defaultValue, ...value }

  // 3. 创建响应式 ref
  const target = ref(mergeValue)

  // 4. 监听变化，800ms 防抖后写入 localStorage
  let timer: NodeJS.Timeout
  watch(() => target, (state) => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      localStorage.setItem(key, JSON.stringify(state.value))
    }, 800)
  }, { deep: true })

  return target
}
```

### 浅层合并机制

初始化时对 `defaultValue` 和 `localStorage` 值做浅合并（`{ ...defaultValue, ...value }`），**仅处理一层数据结构**：
- 顶层新增字段可自动补全
- 嵌套对象中新增字段不会自动合并，必须在 `handleAppUpdate` 中手动补充

### localConfig 的创建

```ts
// src/logic/store.ts
const createLocalConfig = (): LocalConfigRefs => {
  const res: any = {}
  res.general = useStorageLocal('c-general', defaultConfig.general)
  res.keyboardCommon = useStorageLocal('c-keyboardCommon', defaultConfig.keyboardCommon)
  res.keyboardCommand = useStorageLocal('c-keyboardCommand', defaultConfig.keyboardCommand)
  // Widget 配置通过遍历 WIDGET_CODE_LIST 动态创建
  for (const key of WIDGET_CODE_LIST) {
    res[key] = useStorageLocal(`c-${key}`, defaultConfig[key])
  }
  return reactive(res)
}
```

## 防抖写入机制

### 为什么需要防抖

Chrome `chrome.storage.sync` 有严格的配额限制：

| 限制项 | 值 | 说明 |
|--------|-----|------|
| QUOTA_BYTES_PER_ITEM | 8KB | 单个 key 最大 8KB |
| QUOTA_BYTES | ~100KB | 总容量约 100KB |
| MAX_ITEMS | 512 | 最多 512 个 key |
| MAX_WRITE_OPERATIONS_PER_MINUTE | 120 | 每分钟最多写入 120 次 |

### 两层防抖

**第一层：localStorage 防抖（800ms）**

`useStorageLocal` 中，配置变更后 800ms 才写入 `localStorage`，连续修改会重置计时器。

**第二层：云端同步防抖（2000ms，最大 5000ms）**

```ts
// src/logic/constants/app.ts
export const MERGE_CONFIG_DELAY = 2000   // 基础延迟
export const MERGE_CONFIG_MAX_DELAY = 5000  // 最大等待

// src/logic/sync/core.ts
const genUploadConfigDebounceFn = (field: ConfigField) => {
  return useDebounceFn(
    () => { uploadConfigFn(field) },
    MERGE_CONFIG_DELAY,
    { maxWait: MERGE_CONFIG_MAX_DELAY }  // 连续修改时最长 5 秒必须执行
  )
}
```

### 上传触发流程

```
用户修改配置
    │
    ▼
watch(() => localConfig[field]) 触发
    │
    ▼
标记 dirty = true
标记 localModifiedTime = Date.now()
标记 loading = true
    │
    ▼
触发防抖函数（2000ms 后执行，连续触发最长等待 5000ms）
    │
    ▼
uploadConfigFn 执行：
  1. 计算 MD5，与 prevSyncId 比较（内容未变则跳过）
  2. 构造 SyncPayload
  3. 判断是否压缩（keyboardBookmark > 4000 字节）
  4. 上传到 chrome.storage.sync
  5. 成功后更新 syncTime/syncId，清除 dirty
```

### flushConfigSync：强制同步

`flushConfigSync` 跳过防抖延迟，立即执行上传。用于以下场景：

- **Popup 关闭前**：popup 是短生命周期上下文，关闭后防抖回调可能不会执行
- **导入配置后**：确保新导入的配置立即同步到云端
- **用户手动触发同步**：设置面板中的「立即同步」按钮

```ts
export const flushConfigSync = async (field: ConfigField): Promise<boolean> => {
  // 确保状态存在
  if (!localState.value.isUploadConfigStatusMap[field]) {
    localState.value.isUploadConfigStatusMap[field] = { ...defaultUploadStatusItem }
  }
  // 标记 dirty（如尚未标记）
  if (!localState.value.isUploadConfigStatusMap[field].dirty) {
    localState.value.isUploadConfigStatusMap[field].dirty = true
    localState.value.isUploadConfigStatusMap[field].localModifiedTime = Date.now()
  }
  localState.value.isUploadConfigStatusMap[field].loading = true
  // 立即执行上传（跳过防抖）
  const result = await uploadConfigFn(field)
  return result as boolean
}
```

## Gzip 压缩机制

压缩模块位于 `src/logic/compress.ts`，是纯函数（无 Vue/DOM 依赖），Service Worker 和 newtab 都可用。

### 压缩/解压数据流

```
┌──────────────────────────────────────────────────────────────────┐
│                     压缩数据流（上传方向）                        │
│                                                                  │
│  localConfig[field]                                              │
│       │                                                          │
│       ▼                                                          │
│  JSON.stringify(payloadStr)                                      │
│       │                                                          │
│       ▼                                                          │
│  shouldCompress(field, payloadBytes)                              │
│       │                                                          │
│       ├── field !== 'keyboardBookmark' ──→ 不压缩，直接上传       │
│       │                                                          │
│       └── payloadBytes <= 4000 ──→ 不压缩，直接上传              │
│       │                                                          │
│       └── payloadBytes > 4000 ──→ 压缩                           │
│               │                                                  │
│               ▼                                                  │
│  Blob([str]).stream()                                            │
│    .pipeThrough(CompressionStream('gzip'))                       │
│               │                                                  │
│               ▼                                                  │
│  arrayBuffer() → Uint8Array → 逐字节转 binary string → btoa()    │
│               │                                                  │
│               ▼                                                  │
│  'gzip:' + compressedBase64                                      │
│               │                                                  │
│               ▼                                                  │
│  chrome.storage.sync.set({ 'naive-tab-keyboardBookmark': ... })  │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                     解压数据流（下载方向）                        │
│                                                                  │
│  chrome.storage.sync.get('naive-tab-keyboardBookmark')           │
│       │                                                          │
│       ▼                                                          │
│  parseStoredData(rawData)                                        │
│       │                                                          │
│       ├── rawData.startsWith('gzip:') ──→ 解压                   │
│       │        │                                                 │
│       │        ▼                                                 │
│       │   atob(base64) → Uint8Array → Blob                      │
│       │        │                                                 │
│       │        ▼                                                 │
│       │   .stream().pipeThrough(DecompressionStream('gzip'))     │
│       │        │                                                 │
│       │        ▼                                                 │
│       │   TextDecoder.decode() → JSON.parse()                   │
│       │                                                          │
│       └── 非 gzip 格式 ──→ 直接 JSON.parse(rawData)              │
│              │                                                   │
│              ▼                                                   │
│       降级：仍失败 → 尝试原始 JSON.parse                         │
│              │                                                   │
│              ▼                                                   │
│       SyncPayload { syncTime, syncId, appVersion, data }         │
└──────────────────────────────────────────────────────────────────┘
```

### 核心函数

```ts
// 压缩：字符串 → gzip → base64
export const compressString = async (str: string): Promise<string> => {
  const stream = new Blob([str]).stream().pipeThrough(new CompressionStream('gzip'))
  const compressed = await new Response(stream).arrayBuffer()
  const bytes = new Uint8Array(compressed)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

// 解压：base64 → gzip → 字符串
export const decompressString = async (base64Str: string): Promise<string> => {
  const binary = atob(base64Str)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))
  const decompressed = await new Response(stream).arrayBuffer()
  return new TextDecoder().decode(decompressed)
}

// 解析存储数据（自动识别压缩格式）
export const parseStoredData = async (rawData: string): Promise<SyncPayload> => {
  let jsonStr = rawData
  if (rawData.startsWith(COMPRESS_PREFIX)) {  // 'gzip:'
    const compressedData = rawData.slice(COMPRESS_PREFIX.length)
    jsonStr = await decompressString(compressedData)
  }
  return JSON.parse(jsonStr)
}

// 判断是否需要压缩
export const shouldCompress = (field: string, payloadBytes: number): boolean => {
  // 目前只有 keyboardBookmark 需要压缩
  if (field !== 'keyboardBookmark') return false
  return payloadBytes > AUTO_COMPRESS_THRESHOLD  // 4000 字节
}
```

### 压缩常量

```ts
export const COMPRESS_PREFIX = 'gzip:'           // 压缩数据标记
export const AUTO_COMPRESS_THRESHOLD = 4000       // 超过 4000 字节才压缩
```

### 上传时的压缩集成

```ts
// 在 uploadConfigFn 中
let finalPayload = payloadStr
if (shouldCompress(field, payloadBytes)) {
  try {
    const compressed = await compressString(payloadStr)
    finalPayload = COMPRESS_PREFIX + compressed
    log(`compressed: ${payloadBytes} -> ${finalPayload.length} bytes`)
  } catch (e) {
    // 压缩失败，降级使用原始字符串
    log(`compress failed, use raw`, e)
  }
}
// 无论是否压缩，都需要检查最终大小是否超过 8KB 限制
```

### 降级恢复策略

解析云端数据时有三级降级：

```
1. 正常路径：rawData.startsWith('gzip:') → decompressString → JSON.parse
2. 一级降级：decompress 失败 → 直接 JSON.parse(rawData)（兼容旧格式）
3. 二级降级：仍失败 → 跳过该字段，记录错误日志
```

```ts
try {
  target = await parseStoredData(rawData)
} catch (parseError) {
  // 降级：尝试直接 JSON.parse（兼容未使用 parseStoredData 的旧数据）
  try {
    target = JSON.parse(rawData)
  } catch (e) {
    log(`legacy parse error, skip`, e)
    continue  // 跳过该字段
  }
}
```

## 版本感知同步策略

### 决策树

```
loadRemoteConfig 启动
    │
    ▼
遍历每个 field：
    │
    ├── 云端无该字段
    │   └→ uploadConfigFn(field)  初始化云端
    │
    ├── syncId 相同（MD5 一致）
    │   └→ 跳过（内容完全一致）
    │
    ├── 本地 dirty = false
    │   └→ 版本感知合并
    │       ├── 本地版本较新 → 以本地为模板，合并远程值
    │       ├── 远程版本较新 → 以远程为模板，合并本地值
    │       └── 版本相同 → 直接采用远程配置
    │
    ├── 本地 dirty = true 且 localModifiedTime > syncTime
    │   └→ 上传本地配置（本地修改更新，本地优先）
    │
    └── 本地 dirty = true 且 localModifiedTime <= syncTime
        └→ 版本感知合并（云端修改更新，以版本较新方为模板）
```

### 版本感知合并实现

核心函数 `mergeConfigWithVersionAwareness`：

```ts
const mergeConfigWithVersionAwareness = (
  localData, remoteData, localVersion, remoteVersion
) => {
  // 版本相同 → 采用远程配置
  if (localVersion === remoteVersion) {
    return remoteData
  }

  // 版本较新的一方作为模板
  const isLocalNewer = compareLeftVersionLessThanRightVersions(remoteVersion, localVersion)

  if (isLocalNewer) {
    // 本地较新：以本地为模板，保留本地新增字段
    return mergeState(localData, remoteData)
  } else {
    // 远程较新：以远程为模板，保留远程新增字段
    return mergeState(remoteData, localData)
  }
}
```

### mergeState 合并规则

`mergeState` 以 template 为模板，只保留 template 中定义的字段：

```
mergeState(template, source)

1. source 为空 → 使用 template 值
2. 类型不同 → 使用 template 值（处理新增字段类型变化）
3. 基础类型 → 直接使用 source 值
4. 数组 → 直接使用 source 值（不深合并）
5. keymap 特殊对象 → 直接使用 source 值（避免破坏结构）
6. 普通对象 → 递归合并，只保留 template 中定义的字段
```

### Dirty 标记的完整生命周期

```
设置 dirty=true:
  └── 用户在本地修改任何配置字段时立即设置

清除 dirty:
  ├── 上传成功后清除
  ├── 从云端拉取并合并后清除（说明已与云端对齐）
  └── 从 popup onChanged 同步后清除

dirty 标记持久化:
  └── dirty 状态存储在 localStorage 的 l-state 中
      页面刷新后仍保留，handleMissedUploadConfig 重试未完成上传
```

## Chrome 配额管理

### 配额限制表

| 限制项 | 值 | 代码常量 | 处理策略 |
|--------|-----|----------|----------|
| 单 key 大小 | 8KB (8192 bytes) | `SYNC_QUOTA_BYTES_PER_ITEM` | 超限拦截，7000 字节警告 |
| 总容量 | ~100KB | — | 当前约 10 个配置项远低于限制 |
| 写入频率 | 120 次/分钟 | `MAX_WRITE_PER_MINUTE` | 防抖 + 频率检测 |
| Key 数量 | 512 | `MAX_ITEMS` | 当前约 10 个远低于限制 |

### 大小检测

```ts
// 单 key 限制（留 92 字节余量）
export const SYNC_QUOTA_BYTES_PER_ITEM = 8192
const SYNC_SIZE_WARN = 7000     // 7KB 黄色警告
const SYNC_SIZE_LIMIT = 8000    // 8KB 拦截

// 上传前检测
const payloadBytes = new TextEncoder().encode(payloadStr).length
if (shouldCompress(field, payloadBytes)) {
  const compressed = await compressString(payloadStr)
  finalPayload = COMPRESS_PREFIX + compressed
}
const finalBytes = new TextEncoder().encode(finalPayload).length
if (finalBytes > SYNC_SIZE_LIMIT) {
  // 超限：告警并中止同步，保留本地数据
  window.$message.error(...)
  return false
}
```

### 写入频率检测

```ts
const checkWriteRate = (field: ConfigField): { isNearLimit: boolean, count: number } => {
  const now = Date.now()
  const cutoff = now - WRITE_RATE_WINDOW  // 60 秒前
  // 清理过期记录
  while (writeHistory.length > 0 && writeHistory[0].timestamp < cutoff) {
    writeHistory.shift()
  }
  writeHistory.push({ timestamp: now, field })
  const count = writeHistory.length
  const isNearLimit = count >= MAX_WRITE_PER_MINUTE * (WRITE_RATE_WARN_THRESHOLD / 100)
  // WRITE_RATE_WARN_THRESHOLD = 80（80% 时警告）
  return { isNearLimit, count }
}
```

达到 80% 阈值时弹出用户警告消息，告知当前写入频率。

## Popup 书签同步机制

### 架构

```
┌──────────────┐      chrome.storage.sync       ┌──────────────┐
│   Popup 页面  │  ◄────────────────────────►   │   Newtab 页面 │
│              │                               │              │
│ flushConfig  │   写入 naive-tab-keyboard     │ setupKeyboard│
│ Sync()       │   Bookmark                    │ SyncListener()│
│              │                               │              │
│ (popup 关闭  │                               │ storage.on   │
│  前强制同步) │                               │ Changed 监听  │
└──────────────┘                               └──────────────┘
```

### 为什么需要 flushConfigSync

Popup 是短生命周期上下文。如果只依赖防抖机制（2000ms），popup 可能在防抖回调执行前就被销毁，导致：
- Service Worker 的防抖上下文丢失
- 用户的书签修改未能同步到云端
- Newtab 页面无法感知到最新配置

### setupKeyboardSyncListener

在 newtab 页面注册 `chrome.storage.onChanged` 监听器，感知 popup 对 `keyboardBookmark` 的修改：

```ts
export const setupKeyboardSyncListener = () => {
  chrome.storage.onChanged.addListener((changes) => {
    const key = 'naive-tab-keyboardBookmark'
    if (!changes[key]) return
    const raw = changes[key].newValue as string
    if (!raw || raw.length === 0) return

    return parseStoredData(raw)
      .then((parsed: SyncPayload) => {
        // 通过 syncId 判断是否需要更新（防循环）
        const newSyncId = parsed.syncId
        const currSyncId = localState.value.isUploadConfigStatusMap.keyboardBookmark?.syncId
        if (newSyncId === currSyncId) return  // 同步跳过

        // 先更新同步状态（防止后续赋值触发冗余上传）
        localState.value.isUploadConfigStatusMap.keyboardBookmark.syncId = newSyncId
        localState.value.isUploadConfigStatusMap.keyboardBookmark.syncTime = parsed.syncTime
        localState.value.isUploadConfigStatusMap.keyboardBookmark.dirty = false

        // 整体替换配置
        localConfig.keyboardBookmark = parsed.data
      })
      .catch((e) => {
        log('Sync keyboardBookmark parse error', e)
      })
  })
}
```

### 防循环更新机制

通过比较 `syncId` 实现：
1. Popup 修改 → `flushConfigSync` 上传 → 更新云端 `syncId`
2. Newtab `onChanged` 触发 → 检查 `syncId` 是否相同 → 相同则跳过
3. Newtab 赋值 `localConfig.keyboardBookmark = parsed.data` 会触发 `watchLocalConfigChange`
4. 但上传时 MD5 去重检测到 `syncId` 相同，跳过实际上传

## 配置导入/导出

### 导出

```ts
export const exportSetting = () => {
  const filename = `naivetab-v${window.appVersion}-${dayjs().format('YYYYMMDD-HHmmss')}.json`
  downloadJsonByTagA(localConfig, filename)
}
```

导出当前完整的 `localConfig` 对象，文件命名包含版本号和日期时间。

### 导入与旧数据结构兼容

`importConfig` 内置了多层旧数据结构兼容逻辑：

```ts
export const importSetting = async (text: string) => {
  let fileContent = JSON.parse(text)

  // 兼容 1：bookmark → keyboardBookmark（v1.27.0 前）
  if (fileContent.bookmark) {
    fileContent.keyboardBookmark = fileContent.bookmark
    delete fileContent.bookmark
  }

  // 兼容 2：keyboard → keyboardBookmark（code 重命名）
  if (fileContent.keyboard && !fileContent.keyboardBookmark) {
    fileContent.keyboardBookmark = structuredClone(fileContent.keyboard)
    delete fileContent.keyboard
  }

  // 兼容 3：commandShortcut → keyboardCommand（code 重命名）
  if (fileContent.commandShortcut && !fileContent.keyboardCommand) {
    fileContent.keyboardCommand = structuredClone(fileContent.commandShortcut)
    delete fileContent.commandShortcut
  }

  // 兼容 4：keyboardBookmark 外观字段拆分到 keyboardCommon
  if (fileContent.keyboardBookmark && !fileContent.keyboardCommon) {
    fileContent.keyboardCommon = structuredClone(KEYBOARD_COMMON_CONFIG)
    // 提取外观字段到新位置，从旧位置删除
    const appearanceFields = Object.keys(KEYBOARD_COMMON_CONFIG)
    for (const field of appearanceFields) {
      if (fileContent.keyboardBookmark[field] !== undefined) {
        fileContent.keyboardCommon[field] = fileContent.keyboardBookmark[field]
      }
    }
    for (const field of appearanceFields) {
      delete (fileContent.keyboardBookmark as any)[field]
    }
  }

  // 兼容 5：focusVisibleWidgetMap key 重命名
  // keyboard → keyboardBookmark, commandShortcut → keyboardCommand

  // 兼容 6：openPageFocusElement 修正
  if (fileContent.general?.openPageFocusElement === 'keyboard') {
    fileContent.general.openPageFocusElement = 'keyboardBookmark'
  }

  // 更新版本号并应用配置
  fileContent.general.version = window.appVersion
  await updateSetting(fileContent)
}
```

导入时还会触发 `handleAppUpdate` 中的版本迁移逻辑（详见配置章节文档）。

## 页面启动同步流程

所有需要读写配置的页面（newtab、options）在 `onMounted` 中调用 `setupPageConfigSync`：

```
setupPageConfigSync()
    │
    ├── handleStateResetAndUpdate()
    │   └── 初始化/重置状态字段
    │
    ├── await loadRemoteConfig()
    │   └── 拉取云端，版本感知合并
    │
    ├── await handleMissedUploadConfig()
    │   └── 重试上次未完成的上传（故障恢复）
    │
    ├── handleWatchLocalConfigChange()
    │   └── 注册 watch 监听本地配置变更，触发防抖上传
    │
    └── setupKeyboardSyncListener()
        └── 注册 onChanged 监听，感知 popup 修改
```

### handleMissedUploadConfig（故障恢复）

当页面在上传过程中刷新或关闭，`loading=true` 状态保留在 `localStorage` 中。启动时重试：

```ts
export const handleMissedUploadConfig = async () => {
  for (const field of Object.keys(localState.value.isUploadConfigStatusMap)) {
    if (localState.value.isUploadConfigStatusMap[field].loading) {
      log('Handle missed upload config', field)
      await uploadConfigFn(field)  // 重试上传
    }
  }
}
```

## 跨标签页同步

`setupLocalStorageSync` 监听同设备其他页面的 `localStorage` 变化：

```ts
export const setupLocalStorageSyncListener = () => {
  window.addEventListener('storage', (e) => {
    if (!e.key || (!e.key.startsWith('c-') && e.key !== 'l-state')) return
    if (!e.newValue) return
    const newConfig = JSON.parse(e.newValue)
    const field = e.key === 'l-state' ? 'state' : e.key.replace('c-', '')

    if (field !== 'state' && localConfig[field]) {
      // 内容未变化则跳过
      if (JSON.stringify(localConfig[field]) === JSON.stringify(newConfig)) return
      // 深合并保留新增字段
      localConfig[field] = mergeState(localConfig[field], newConfig)
    }
  })
}
```

当 options 和 newtab 同时打开时，在其中一个页面修改配置，另一个页面实时同步。

## 常见坑点

### 1. popup 中不调用 flushConfigSync 导致配置丢失

**问题：** Popup 修改书签后直接关闭，防抖回调未执行，配置未写入云端。

**根因：** Popup 销毁后，`useDebounceFn` 的定时器上下文可能丢失。

**解决：** Popup 的 `handleCommit` 中必须调用 `await flushConfigSync('keyboardBookmark')`。

### 2. 嵌套对象新增字段浅合并无效

**问题：** 顶层字段新增可自动补全，但嵌套对象（如 `keyboardBookmark.keymap`）中的新增字段不会自动合并。

**根因：** `useStorageLocal` 仅做一层浅合并（`{ ...defaultValue, ...value }`）。

**解决：** 嵌套对象新增字段必须在 `handleAppUpdate` 中手动补全迁移。

### 3. 压缩前必须判断 field 类型

**问题：** 非 `keyboardBookmark` 的字段不应该压缩，浪费 CPU。

**解决：** `shouldCompress` 函数中硬编码 `field !== 'keyboardBookmark'` 时返回 `false`。新增大字段时需要同步修改此函数。

### 4. 上传失败时 dirty 标记不清除

**问题：** 上传失败时如果清除了 `dirty`，页面刷新后无法重试，用户修改丢失。

**设计：** 只有上传成功后才清除 `dirty` 和更新 `syncTime/syncId`。失败时保留状态，`handleMissedUploadConfig` 在下次启动时重试。

### 5. MD5 去重避免无效上传

**问题：** `localConfig.keyboardBookmark = parsed.data` 会触发 watcher，理论上会排队上传。

**实际：** 上传前计算 `currConfigMd5` 与 `prevSyncId` 比较，相同则 100ms 后跳过上传。因此同步赋值不会造成真正的循环上传。

### 6. 8KB 限制是大配置的硬性天花板

**问题：** 用户键盘配置了大量书签后，压缩后仍可能超过 8KB。

**当前策略：** 超限拦截并告警，保留本地数据避免静默丢失。`getUploadConfigData` 中对空 url 做清理、对超长 url/name 做兜底截断，最大限度控制体积。

### 7. CompressionStream / DecompressionStream 兼容性

这两个 API 依赖现代浏览器（Chrome 80+）。在旧版浏览器中会抛出异常，代码中已 catch 处理，降级为未压缩格式。但 Firefox 等浏览器对 `CompressionStream` 的支持可能不完整。
