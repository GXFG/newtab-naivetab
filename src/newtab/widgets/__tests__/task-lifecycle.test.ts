import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'

/**
 * task-lifecycle.test.ts — Widget 与任务系统的契约
 *
 * 测什么：Widget 启用/禁用时，daily 与 timer 任务是否被正确注册、注销；
 * 以及 yearProgress 的「实时模式」开关是否只影响秒级任务、不误伤日切任务。
 *
 * 为什么值得单独测：这套契约被误判过一次 —— 一度以为「禁用 Widget = 卸载组件」，
 * 于是把注册/注销挪进 onMounted/onUnmounted，结果禁用后再也不注销、任务常驻。
 * 真实结构是：Content.vue 用 v-for **无条件挂载**所有 Widget，WidgetWrap 里的
 * `v-if="isEnabled"` 在内部、只销毁 slot DOM，Widget 组件实例始终活着 ——
 * 所以禁用这条路径只有 `watch(isRender)` 感知得到，`onUnmounted` 收不到。
 * 任何一次「顺手把 watch 换成生命周期钩子」的改动，都会在这里红掉。
 *
 * Mock 策略：
 * - `@/logic/task` 的 4 个注册函数替换成写本地 registry 的 spy。断言「任务在不在」
 *   而不是调用次数：`syncRealtimeTask` 会先 remove 再 add，只看次数容易写脆。
 * - 其余导出用 importOriginal 保留，避免打断 WidgetWrap → moveable → task 的传递依赖。
 * - happy-dom 已内置 matchMedia，下方 polyfill 是兜底、通常不触发；保留是因为
 *   store/theme.ts 在模块初始化时就会调用它，换环境或裁剪版 DOM 实现缺该 API 会直接崩。
 */

type TTaskRegistry = {
  daily: Set<string>
  timer: Set<string>
}

const registry: TTaskRegistry = {
  daily: new Set<string>(),
  timer: new Set<string>(),
}

// 必须在动态 import 组件（会连带初始化 store/theme）之前装好
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  })) as unknown as typeof window.matchMedia
}

let wrapper: VueWrapper | null = null

beforeEach(() => {
  vi.resetModules()
  registry.daily.clear()
  registry.timer.clear()

  vi.doMock('@/logic/task', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/logic/task')>()
    return {
      ...actual,
      addDailyTask: vi.fn((key: string) => registry.daily.add(key)),
      removeDailyTask: vi.fn((key: string) => registry.daily.delete(key)),
      addTimerTask: vi.fn((key: string) => registry.timer.add(key)),
      removeTimerTask: vi.fn((key: string) => registry.timer.delete(key)),
    }
  })
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = null
})

describe('date widget 的任务生命周期', () => {
  it('禁用时注销 daily 任务、再启用重新注册（不依赖 onUnmounted）', async () => {
    const { localConfig } = await import('@/logic/config/state')
    const DateWidget = (await import('@/newtab/widgets/date/index.vue')).default

    localConfig.date.enabled = true
    wrapper = mount(DateWidget, { attachTo: document.body })
    await nextTick()

    expect(registry.daily.has('date')).toBe(true)
    expect(document.querySelector('.date__container')).not.toBeNull()

    localConfig.date.enabled = false
    await nextTick()

    // 禁用销毁 slot DOM，但组件实例还在（所以任务只能由 watch(isRender) 摘）
    expect(document.querySelector('.date__container')).toBeNull()
    expect(registry.daily.has('date')).toBe(false)

    localConfig.date.enabled = true
    await nextTick()

    // 没被卸载过，onMounted 不会再跑；任务能回来只可能是 watch 重新注册的
    expect(registry.daily.has('date')).toBe(true)
    expect(document.querySelector('.date__container')).not.toBeNull()
  })
})

describe('yearProgress widget 的任务生命周期', () => {
  it('禁用/启用与实时模式开关分别同步 daily 与 timer 任务', async () => {
    const { localConfig } = await import('@/logic/config/state')
    const YearProgress = (
      await import('@/newtab/widgets/yearProgress/index.vue')
    ).default

    localConfig.yearProgress.enabled = true
    localConfig.yearProgress.isRealtime = true
    wrapper = mount(YearProgress, { attachTo: document.body })
    await nextTick()

    expect(registry.daily.has('yearProgress')).toBe(true)
    expect(registry.timer.has('yearProgress')).toBe(true)

    // 关实时只摘秒级任务，日切必须保留（passDay 还得跨天更新）
    localConfig.yearProgress.isRealtime = false
    await nextTick()
    expect(registry.timer.has('yearProgress')).toBe(false)
    expect(registry.daily.has('yearProgress')).toBe(true)

    localConfig.yearProgress.isRealtime = true
    await nextTick()
    expect(registry.timer.has('yearProgress')).toBe(true)

    // 禁用：两类任务都要摘掉，否则 daily 的共享 rAF 循环永远停不下来
    localConfig.yearProgress.enabled = false
    await nextTick()
    expect(registry.daily.has('yearProgress')).toBe(false)
    expect(registry.timer.has('yearProgress')).toBe(false)

    localConfig.yearProgress.enabled = true
    await nextTick()
    expect(registry.daily.has('yearProgress')).toBe(true)
    expect(registry.timer.has('yearProgress')).toBe(true)
  })
})
