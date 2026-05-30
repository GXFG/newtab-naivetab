# 后台脚本踩坑

## Service Worker 异步

`onChanged` 监听器必须返回 `Promise`，否则 Service Worker 可能在异步 resolve 前休眠。

**Why：** Chrome MV3 的 Service Worker 空闲后会被回收，如果监听器不返回 Promise 等待异步完成，异步操作会被截断。

## `chrome.tabs.move` 跨窗口不保留 pinned 状态

`chrome.tabs.move` 跨窗口移动 tab 时，**`pinned` 属性和 pinned 索引都会丢失**，tab 在目标窗口变成普通 tab。

**Why：** Chrome API 的行为，`move` 只保证 tab 转移到目标窗口，不保证 pinned 状态。

**How to apply：**
- 跨窗口移动前必须保存 `tab.pinned` 状态
- 如果是 pinned tab，还需记录在当前窗口的 pinned 索引（必须在 `move` **之前**查询，移动后 tab 已不在源窗口）
- 移动完成后通过 `chrome.tabs.update(tabId, { pinned: true })` 恢复状态
- 如需恢复 pinned 索引位置：设 pinned 后再次 `chrome.tabs.move(tabId, { index: pinnedIndex })`
- `chrome.windows.create({ tabId })` 创建新窗口同样丢失 pinned 状态
- `mergeAllWindows` 等批量跨窗口移动的命令也要逐个恢复

**位置恢复策略：** 用内存 Map（`pinnedPositionCache`）记录 `{ tabId → { originalWindowId, pinnedIndex } }`。移出时记录，移回原窗口时恢复，其他窗口追加末尾。
