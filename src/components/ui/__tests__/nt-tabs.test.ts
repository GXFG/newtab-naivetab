import { describe, it, expect } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import NTTabs from '@/components/ui/NTTabs.vue'
import NTTabsPane from '@/components/ui/NTTabsPane.vue'

/**
 * nt-tabs.test.ts — NTTabs 触发器顺序跟随面板顺序
 *
 * 背景：触发器渲染自 NTTabsPane 的注册顺序（setup 时 push），而面板顺序由调用方
 * 的 v-for 决定。重排时 key 未变的组件实例被复用，setup 不会重跑，注册顺序停留在
 * 旧顺序 → 触发器不跟着变（真实案例：设置里调整新闻源顺序，Widget 的 tab 不实时
 * 跟随，需重开新标签页才生效）。
 *
 * 覆盖：
 * - 初次渲染按 v-for 顺序
 * - 运行中重排 v-for，触发器顺序跟随
 * - 运行中插入/删除面板，触发器数量与顺序跟随
 */

type PaneItem = { name: string; tab: string }

const createWrapper = (initial: PaneItem[]) =>
  defineComponent({
    setup() {
      const list = ref<PaneItem[]>(initial)
      return { list }
    },
    render() {
      return h(NTTabs, { value: this.list[0]?.name ?? '' }, () =>
        this.list.map((item) =>
          h(
            NTTabsPane,
            { key: item.name, name: item.name, tab: item.tab },
            () => h('p', item.tab),
          ),
        ),
      )
    },
  })

const getTriggerTexts = (wrapper: ReturnType<typeof mount>) =>
  wrapper.findAll('.reka-tabs__trigger').map((trigger) => trigger.text())

describe('NTTabs 触发器顺序', () => {
  it('初次渲染按传入顺序', async () => {
    const wrapper = mount(createWrapper([
      { name: 'a', tab: 'A' },
      { name: 'b', tab: 'B' },
      { name: 'c', tab: 'C' },
    ]))
    // 注册发生在挂载过程中，触发器在紧随其后的重渲染里才出现
    await nextTick()
    expect(getTriggerTexts(wrapper)).toEqual(['A', 'B', 'C'])
  })

  it('重排面板后触发器顺序跟随', async () => {
    const wrapper = mount(createWrapper([
      { name: 'a', tab: 'A' },
      { name: 'b', tab: 'B' },
      { name: 'c', tab: 'C' },
    ]))
    ;(wrapper.vm as unknown as { list: PaneItem[] }).list.reverse()
    await nextTick()
    expect(getTriggerTexts(wrapper)).toEqual(['C', 'B', 'A'])
  })

  it('新增/移除面板后触发器同步', async () => {
    const vm = mount(createWrapper([
      { name: 'a', tab: 'A' },
      { name: 'b', tab: 'B' },
    ]))
    const state = vm.vm as unknown as { list: PaneItem[] }
    state.list = [
      { name: 'c', tab: 'C' },
      { name: 'a', tab: 'A' },
      { name: 'b', tab: 'B' },
    ]
    await nextTick()
    await nextTick()
    expect(getTriggerTexts(vm)).toEqual(['C', 'A', 'B'])

    state.list = [
      { name: 'c', tab: 'C' },
      { name: 'b', tab: 'B' },
    ]
    await nextTick()
    await nextTick()
    expect(getTriggerTexts(vm)).toEqual(['C', 'B'])
  })
})
