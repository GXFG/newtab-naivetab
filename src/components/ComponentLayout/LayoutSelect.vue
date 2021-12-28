<template>
  <div class="position__select">
    <NButton
      v-for="item in state.positionList"
      :key="item.type"
      :type="currType === item.type ? 'primary' : undefined"
      class="select__btn"
      size="small"
      @click="onChangePosition(item.type)"
    >
      <Icon :icon="item.icon" />
    </NButton>
  </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { globalState, POSITION_TYPE_TO_STYLE_MAP } from '@/logic'

const props = defineProps({
  field: {
    type: String,
    required: true,
  },
})

// globalState.setting[props.field].layout

const currType = computed(() => {
  return 2
})

const state = reactive({
  positionList: [] as { type: number; icon: string }[],
})

const onChangePosition = (type: number) => {}

const initEnumData = () => {
  state.positionList = [
    { type: 1, icon: 'mdi:arrow-top-left-thick' },
    { type: 2, icon: 'mdi:arrow-up-thick' },
    { type: 3, icon: 'mdi:arrow-top-right-thick' },
    { type: 4, icon: 'mdi:arrow-left-thick' },
    { type: 5, icon: 'mdi:image-filter-center-focus-strong' },
    { type: 6, icon: 'mdi:arrow-right-thick' },
    { type: 7, icon: 'mdi:arrow-bottom-left-thick' },
    { type: 8, icon: 'mdi:arrow-down-thick' },
    { type: 9, icon: 'mdi:arrow-bottom-right-thick' },
  ]
}

watch(
  () => globalState.setting.general.lang,
  () => {
    initEnumData()
  },
  { immediate: true },
)

</script>

<style scoped>
.position__select {
  width: 256px;
  .select__btn {
    width: 33%;
  }
}
</style>
