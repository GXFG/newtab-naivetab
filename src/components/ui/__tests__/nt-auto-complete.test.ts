import { describe, it, expect, beforeAll } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import NTAutoComplete from '@/components/ui/NTAutoComplete.vue'

/**
 * nt-auto-complete.test.ts — NTAutoComplete 的本地过滤
 *
 * 背景：节假日订阅的国家列表改成了可搜索下拉，候选是静态的 46 个地区，
 * 过滤交给 Reka 自己按选项文本做（ignoreFilter=false）。服务端搜索的调用方
 * 仍走 ignoreFilter=true，两边的行为都要守住。
 *
 * 覆盖：
 * - ignoreFilter=false：输入关键词后只剩匹配项
 * - openOnClick：点输入框就展开候选（不点开就得先打字，体验断层）
 * - ignoreFilter=true（默认）：父级给的选项不被二次过滤
 */

const options = [
  { label: '德国', value: 'DE' },
  { label: '法国', value: 'FR' },
  { label: '日本', value: 'JP' },
]

beforeAll(() => {
  // jsdom 没有 ResizeObserver，Reka 的下拉定位会直接抛
  if (typeof globalThis.ResizeObserver === 'undefined') {
    globalThis.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    } as unknown as typeof ResizeObserver
  }
})

const mountComponent = (props: Record<string, unknown> = {}) =>
  mount(NTAutoComplete, {
    props: { options, value: '', ...props },
    attachTo: document.body,
  })

/** 候选渲染在 Portal 里，只能从 document 查 */
const visibleItems = () =>
  [...document.querySelectorAll('.reka-autocomplete__item')].map((el) =>
    el.textContent?.trim(),
  )

const openByClick = async (wrapper: ReturnType<typeof mountComponent>) => {
  await wrapper.find('input').trigger('click')
  await nextTick()
  await nextTick()
}

describe('NTAutoComplete 本地过滤', () => {
  it('openOnClick 打开时点输入框就展开全部候选', async () => {
    const wrapper = mountComponent({ ignoreFilter: false, openOnClick: true })
    await openByClick(wrapper)
    expect(visibleItems()).toEqual(['德国', '法国', '日本'])
    wrapper.unmount()
  })

  it('输入关键词后只剩匹配项', async () => {
    const wrapper = mountComponent({ ignoreFilter: false })
    await wrapper.find('input').setValue('德')
    await nextTick()
    await nextTick()
    expect(visibleItems()).toEqual(['德国'])
    wrapper.unmount()
  })

  it('ignoreFilter 默认开启时不做本地过滤（服务端搜索场景）', async () => {
    const wrapper = mountComponent()
    await openByClick(wrapper)
    await wrapper.find('input').setValue('德')
    await nextTick()
    await nextTick()
    // 过滤由父级负责，组件不能把选项吃掉
    expect(visibleItems()).toEqual(['德国', '法国', '日本'])
    wrapper.unmount()
  })
})
