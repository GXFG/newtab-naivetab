# 配置系统踩坑

## 配置迁移黄金法则

任何持久化配置结构修改都**不能破坏老用户数据**。改配置结构时必须：升 `package.json` version → `handleAppUpdate` 新增迁移分支。

**Why：** 老用户 localStorage 中有旧结构的配置，新版本直接读取会崩溃或表现异常。`handleAppUpdate` 通过版本比较确保旧用户能执行迁移。

**How to apply：**

| 场景 | 正确做法 | 错误做法 |
|------|----------|----------|
| 新增扁平字段 | 在 `handleAppUpdate` 中赋值 | 只改 `defaultConfig` |
| 新增嵌套对象 | 整体赋值 `defaultConfig.xxx` | 只依赖浅合并 |
| 重命名字段 | 新字段=旧字段值 → delete 旧字段 | 直接改字段名 |
| 删除字段 | 先 `delete` 旧值 → 再删 `defaultConfig` | 直接从 `defaultConfig` 删 |
| 修改类型 | 新增替代字段 + 迁移 | 直接改类型 |

**关键注意：** `handleAppUpdate` 使用 `if` 而非 `if-else`，确保跨越多个版本的旧用户能依次执行所有迁移。详见 [config.md](../../docs/architecture/config.md#配置迁移系统)。

## mergeState 合并陷阱

`mergeState(state, acceptState)` 以 `state`（默认配置）为模板过滤 `acceptState` 中的未知/废弃字段。

**关键规则：**

| 条件 | 行为 |
|------|------|
| `acceptState` 为空 | 使用 `state` |
| 类型不同 | 使用 `state` |
| keymap 对象（Key*/Digit*/Numpad*） | **直接替换**，不深合并 |
| 数组 | **直接替换**，不深合并 |
| 普通对象 | 递归合并，**只保留 `state` 中定义的字段** |

**Why：** keymap 和数组直接替换是有意设计，避免破坏键盘映射结构和数组顺序。

**How to apply：**
- 需要增量更新数组时，必须在业务逻辑中处理，不能依赖 `mergeState`
- 嵌套对象新增字段不能依赖浅合并自动补全，必须在 `handleAppUpdate` 中手动赋值
- 修改 `keymap` 时直接替换整个对象，不要试图只添加/删除单个 key

## popup 修改配置后必须 flushSync

popup 修改书签等配置后**必须调用 `flushConfigSync`** 强制同步，否则 popup 销毁后防抖回调不会执行，配置丢失。

## `chrome.storage.local.get` 异步时序不可靠，首屏数据必须用 `localStorage` 同步读取

`chrome.storage.local.get()` 是异步 API，Promise 在微任务队列中 resolve。而 `useStorageLocal` 从 `localStorage` **同步**读取，Vue 组件首次渲染时依赖的 `localConfig` 值（如 `source=BROWSER`）已就绪。

如果组件首次渲染依赖的数据（如 `systemKeymap`）仅通过 `chrome.storage.local.get` 异步加载（即使放在 `onMounted` 且 `await`），则首次渲染时数据可能仍未就绪，导致组件短暂空白。

**Why：** Vue 3 组件渲染和挂载是同步的（父 `setup` → 子 `setup` → DOM patch → 子 `onMounted` → 父 `onMounted`）。父 `onMounted` 中的 `await chrome.storage.local.get()` 在微任务中执行，此时子组件早已完成首次渲染。而 `localStorage` 是同步 API，模块顶层读取在 import 阶段即完成，早于任何组件渲染。

**How to apply：**

| 场景 | 正确做法 | 错误做法 |
|------|----------|----------|
| 首屏渲染需要的数据 | 模块顶层 `localStorage.getItem()` 同步读取 | `onMounted` 中 `await chrome.storage.local.get()` |
| 数据更新 | 同时写入 `chrome.storage.local` 和 `localStorage` | 只写 `chrome.storage.local` |
| 跨上下文共享（SW/CS） | `chrome.storage.local` + `onChanged` 监听 | `localStorage`（SW/CS 不可用） |

参考实现：`src/logic/keyboard/bookmark-state.ts` 中 `persistKeymapToLocal` + 模块顶层 `localStorage.getItem`。

## 新增配置字段后的验证清单

每次新增持久化配置字段后，必须逐项检查：

### 1. 所有消费者上下文

配置字段跨 4 个上下文，新增字段后每个上下文都要验证：

| 上下文 | 检查点 |
|--------|--------|
| newtab | `localConfig.xxx.yyy` 读取路径是否正确，缺失时行为是否符合预期 |
| CS | `loadConfig()` 和 `onChanged` 两处是否都加载了新字段，`?? defaultValue` 是否合理 |
| SW | `cache.ts` 初始缓存（`defaultConfig`）+ `onChanged` 更新，**布尔值必须用 `=== false` 而非 `!` 判空**（旧配置缺失字段时 `undefined` 会被 `!` 转为 `true` 导致误拦截） |
| popup | 是否读取了该字段，需要注意 popup 关闭后防抖回调丢失的 `flushSync` 问题 |

### 2. 布尔字段的判空方式

```
// ❌ 错误：旧配置缺失该字段时，undefined 被 ! 转为 true
if (!config.isNewField) return

// ✅ 正确：仅显式 false 时拦截
if (config.isNewField === false) return
```

**Why：** 老用户的 `chrome.storage.sync` 中可能存着旧版 gzip 配置，解压后不含新字段。SW/CS 读取后该字段为 `undefined`。`!undefined` 为 `true`，导致功能被意外关闭。

### 3. 旧迁移链路干扰

新增字段后，检查 `handleAppUpdate` 中**所有更早版本的迁移分支**是否会覆盖新字段。尤其关注：

- `Object.keys(defaultConfig.xxx)` 遍历 + `localStorageConfig[field]` 赋值的模式（如 v2.2.2 的 `keyboard → keyboardBookmark` 迁移），老 localStorage 数据不含新字段时会写入 `undefined`
- 解决方案：确保新迁移分支在旧分支**之后**执行，用 `?? defaultValue` 兜底

### 4. 测试文件同步

- 修改 `PRESERVE_FIELDS` 后，检查 `config-reset.test.ts` 中 quick reset 相关断言的期望值
- 修改 `defaultConfig` 后，检查 `config-snapshot.test.ts` 的必需字段断言
- 新增迁移分支后，检查 `handle-app-update.test.ts` 是否需要补充用例
- 全局搜索新字段名，确认测试 mock 是否需要补充该字段
