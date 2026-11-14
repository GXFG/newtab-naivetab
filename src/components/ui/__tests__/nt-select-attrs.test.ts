import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import NTSelect from '@/components/ui/NTSelect.vue'

/**
 * nt-select-attrs.test.ts — NTSelect 的 class / style 必须落在触发按钮上
 *
 * 背景：NTSelect 的根节点是 Reka 的 `SelectRoot`，它不渲染元素（Fragment），
 * 且在 Reka 内部就写了 `inheritAttrs: false`。默认透传下，`<NTSelect class="…">`
 * 的 class 会被静默丢弃——不报错、不告警，样式坐等失效。
 *
 * 真实后果（已用无头 Chrome 实测）：年进度面板的「自定义格式」输入框和 select
 * 同处一行时，select 因拿不到 `flex: 1 1 0%` 而按 `width: 100%` 占满整行，
 * 输入框被挤到 **0 宽**、推到可视区之外，用户看不到也点不到。
 *
 * 这个测试锁住修复：改回默认 attrs 透传会立刻红。
 */

const createWrapper = () =>
  mount(NTSelect, {
    props: {
      options: [
        { label: '2026', value: 2026 },
        { label: '2027', value: 2027 },
      ],
      size: 'small',
    },
    attrs: {
      class: 'setting__fill-input',
      style: 'width: 200px',
    },
  })

describe('NTSelect 的 attrs 落点', () => {
  it('class 落在触发按钮上', () => {
    const wrapper = createWrapper()
    const trigger = wrapper.get('.reka-select__trigger')

    expect(trigger.classes()).toContain('setting__fill-input')
    // 组件自带的类名不能因此丢失
    expect(trigger.classes()).toContain('reka-focus-visible')
  })

  it('style 一并落到触发按钮上', () => {
    const wrapper = createWrapper()
    const trigger = wrapper.get('.reka-select__trigger')

    expect(trigger.attributes('style')).toContain('width: 200px')
  })
})
