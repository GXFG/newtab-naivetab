import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * 语言初始化的回归测试。
 *
 * 背景：`localConfig` 是**同步**从 localStorage 初始化的，用户在设置里把语言改成英语后
 * 刷新页面，`localConfig.general.lang` 在监听创建前就已经是 'en-US'；
 * 如果 `store/theme.ts` 的语言监听没有 immediate，i18n 会一直停留在浏览器语言。
 */
describe('i18n 语言初始化', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
    // store/theme.ts 用原生 matchMedia 检测 OS 主题（与 store.test.ts 一致）
    window.matchMedia = vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
  })

  it('配置为英语时，启动即切换为 en-US（而不是浏览器语言 zh-CN）', async () => {
    localStorage.setItem('c-general', JSON.stringify({ lang: 'en-US' }))

    const i18n = (await import('@/common/i18n')).default
    // 浏览器语言是 zh-CN（test/setup.ts 的 mock），配置应覆盖它
    expect(i18n.global.locale.value).toBe('zh-CN')

    await import('@/logic/store/theme')

    expect(i18n.global.locale.value).toBe('en-US')
  })

  it('配置为中文时保持 zh-CN', async () => {
    localStorage.setItem('c-general', JSON.stringify({ lang: 'zh-CN' }))

    const i18n = (await import('@/common/i18n')).default
    await import('@/logic/store/theme')

    expect(i18n.global.locale.value).toBe('zh-CN')
  })

  it('运行期修改语言会立即生效', async () => {
    localStorage.setItem('c-general', JSON.stringify({ lang: 'zh-CN' }))

    const i18n = (await import('@/common/i18n')).default
    await import('@/logic/store/theme')
    const { localConfig } = await import('@/logic/config/state')

    localConfig.general.lang = 'en-US'
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(i18n.global.locale.value).toBe('en-US')

    localConfig.general.lang = 'zh-CN'
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(i18n.global.locale.value).toBe('zh-CN')
  })

  it('非法语言值回退为当前语言（不崩溃）', async () => {
    localStorage.setItem('c-general', JSON.stringify({ lang: 'not-a-locale' }))

    const i18n = (await import('@/common/i18n')).default
    await import('@/logic/store/theme')

    expect(i18n.global.locale.value).toBe('zh-CN')
  })
})
