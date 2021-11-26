<template>
  <div class="position__select">
    <NButton
      v-for="item in state.positionList"
      :key="item.type"
      :type="props.currType === item.type ? 'primary' : undefined"
      class="select__btn"
      size="small"
      @click="onChangePositionType(item.type)"
    >
      <Icon :icon="item.icon" />
    </NButton>
  </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui'
import { Icon } from '@iconify/vue'
import { globalState } from '@/logic'

const props = defineProps({
  currType: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(['onConfirm'])

const state = reactive({
  positionList: [] as { type: number; icon: string }[],
})

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

initEnumData()

watch(() => globalState.setting.general.lang, () => {
  initEnumData()
})

const onChangePositionType = (type: number) => {
  emit('onConfirm', type)
}

</script>

<style scoped>
.position__select {
  width: 200px;
  .select__btn {
    width: 33%;
  }
}
</style>
