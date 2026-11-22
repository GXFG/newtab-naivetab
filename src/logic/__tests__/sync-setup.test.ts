import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

/**
 * sync-setup.test.ts — 页面启动同步入口 `setupPageConfigSync` 的契约
 *
 * 它本身只有五行，但顺序是承重的：状态重置必须先于拉取（否则云端数据会合并进
 * 上一次生命周期残留的脏状态），补救上传必须先于注册监听（否则刚补传成功的字段
 * 会被首屏的本地变更再次标脏），监听必须最后挂（挂早了会把初始化过程中的写入
 * 当成用户改动推上去）。
 *
 * 这里原来只有一条 `it('exports the function')` 断言 —— 只证明导出存在，
 * 把顺序调乱、少调一步都拦不住。
 *
 * 依赖模块全部 mock，只验证调用序列；各步骤内部行为由 sync-core / upload-and-recovery 覆盖。
 */

const order: string[] = []

vi.doMock('@/logic/config/update', () => ({
  handleStateResetAndUpdate: vi.fn(() => {
    order.push('reset')
  }),
  updateSetting: vi.fn(),
}))

vi.doMock('@/logic/config/sync/upload', () => ({
  uploadConfigFn: vi.fn(async () => true),
  handleWatchLocalConfigChange: vi.fn(() => {
    order.push('watch-local-change')
  }),
  handleMissedUploadConfig: vi.fn(async () => {
    order.push('missed-upload')
  }),
}))

vi.doMock('@/logic/config/sync/state', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/logic/config/sync/state')>()),
  // 只替换要观测调用时机的那一个；其余导出（configSizeMap、两个 listener 等）
  // 用真实实现，避免 loader 以后新增 import 时抛「No export defined on the mock」。
  setupKeyboardSyncListener: vi.fn(() => {
    order.push('keyboard-listener')
  }),
}))

/** 标记"拉取云端"这一步在序列中的位置 */
const markLoadRemote = () => {
  order.push('load-remote')
}

beforeEach(() => {
  order.length = 0
  vi.resetModules()
})

// 三个用例都会替换 chrome.storage.sync.get，统一在结束后还原，
// 否则前一个用例的桩会带进下一个（同文件内 spy 不会随 resetModules 失效）
afterEach(() => {
  vi.restoreAllMocks()
})

describe('setupPageConfigSync 调用顺序', () => {
  it('按 重置 → 拉取 → 补救上传 → 监听变更 → 键盘监听 执行', async () => {
    vi.spyOn(chrome.storage.sync, 'get').mockImplementation(((
      keys: unknown,
      cb: (d: unknown) => void,
    ) => {
      markLoadRemote()
      cb({})
    }) as never)

    const { setupPageConfigSync } = await import('@/logic/config/sync/loader')
    await setupPageConfigSync()

    expect(order).toEqual([
      'reset',
      'load-remote',
      'missed-upload',
      'watch-local-change',
      'keyboard-listener',
    ])
  })

  it('拉取是串行的：监听注册发生在拉取回调之后', async () => {
    // 拉取回调异步 resolve，若 setupPageConfigSync 漏掉 await，
    // 监听注册会抢在回调之前，顺序断言即失败
    vi.spyOn(chrome.storage.sync, 'get').mockImplementation(((
      keys: unknown,
      cb: (d: unknown) => void,
    ) => {
      setTimeout(() => {
        markLoadRemote()
        cb({})
      }, 0)
    }) as never)

    const { setupPageConfigSync } = await import('@/logic/config/sync/loader')
    await setupPageConfigSync()

    // 先确认这一步真的发生过：只用 indexOf 比较时，标记缺失（-1）会让断言恒真
    expect(order).toContain('load-remote')
    expect(order).toContain('watch-local-change')
    expect(order.indexOf('load-remote')).toBeLessThan(
      order.indexOf('watch-local-change'),
    )
  })

  it('上传失败（uploadConfigFn 返回 false）不会中断后续监听注册', async () => {
    // 契约前提：uploadConfigFn 用返回值表达失败，从不 reject
    // （见 upload.ts 中指纹失败分支的注释）。因此补救上传失败不能影响监听注册，
    // 否则该标签页整个生命周期都不会再同步。
    const uploadMod = await import('@/logic/config/sync/upload')
    vi.mocked(uploadMod.uploadConfigFn).mockResolvedValue(false)

    vi.spyOn(chrome.storage.sync, 'get').mockImplementation(((
      keys: unknown,
      cb: (d: unknown) => void,
    ) => {
      cb({})
    }) as never)

    const { setupPageConfigSync } = await import('@/logic/config/sync/loader')
    await setupPageConfigSync()

    expect(order).toContain('watch-local-change')
    expect(order).toContain('keyboard-listener')
  })
})
