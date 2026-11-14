import { mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import MonthPicker from '../MonthPicker.vue'

/**
 * MonthPicker 的交互契约。
 *
 * 为什么值得测：这个组件替换掉了原来两个 NTSelect，行为全靠「弹层是否打开 +
 * 当前是月面板还是年面板」两个状态组合。这类自管状态的弹层最容易在改动后
 * 出现「点了没反应」或「选完不关」——两者都不会让 typecheck 或视觉回归发现。
 *
 * 弹层由 Reka Portal 挂到 body，所以断言查 document 而不是 wrapper。
 */

const LABELS = [
  '1月',
  '2月',
  '3月',
  '4月',
  '5月',
  '6月',
  '7月',
  '8月',
  '9月',
  '10月',
  '11月',
  '12月',
]

const mountPicker = (
  overrides: {
    year?: number
    month?: number
    disabled?: boolean
  } = {},
) =>
  mount(MonthPicker, {
    props: {
      year: 2026,
      month: 11,
      labels: LABELS,
      minYear: 1900,
      maxYear: 2100,
      ...overrides,
    },
    attachTo: document.body,
  })

const cells = (selector: string) =>
  Array.from(document.querySelectorAll<HTMLButtonElement>(selector))

/** 弹层头部的翻页按钮：[上一页/上一年, 下一页/下一年] */
const navButtons = () =>
  Array.from(document.querySelectorAll<HTMLButtonElement>('.picker__nav'))

describe('MonthPicker', () => {
  beforeEach(() => {
    // 真实 $t 会做插值，setup.ts 的桩只回 key，标题断言需要真值
    window.$t = ((key: string, params?: Record<string, string | number>) =>
      key === 'calendar.yearMonthTitle'
        ? `${params?.month} ${params?.year}`
        : key) as typeof window.$t
    document.body.innerHTML = ''
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('标题按「月 + 年」渲染，弹层默认关闭', () => {
    const wrapper = mountPicker()
    const title = wrapper.get('.picker__title')

    // 断言可见文本而不是 title.text()：按钮里还堆着 12 条隐藏的占位串
    expect(wrapper.get('.title__value').text()).toBe('11月 2026')
    expect(title.attributes('aria-expanded')).toBe('false')
    expect(cells('[data-month]')).toHaveLength(0)
  })

  it('点标题展开 4×3 的月网格并标出当前月', async () => {
    const wrapper = mountPicker()
    await wrapper.get('.picker__title').trigger('click')
    await nextTick()

    const months = cells('[data-month]')
    expect(months).toHaveLength(12)
    expect(months[10].classList.contains('grid__cell--active')).toBe(true)
    expect(wrapper.get('.picker__title').attributes('aria-expanded')).toBe(
      'true',
    )
  })

  it('选月后提交年月并关闭弹层', async () => {
    const wrapper = mountPicker()
    await wrapper.get('.picker__title').trigger('click')
    await nextTick()

    cells('[data-month]')[4].click()
    await nextTick()

    expect(wrapper.emitted('select')?.[0]).toEqual([2026, 5])
    expect(wrapper.get('.picker__title').attributes('aria-expanded')).toBe(
      'false',
    )
  })

  it('点年份进年份面板，选年后回到月面板且保留月份', async () => {
    const wrapper = mountPicker()
    await wrapper.get('.picker__title').trigger('click')
    await nextTick()

    // 弹层在 teleport 里，wrapper.get 找不到，必须查 document
    document.querySelector<HTMLElement>('.picker__year')!.click()
    await nextTick()

    // 2026 所在的 12 年页：2020–2031
    expect(cells('[data-year]')).toHaveLength(12)
    expect(cells('[data-year]')[0].textContent?.trim()).toBe('2020')

    document.querySelector<HTMLButtonElement>('[data-year="2024"]')!.click()
    await nextTick()

    expect(wrapper.emitted('select')?.[0]).toEqual([2024, 11])
    // 回到月面板：年已提交，弹层留着让用户继续选月
    expect(cells('[data-month]')).toHaveLength(12)
    expect(wrapper.get('.picker__title').attributes('aria-expanded')).toBe(
      'true',
    )
  })

  it('标题宽度由隐藏占位串撑住，换月时占位一字不变', async () => {
    const wrapper = mountPicker()
    const sizers = wrapper.findAll('.title__sizer')

    expect(sizers).toHaveLength(12)
    // 占位串一律用「最宽年份」打头，与实际年份无关
    expect(sizers.every((s) => s.text().includes('8888'))).toBe(true)

    await wrapper.setProps({ month: 1 })
    await nextTick()

    expect(wrapper.findAll('.title__sizer').map((s) => s.text())).toEqual(
      sizers.map((s) => s.text()),
    )
    expect(wrapper.get('.title__value').text()).toBe('1月 2026')
  })

  it('点标题的 click 不冒泡给 Reka 触发器', async () => {
    const wrapper = mountPicker()
    const title = wrapper.get('.picker__title')
    const spy = vi.fn()
    // 触发器就是按钮的父节点：真实点击若冒泡过去，Reka 的 onOpenToggle 会把弹层关掉
    title.element.parentElement!.addEventListener('click', spy)

    await title.trigger('click')
    await nextTick()

    expect(spy).not.toHaveBeenCalled()
    expect(wrapper.get('.picker__title').attributes('aria-expanded')).toBe(
      'true',
    )
    expect(cells('[data-month]')).toHaveLength(12)
  })

  it('方向键在网格里移动焦点，右键从 11 月走到 12 月', async () => {
    const wrapper = mountPicker()
    await wrapper.get('.picker__title').trigger('click')
    await nextTick()

    const november =
      document.querySelector<HTMLButtonElement>('[data-month="11"]')!
    november.focus()
    expect(document.activeElement).toBe(november)

    november.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }),
    )
    await nextTick()

    expect(document.activeElement).toBe(
      document.querySelector('[data-month="12"]'),
    )
  })

  /**
   * 边界：可浏览范围是 1900-01 ~ 2100-12（与 clampYearMonth 同一份端点）。
   * 走到头上时按钮必须置灰 —— 否则点下去毫无反应，用户会当成卡死。
   */
  it('到 1900-01 时「上一年」置灰，进年份面板后「上一页」同样置灰', async () => {
    const wrapper = mountPicker({ year: 1900, month: 1 })
    await wrapper.get('.picker__title').trigger('click')
    await nextTick()

    expect(navButtons()[0].disabled).toBe(true)
    expect(navButtons()[1].disabled).toBe(false)

    document.querySelector<HTMLElement>('.picker__year')!.click()
    await nextTick()

    // 1900 就是第一页，没有更早的 12 年可翻
    expect(navButtons()[0].disabled).toBe(true)
  })

  it('年份尾页只渲染到 maxYear，且「下一页」置灰', async () => {
    const wrapper = mountPicker()
    await wrapper.get('.picker__title').trigger('click')
    await nextTick()
    document.querySelector<HTMLElement>('.picker__year')!.click()
    await nextTick()

    // 2026 落在 2020–2031 这一页，往后翻 6 页到最后一页 2092–2100
    for (let i = 0; i < 6; i++) {
      navButtons()[1].click()
      await nextTick()
    }

    const years = cells('[data-year]')
    expect(years).toHaveLength(9)
    expect(years[0].textContent?.trim()).toBe('2092')
    expect(years[8].textContent?.trim()).toBe('2100')
    expect(navButtons()[1].disabled).toBe(true)
  })

  it('disabled 时点标题不展开弹层', async () => {
    const wrapper = mountPicker({ disabled: true })
    await wrapper.get('.picker__title').trigger('click')
    await nextTick()

    // 拖拽态下年月不可改：按钮 disabled，toggle 里也有 props.disabled 早退
    expect(wrapper.get('.picker__title').attributes('aria-expanded')).toBe(
      'false',
    )
    expect(cells('[data-month]')).toHaveLength(0)
  })
})
