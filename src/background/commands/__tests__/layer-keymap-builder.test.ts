import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  SYSTEM_KEYMAP_STORAGE_KEY,
  ACTIVE_LAYER_STORAGE_KEY,
} from '@/logic/keyboard/keyboard-constants'

/**
 * layer-keymap-builder.test.ts — 守住 ADR 0004 的退出路径约束
 *
 * `isBuildingLayerKeymap` 一旦漏清，书签快捷键会被**永久**拦截：
 * 标志位在 SW 侧，刷新页面不恢复，用户只能重启浏览器。
 *
 * 关键是两条路径的方向相反，所以两边都要断言：
 * - 不写 storage 的路径（层未配置 / 解析抛错）必须自己清；
 * - 成功路径**不能**清，要等 config/cache.ts 的 onChanged 释放，
 *   确保新的 systemKeymap 已经写进缓存，否则会留出读到旧 keymap 的窗口。
 *
 * 只测"清了"而不管"不该清的不清"，等于漏掉后半条约束。
 */

const { state, buildLayerKeymapComplete, parseBookmarkFolder } = vi.hoisted(() => ({
  state: {
    layers: [] as { sourceFolderPath: string }[],
    configMissing: false,
  },
  buildLayerKeymapComplete: vi.fn(),
  parseBookmarkFolder: vi.fn(),
}))

vi.mock('@/background/config/cache', () => ({
  getCachedKeyboardBookmarkConfig: () =>
    state.configMissing ? undefined : { layers: state.layers },
  buildLayerKeymapComplete,
}))

vi.mock('@/logic/bookmark/parser', () => ({ parseBookmarkFolder }))

vi.mock('@/logic/utils/common', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/logic/utils/common')>()),
  log: vi.fn(),
}))

import { buildAndSaveLayerKeymap } from '../layer-keymap-builder'

describe('buildAndSaveLayerKeymap — 标志位退出路径（ADR 0004）', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    state.layers = []
    state.configMissing = false
  })

  it('层未配置：清标志位，不写 storage', async () => {
    state.layers = [{ sourceFolderPath: '' }]

    const result = await buildAndSaveLayerKeymap(0)

    expect(result).toEqual({})
    expect(buildLayerKeymapComplete).toHaveBeenCalledTimes(1)
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
  })

  it('配置尚未加载（cache 返回 undefined）：按未配置处理，清标志位', async () => {
    state.configMissing = true

    const result = await buildAndSaveLayerKeymap(0)

    expect(result).toEqual({})
    expect(buildLayerKeymapComplete).toHaveBeenCalledTimes(1)
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
  })

  it('层索引越界（layers 里没有这一层）：清标志位，不写 storage', async () => {
    state.layers = [{ sourceFolderPath: 'NaiveTab/layer1' }]

    const result = await buildAndSaveLayerKeymap(3)

    expect(result).toEqual({})
    expect(buildLayerKeymapComplete).toHaveBeenCalledTimes(1)
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
  })

  it('解析抛错（如书签权限未授予）：清标志位，不写 storage', async () => {
    state.layers = [{ sourceFolderPath: 'NaiveTab/layer1' }]
    parseBookmarkFolder.mockRejectedValue(new Error('bookmarks unavailable'))

    const result = await buildAndSaveLayerKeymap(0)

    expect(result).toEqual({})
    expect(buildLayerKeymapComplete).toHaveBeenCalledTimes(1)
    expect(chrome.storage.local.set).not.toHaveBeenCalled()
  })

  it('成功路径：不清标志位（交给 onChanged），keymap 与 activeLayer 一次写入', async () => {
    state.layers = [
      { sourceFolderPath: 'NaiveTab/layer1' },
      { sourceFolderPath: 'NaiveTab/layer2' },
    ]
    parseBookmarkFolder.mockResolvedValue({
      entries: [{ code: 'KeyQ', url: 'https://example.com', name: 'Example' }],
    })

    const result = await buildAndSaveLayerKeymap(1)

    expect(result).toEqual({
      KeyQ: { url: 'https://example.com', name: 'Example' },
    })
    expect(buildLayerKeymapComplete).not.toHaveBeenCalled()
    expect(chrome.storage.local.set).toHaveBeenCalledTimes(1)
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [SYSTEM_KEYMAP_STORAGE_KEY]: {
        KeyQ: { url: 'https://example.com', name: 'Example' },
      },
      [ACTIVE_LAYER_STORAGE_KEY]: 1,
    })
  })

  it('书签文件夹被删除（解析返回空）：仍走成功路径，写空 keymap，不清标志位', async () => {
    state.layers = [{ sourceFolderPath: 'NaiveTab/layer1' }]
    parseBookmarkFolder.mockResolvedValue({ entries: [] })

    const result = await buildAndSaveLayerKeymap(0)

    expect(result).toEqual({})
    expect(buildLayerKeymapComplete).not.toHaveBeenCalled()
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      [SYSTEM_KEYMAP_STORAGE_KEY]: {},
      [ACTIVE_LAYER_STORAGE_KEY]: 0,
    })
  })

  it('name 缺失时回落为空字符串，不传 undefined', async () => {
    state.layers = [{ sourceFolderPath: 'NaiveTab/layer1' }]
    parseBookmarkFolder.mockResolvedValue({
      entries: [{ code: 'KeyW', url: 'https://example.org' }],
    })

    const result = await buildAndSaveLayerKeymap(0)

    expect(result.KeyW.name).toBe('')
  })
})
