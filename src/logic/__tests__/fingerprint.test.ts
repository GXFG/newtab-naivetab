/**
 * @module __tests__/fingerprint
 * @description 内容指纹单元测试 — 用 NIST 标准向量卡死实现，防止日后换成
 *   非标准摘要导致跨设备 syncId 漂移（那会退化成「每次启动都判定云端有更新」）。
 */
import { describe, expect, it } from 'vitest'
import { computeSyncId, toHex } from '@/logic/config/sync/fingerprint'

/** RFC 6234 / NIST 标准测试向量：SHA-256("abc") */
const SHA256_ABC =
  'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'

describe('toHex', () => {
  it('把摘要字节转成小写十六进制', async () => {
    const digest = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode('abc'),
    )
    expect(toHex(digest)).toBe(SHA256_ABC)
  })

  it('接受 Uint8Array 与 ArrayBuffer 两种输入', () => {
    const bytes = new Uint8Array([0x00, 0x0f, 0xa0, 0xff])
    expect(toHex(bytes)).toBe('000fa0ff')
    expect(toHex(bytes.buffer)).toBe('000fa0ff')
  })
})

describe('computeSyncId', () => {
  it('输出 64 位小写十六进制', async () => {
    const syncId = await computeSyncId({ any: 'value' })
    expect(syncId).toMatch(/^[0-9a-f]{64}$/)
  })

  it('按 JSON.stringify + UTF-8 计算，与标准向量一致', async () => {
    // computeSyncId 的口径是 JSON.stringify(data)，所以字符串 'abc' 的输入是 "abc"
    expect(await computeSyncId('abc')).toBe(
      '6cc43f858fbb763301637b5af970e2a46b46f461f27e5a0f41e009c59b827b25',
    )
  })

  it('中文按 UTF-8 编码，与 Node crypto 结果一致', async () => {
    expect(await computeSyncId({ a: 1, b: '中文' })).toBe(
      'db1e1d174330db0f00974178407b16d090326f28edd3798338fe91c275dc5466',
    )
  })

  it('同一内容稳定，不同内容相异', async () => {
    const a = await computeSyncId({ x: 1, y: [1, 2, 3] })
    const b = await computeSyncId({ x: 1, y: [1, 2, 3] })
    const c = await computeSyncId({ x: 1, y: [1, 2, 4] })
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })
})
