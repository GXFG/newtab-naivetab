import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * config-e2e.test.ts — 配置链路的端到端测试（真实模块，非桩）
 *
 * 与其它 config 测试的区别：
 * - 只 mock 外部副作用（toast / gtag / database / store / log），
 *   localConfig、localState、defaults、loader、upload、merge、migrate、fingerprint（SHA-256）全部用真实现
 * - 用 `vi.resetModules()` + 真实 localStorage 模拟「刷新页面」：
 *   重新 import 会依据 localStorage 重建 localConfig，与真实启动路径一致
 *
 * 这层测试专门盯「跨会话不变量」——配置写没写进去、刷新后还在不在。
 * 历史 bug（导入后刷新被云端旧配置覆盖）就属于这一层，任何单函数测试都覆盖不到。
 */

vi.mock('@/common/toast', () => ({
  showToast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('@/logic/utils/gtag', () => ({ gaProxy: vi.fn() }))
vi.mock('@/logic/utils/database', () => ({ clearDatabase: vi.fn() }))
vi.mock('@/logic/utils/common', () => ({
  log: vi.fn(),
  sleep: vi.fn().mockResolvedValue(null),
  createTab: vi.fn(),
  padUrlHttps: vi.fn((url: string) => url),
}))
vi.mock('@/logic/store/state', () => ({
  globalState: {
    isImportSettingLoading: false,
    isClearStorageLoading: false,
    isChangelogModalVisible: false,
  },
  switchSettingDrawerVisible: vi.fn(),
}))

/** 把当前会话的内存状态落到 localStorage（等价于页面存活到防抖窗口之后） */
const persistSession = async () => {
  const { localState, flushConfigToLocalStorage } =
    await import('@/logic/config/state')
  flushConfigToLocalStorage()
  localStorage.setItem('l-state', JSON.stringify(localState.value))
}

/** 模拟刷新：落盘 → 取消排队上传 → 清模块缓存，下一次 import 会重建配置 */
const reloadPage = async () => {
  const { cancelAllDebounce } = await import('@/logic/config/sync/upload')
  await persistSession()
  cancelAllDebounce()
  vi.resetModules()
}

// 读取 chrome.storage.sync 中的原始字符串（setup.ts 的 mock 数据不对外暴露，
// 通过 get 回调拿）
const readStored = (keys: string[]) =>
  new Promise<Record<string, string>>((resolve) => {
    chrome.storage.sync.get(keys, (data) => resolve(data as any))
  })

describe('配置端到端：跨会话不变量', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  it('导入的配置在刷新后仍然保留（不会被云端旧数据回滚）', async () => {
    window.appVersion = '2.7.0'

    // 第一次启动：云端为空 → 上传默认配置
    const loader = await import('@/logic/config/sync/loader')
    await loader.setupPageConfigSync()

    // 导入一份改了 pageTitle 的配置
    const manage = await import('@/logic/config/sync/manage')
    const state = await import('@/logic/config/state')
    await manage.importSetting(
      JSON.stringify({
        general: {
          version: window.appVersion,
          pageTitle: 'IMPORTED-TITLE',
        },
      }),
    )
    expect(state.localConfig.general.pageTitle).toBe('IMPORTED-TITLE')

    // 刷新页面
    await reloadPage()
    const reloadedState = await import('@/logic/config/state')
    const reloadedLoader = await import('@/logic/config/sync/loader')
    await reloadedLoader.setupPageConfigSync()

    // 关键断言：导入结果必须在刷新后依然生效
    expect(reloadedState.localConfig.general.pageTitle).toBe('IMPORTED-TITLE')
  }, 30000)

  it('云端被其它设备更新后，冷启动能拿到新值', async () => {
    window.appVersion = '2.7.0'

    const loader = await import('@/logic/config/sync/loader')
    await loader.setupPageConfigSync()

    const state = await import('@/logic/config/state')
    const remoteSearch = {
      ...state.localConfig.search,
      isNewTabOpen: !state.localConfig.search.isNewTabOpen,
    }
    const payload = {
      syncTime: Date.now() + 1000,
      syncId: 'remote-device-md5',
      appVersion: window.appVersion,
      data: remoteSearch,
    }

    await new Promise<void>((resolve) => {
      chrome.storage.sync.set(
        { 'naive-tab-search': JSON.stringify(payload) },
        () => resolve(),
      )
    })

    // 刷新页面（本地干净 + syncId 与云端不同 → 应以云端为准）
    await reloadPage()
    const reloadedState = await import('@/logic/config/state')
    const reloadedLoader = await import('@/logic/config/sync/loader')
    await reloadedLoader.setupPageConfigSync()

    expect(reloadedState.localConfig.search.isNewTabOpen).toBe(
      remoteSearch.isNewTabOpen,
    )
  }, 30000)

  it('冷启动后列表字段与默认结构完整（mergeState 真实现）', async () => {
    window.appVersion = '2.7.0'

    const loader = await import('@/logic/config/sync/loader')
    await loader.setupPageConfigSync()

    const stored = await readStored(['naive-tab-news'])
    const payload = JSON.parse(stored['naive-tab-news'])
    // 云端 payload 里必须是完整结构，不能因裁剪/过滤丢字段
    expect(payload.data.sourceList).toBeDefined()
    expect(payload.data.sourceList.length).toBeGreaterThan(0)
    expect(typeof payload.syncId).toBe('string')
    expect(payload.syncId.length).toBeGreaterThan(10)
  }, 30000)

  it('本机配置被写坏时以云端为准回拉，不会把默认值当成用户配置传上去', async () => {
    window.appVersion = '2.7.0'

    // 云端基线
    const loader = await import('@/logic/config/sync/loader')
    await loader.setupPageConfigSync()

    // 用户改标题并同步到云端（此时云端与本地内容一致、syncId 相同）
    const state = await import('@/logic/config/state')
    const upload = await import('@/logic/config/sync/upload')
    state.localConfig.general.pageTitle = 'USER-TITLE'
    await upload.flushConfigSync('general')

    // 会话落盘后再写坏 c-general（模拟手工编辑 / 写入中断）
    await persistSession()
    upload.cancelAllDebounce()
    localStorage.setItem('c-general', '{broken json')
    vi.resetModules()

    // 重新加载：c-general 回落默认值，但同步层必须知道「本机这份不可信」，
    // 以云端为准把用户配置拉回来，而不是保留默认值（否则下次修改会覆盖云端）
    const recoveredState = await import('@/logic/config/state')
    const recoveredLoader = await import('@/logic/config/sync/loader')
    await recoveredLoader.setupPageConfigSync()

    expect(recoveredState.localConfig.general.pageTitle).toBe('USER-TITLE')
  }, 30000)
})
