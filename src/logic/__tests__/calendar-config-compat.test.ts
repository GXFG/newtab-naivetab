import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * 日历配置的向前兼容测试。
 *
 * 结论前提：`localConfig` 由 `useStorageLocal` 做**浅合并**（`{...默认值, ...已存值}`），
 * 因此 widget 配置的**顶层新字段**会自动补默认值，迁移分支不是兼容所必需。
 * `handleAppUpdate` 里仍显式赋值，是为了冻结“升级后的行为”（以后改默认值不影响老用户）。
 * 这里用 2.6.x 形态的旧配置直接验证浅合并前提，避免以后改了存储实现的合并策略而不自知。
 */
describe('日历配置向前兼容', () => {
  beforeEach(() => {
    vi.resetModules()
    localStorage.clear()
  })

  it('2.6.x 的旧配置升级后自动带上新字段默认值，且老值不丢', async () => {
    // 2.6.6 的日历配置：没有 subscriptionRegion / customSubscriptionUrl / 三个展示开关
    localStorage.setItem(
      'c-calendar',
      JSON.stringify({
        enabled: true,
        weekBeginsOn: 7,
        festivalCountdown: false,
      }),
    )

    const { localConfig } = await import('@/logic/config/state')

    // 新字段走默认值
    expect(localConfig.calendar.subscriptionRegion).toBe('CN')
    expect(localConfig.calendar.customSubscriptionUrl).toBe('')
    expect(localConfig.calendar.isHolidayMarkVisible).toBe(true)
    expect(localConfig.calendar.isLunarTermVisible).toBe(true)
    expect(localConfig.calendar.isAlmanacVisible).toBe(true)

    // 用户原有设置保留
    expect(localConfig.calendar.weekBeginsOn).toBe(7)
    expect(localConfig.calendar.festivalCountdown).toBe(false)
  })

  it('开发期残留的 holidayRegion 不会干扰新字段', async () => {
    // 2.7.0 开发阶段曾用过 holidayRegion，从未发布；残留值不应影响订阅地区
    localStorage.setItem('c-calendar', JSON.stringify({ holidayRegion: 'TW' }))

    const { localConfig } = await import('@/logic/config/state')

    expect(localConfig.calendar.subscriptionRegion).toBe('CN')
  })

  it('没有存过日历配置时全部用默认值', async () => {
    const { localConfig } = await import('@/logic/config/state')

    expect(localConfig.calendar.subscriptionRegion).toBe('CN')
    expect(localConfig.calendar.customSubscriptionUrl).toBe('')
  })
})
