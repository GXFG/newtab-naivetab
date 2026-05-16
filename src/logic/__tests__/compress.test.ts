import { describe, it, expect } from 'vitest'
import {
  COMPRESS_PREFIX,
  shouldCompress,
  parseStoredData,
  compressString,
  decompressString,
} from '@/logic/config/compress'

describe('shouldCompress', () => {
  it('returns true for keyboardBookmark exceeding threshold', () => {
    expect(shouldCompress('keyboardBookmark', 5000)).toBe(true)
  })

  it('returns false for keyboardBookmark below threshold', () => {
    expect(shouldCompress('keyboardBookmark', 3000)).toBe(false)
  })

  it('returns true at exactly threshold + 1', () => {
    expect(shouldCompress('keyboardBookmark', 4001)).toBe(true)
  })

  it('returns false for other fields regardless of size', () => {
    expect(shouldCompress('general', 10000)).toBe(false)
    expect(shouldCompress('calendar', 99999)).toBe(false)
  })
})

describe('compressString / decompressString round-trip', () => {
  it('compresses and decompresses plain English text', async () => {
    const original = 'Hello, world!'
    const compressed = await compressString(original)
    expect(compressed).not.toBe(original)
    // Should be base64 (no whitespace, alphanumeric + /+=)
    expect(compressed).toMatch(/^[A-Za-z0-9+/=]+$/)
    const decompressed = await decompressString(compressed)
    expect(decompressed).toBe(original)
  })

  it('compresses and decompresses Chinese text', async () => {
    const original = '你好，世界！这是一个测试。'
    const compressed = await compressString(original)
    const decompressed = await decompressString(compressed)
    expect(decompressed).toBe(original)
  })

  it('compresses and decompresses JSON string', async () => {
    const original = JSON.stringify({
      name: 'NaiveTab',
      version: '2.2.5',
      items: [1, 2, 3],
    })
    const compressed = await compressString(original)
    const decompressed = await decompressString(compressed)
    expect(decompressed).toBe(original)
    // Verify it's valid JSON after round-trip
    expect(JSON.parse(decompressed).version).toBe('2.2.5')
  })

  it('compresses and decompresses special characters', async () => {
    const original = 'Line1\nLine2\tTab\nSpecial: <>&"\'\\'
    const compressed = await compressString(original)
    const decompressed = await decompressString(compressed)
    expect(decompressed).toBe(original)
  })

  it('compresses large text to smaller size', async () => {
    const original = 'a'.repeat(10000)
    const compressed = await compressString(original)
    expect(compressed.length).toBeLessThan(original.length)
    const decompressed = await decompressString(compressed)
    expect(decompressed).toBe(original)
  })

  it('throws on invalid base64 input for decompressString', async () => {
    await expect(decompressString('not-valid-base64!@#')).rejects.toThrow()
  })

  it('throws on non-gzip data for decompressString', async () => {
    // Valid base64 but not gzip compressed
    const notGzip = btoa('hello')
    await expect(decompressString(notGzip)).rejects.toThrow()
  })
})

describe('parseStoredData', () => {
  it('parses uncompressed JSON string', async () => {
    const raw = '{"syncTime": 123, "syncId": "abc", "data": {"foo": "bar"}}'
    const result = await parseStoredData(raw)
    expect(result.syncTime).toBe(123)
    expect(result.syncId).toBe('abc')
    expect(result.data.foo).toBe('bar')
  })

  it('detects gzip prefix and decompresses successfully', async () => {
    // 真实压缩往返：先压缩，再加前缀，最后解析
    const data = { syncTime: 123, syncId: 'abc', data: { foo: 'bar' } }
    const jsonStr = JSON.stringify(data)
    const compressed = await compressString(jsonStr)
    const prefixed = COMPRESS_PREFIX + compressed
    const result = await parseStoredData(prefixed)
    expect(result.syncTime).toBe(123)
    expect(result.syncId).toBe('abc')
    expect(result.data.foo).toBe('bar')
  })

  it('throws on invalid JSON (non-gzip path)', async () => {
    await expect(parseStoredData('not json')).rejects.toThrow()
  })
})
