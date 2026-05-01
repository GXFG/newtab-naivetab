import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * database.test.ts — 测试 database.ts 的 IndexedDB CRUD 操作
 *
 * 由于 IndexedDB 是异步浏览器 API，难以在测试环境中完全模拟，
 * 此处重点测试模块导出结构和 clearDatabase 的错误处理分支。
 */

vi.mock('@/logic/util', () => ({ log: vi.fn() }))

describe('database module exports', () => {
  it('exports clearDatabase and databaseStore functions', async () => {
    const dbModule = await import('@/logic/database')
    expect(typeof dbModule.clearDatabase).toBe('function')
    expect(typeof dbModule.databaseStore).toBe('function')
  })
})

describe('clearDatabase success', () => {
  let clearDatabase: typeof import('@/logic/database')['clearDatabase']

  beforeEach(async () => {
    vi.resetModules()

    const fakeDeleteRequest = {
      onsuccess: null as Function | null,
      onerror: null as Function | null,
      onblocked: null as Function | null,
    }

    Object.defineProperty(window, 'indexedDB', {
      value: {
        open: vi.fn(),
        deleteDatabase: vi.fn().mockReturnValue(fakeDeleteRequest),
      },
      configurable: true,
      writable: true,
    })

    const mod = await import('@/logic/database')
    clearDatabase = mod.clearDatabase

    setTimeout(() => fakeDeleteRequest.onsuccess?.({}), 0)
  })

  it('returns true on success', async () => {
    const result = await clearDatabase()
    expect(result).toBe(true)
  })
})

describe('clearDatabase error handling', () => {
  let clearDatabase: typeof import('@/logic/database')['clearDatabase']

  beforeEach(async () => {
    vi.resetModules()

    const fakeDeleteRequest = {
      onsuccess: null as Function | null,
      onerror: null as Function | null,
      onblocked: null as Function | null,
    }

    Object.defineProperty(window, 'indexedDB', {
      value: {
        open: vi.fn(),
        deleteDatabase: vi.fn().mockReturnValue(fakeDeleteRequest),
      },
      configurable: true,
      writable: true,
    })

    const mod = await import('@/logic/database')
    clearDatabase = mod.clearDatabase

    setTimeout(() => fakeDeleteRequest.onerror?.({ target: fakeDeleteRequest }), 0)
  })

  it('returns false on delete error', async () => {
    const result = await clearDatabase()
    expect(result).toBe(false)
  })
})

describe('clearDatabase blocked handling', () => {
  let clearDatabase: typeof import('@/logic/database')['clearDatabase']

  beforeEach(async () => {
    vi.resetModules()

    const fakeDeleteRequest = {
      onsuccess: null as Function | null,
      onerror: null as Function | null,
      onblocked: null as Function | null,
    }

    Object.defineProperty(window, 'indexedDB', {
      value: {
        open: vi.fn(),
        deleteDatabase: vi.fn().mockReturnValue(fakeDeleteRequest),
      },
      configurable: true,
      writable: true,
    })

    const mod = await import('@/logic/database')
    clearDatabase = mod.clearDatabase

    setTimeout(() => fakeDeleteRequest.onblocked?.({ target: fakeDeleteRequest }), 0)
  })

  it('returns false when delete is blocked', async () => {
    const result = await clearDatabase()
    expect(result).toBe(false)
  })
})
