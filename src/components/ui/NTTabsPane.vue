<script setup lang="ts">
/**
 * NTTabsPane — NaiveTab 标签页面板
 *
 * 渲染单个 tab 的内容面板（Reka TabsContent）。如果无默认插槽内容
 * （仅作为 tab 切换器使用），则不渲染 TabsContent。
 * tab 按钮通过 provide/inject 注册到父级 NTTabs。
 *
 * 必须放在 NTTabs 内部使用。
 *
 * @example
 * <NTTabsPane name="a" tab="标签A">
 *   <p>面板内容</p>
 * </NTTabsPane>
 * <NTTabsPane name="b" tab="标签B" disabled />
 */
import { TabsContent } from 'reka-ui'
import { inject, useSlots, onBeforeUnmount, computed } from 'vue'

const props = defineProps<{
  name: string | number
  tab: string
  disabled?: boolean
}>()

const slots = useSlots()
const hasContent = computed(() => !!slots.default)

const addPane =
  inject<
    (pane: {
      name: string | number
      tab: string
      disabled?: boolean
      hasContent: boolean
    }) => void
  >('nt-tabs:addPane')!
const removePane =
  inject<(name: string | number) => void>('nt-tabs:removePane')!

addPane({
  name: props.name,
  tab: props.tab,
  disabled: props.disabled,
  hasContent: hasContent.value,
})

onBeforeUnmount(() => {
  removePane(props.name)
})
</script>

<template>
  <TabsContent
    v-if="hasContent"
    :value="name"
    class="reka-tabs__content"
  >
    <slot />
  </TabsContent>
</template>
