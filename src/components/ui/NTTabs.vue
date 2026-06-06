<script setup lang="ts">
/**
 * NTTabs — NaiveTab 标签页组件
 *
 * 基于 Reka UI TabsRoot + TabsList 封装，仅支持 segment 胶囊风格。
 * 必须搭配 NTTabsPane 使用，Pane 通过 provide/inject 向父组件注册 tab 信息。
 * 样式由 src/styles/reka/tabs.css 中的 .reka-tabs 系列类控制。
 *
 * @example
 * <NTTabs v-model:value="active" animated>
 *   <NTTabsPane name="a" tab="标签A">
 *     <p>内容 A</p>
 *   </NTTabsPane>
 *   <NTTabsPane name="b" tab="标签B" />
 * </NTTabs>
 */
import { TabsRoot, TabsList, TabsTrigger, TabsIndicator } from 'reka-ui'
import { ref, provide, onBeforeUnmount, watch } from 'vue'

defineProps<{
  defaultValue?: string | number
  animated?: boolean
  justifyContent?: string
}>()

const modelValue = defineModel<string | number>('value')

interface PaneDescriptor {
  name: string | number
  tab: string
  disabled?: boolean
  hasContent: boolean
}

const panes = ref<PaneDescriptor[]>([])

provide('nt-tabs:addPane', (pane: PaneDescriptor) => {
  panes.value.push(pane)
})

provide('nt-tabs:removePane', (name: string | number) => {
  panes.value = panes.value.filter((p) => p.name !== name)
})

onBeforeUnmount(() => {
  panes.value = []
})

/** 切换方向：forward（→）/ backward（←），驱动面板动画方向。
 *  初始 undefined，首次渲染不设 data-direction → CSS 动画不触发。
 *  仅在用户实际切换 tab 后（watch oldVal != null）才赋值。 */
const direction = ref<'forward' | 'backward'>()

watch(modelValue, (newVal, oldVal) => {
  if (oldVal == null) return
  const oldIdx = panes.value.findIndex((p) => p.name === oldVal)
  const newIdx = panes.value.findIndex((p) => p.name === newVal)
  if (oldIdx === -1 || newIdx === -1) return
  direction.value = newIdx > oldIdx ? 'forward' : 'backward'
})
</script>

<template>
  <TabsRoot
    v-model="modelValue"
    :default-value="defaultValue"
    :unmount-on-hide="false"
    class="reka-tabs"
    :data-animated="animated ? 'true' : undefined"
    :data-direction="direction"
  >
    <TabsList
      class="reka-tabs__list"
      :style="justifyContent ? { justifyContent } : undefined"
    >
      <TabsIndicator class="reka-tabs__indicator" />
      <TabsTrigger
        v-for="pane in panes"
        :key="pane.name"
        :value="pane.name"
        :disabled="pane.disabled"
        class="reka-tabs__trigger reka-focus-visible"
      >
        {{ pane.tab }}
      </TabsTrigger>
    </TabsList>
    <div class="reka-tabs__panels">
      <slot />
    </div>
  </TabsRoot>
</template>
