/**
 * @module config/sync/fingerprint
 * @description 配置内容指纹 — 用 WebCrypto 原生 SHA-256，零第三方哈希依赖。
 * @dependencies 无（仅用平台 API：TextEncoder + crypto.subtle）
 * @consumers config/sync/upload.ts（上传前去重）
 * @pitfalls
 *   - crypto.subtle 只在 secure context 可用。扩展页面（chrome-extension:// /
 *     moz-extension://）恒为 secure context，故此模块无需 polyfill；但 content
 *     script 若被注入到 http:// 页面则不可用，所以必须留在 newtab/popup/options 上下文。
 *   - digest 是异步的，调用方必须 await —— 这也是本模块不能放在同步路径里的原因。
 *   - 历史上用 MD5（32 位 hex），现为 SHA-256（64 位 hex）。长度差异即版本差异：
 *     升级前的 syncId 与云端值相等，loadRemoteConfig 会直接跳过，不需要数据迁移；
 *     只有当用户下次真正修改配置时才写入新指纹。
 * @see docs/architecture/storage.md#内容指纹
 */

const HEX_TABLE: string[] = []
for (let i = 0; i < 256; i++) {
  HEX_TABLE.push(i.toString(16).padStart(2, '0'))
}

/** 字节序列 → 小写十六进制字符串 */
export const toHex = (buffer: ArrayBuffer | Uint8Array): string => {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
  let out = ''
  for (let i = 0; i < bytes.length; i++) {
    out += HEX_TABLE[bytes[i]]
  }
  return out
}

/**
 * 计算配置内容的同步指纹。
 *
 * 输入口径与被替换的 MD5 实现完全一致：`JSON.stringify(data)` → UTF-8 字节，
 * 仅算法从 MD5 换成 SHA-256，因此同一份内容在两种算法下得到的是「不同但同样稳定」的指纹。
 *
 * @param data 待计算指纹的配置数据（通常是 getUploadConfigData 的返回值）
 * @returns 64 位小写十六进制字符串
 * @throws crypto.subtle 不可用时抛错（调用方需兜住，见 upload.ts）
 */
export const computeSyncId = async (data: unknown): Promise<string> => {
  const bytes = new TextEncoder().encode(JSON.stringify(data))
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return toHex(digest)
}
