# IndexedDB 数据库层

`src/logic/database.ts` 封装浏览器 IndexedDB，用于存储背景图等大体积二进制数据。localStorage 有 5MB 配额限制且仅支持字符串，IndexedDB 无此限制。

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/logic/database.ts` | IndexedDB 初始化、增删改查、清空 |
| `src/types/global.d.ts` | `DatabaseStore`、`DatabaseLocalBackgroundImages` 等类型 |

## 数据库结构

```
NaiveTabDatabase (v2)
├── localBackgroundImages    // 存储本地背景图文件数据（浅色、深色外观两张图片）
│   └── keyPath: 'appearanceCode' (0 或 1)
│
└── currBackgroundImages     // 存储当前背景图数据（浅色、深色外观两张图片）
    └── keyPath: 'appearanceCode' (0 或 1)
```

### ObjectStore 说明

| Store 名称 | 用途 | 主键 |
|------------|------|------|
| `localBackgroundImages` | 用户上传的本地背景图（原始文件数据） | `appearanceCode` (number: 0/1) |
| `currBackgroundImages` | 当前正在使用的背景图数据（可能是 Bing/Pexels 在线图） | `appearanceCode` (number: 0/1) |

每个 Store 最多存储 2 条记录（浅色外观 + 深色外观各一条）。

## API

```ts
// 初始化数据库
databaseInit(): Promise<boolean>

// 清空数据库
clearDatabase(): Promise<boolean>

// CRUD 操作
databaseStore(
  storeName: DatabaseStore,          // 'localBackgroundImages' | 'currBackgroundImages'
  type: DatabaseHandleType,          // 'add' | 'put' | 'get' | 'delete'
  payload: DatabaseLocalBackgroundImages | string | number
): Promise<DatabaseLocalBackgroundImages | null>
```

### 使用示例

```ts
// 写入（首次插入）
await databaseStore('currBackgroundImages', 'add', {
  appearanceCode: 0,
  // ... 图片数据
})

// 写入（更新，与 add 的区别：key 已存在时 put 不会报错）
await databaseStore('currBackgroundImages', 'put', { ... })

// 读取
const img = await databaseStore('currBackgroundImages', 'get', 0)

// 删除
await databaseStore('currBackgroundImages', 'delete', 0)
```

## 事务模式

- `get` 操作使用 `readonly` 事务（减少锁竞争）
- `add`/`put`/`delete` 操作使用 `readwrite` 事务

## 初始化策略

`databaseStore` 内部自动调用 `databaseInit()`，无需手动初始化。首次打开时 `onupgradeneeded` 创建 objectStore。

## 升级

当前版本为 `DB_VERSION = 2`。如需新增 objectStore，在 `onupgradeneeded` 中添加并升 `DB_VERSION`。IndexedDB 的 `onupgradeneeded` 只在版本号变更时触发，首次创建数据库时也会触发。

## 常见踩坑

### 1. `add` vs `put`

- `add`：key 已存在时会抛异常（DataCloneError）
- `put`：key 已存在时更新，不存在时插入

如果不确定记录是否存在，使用 `put` 更安全。

### 2. 异步操作

IndexedDB 基于事件机制（`onsuccess`/`onerror`），所有操作都是异步的。`databaseStore` 封装为 `Promise`，调用方需要 `await`。

### 3. 删除数据库的 blocked 事件

`clearDatabase()` 调用 `indexedDB.deleteDatabase()` 时可能遇到 `onblocked` 事件——其他标签页正在使用该数据库。此时删除会等待所有连接关闭。当前实现直接返回 `false`，不重试。
