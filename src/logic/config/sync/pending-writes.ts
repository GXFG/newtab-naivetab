/**
 * @module sync/pending-writes
 * @description 预期写入注册表。chrome.storage.sync.set 调用前注册 MD5，回调后删除。
 *   state.ts 的 onChanged 先检查此集合，命中说明是自己发起的写入，直接跳过。
 *   从架构上消除 "syncId 设置时序依赖" 这一竞态根因。
 */

const pendingWrites = new Set<string>()

/** 检查 md5 是否是预期的自身写入 */
export const isPendingWrite = (md5: string): boolean => {
  return pendingWrites.has(md5)
}

/** 注册预期写入（chrome.storage.sync.set 调用前） */
export const addPendingWrite = (md5: string): void => {
  pendingWrites.add(md5)
}

/** 消费预期写入标记（chrome.storage.sync.set 回调中） */
export const removePendingWrite = (md5: string): void => {
  pendingWrites.delete(md5)
}
