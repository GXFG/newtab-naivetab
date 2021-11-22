<template>
  <div class="position__select">
    <NButton
      v-for="position in state.positionList"
      :key="position.type"
      :type="props.currType === position.type ? 'primary' : undefined"
      class="select__btn"
      size="small"
      @click="onChangePositionType(position.type)"
    >
      {{ position.label }}
    </NButton>
  </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui'
import { globalState } from '@/logic'

const props = defineProps({
  currType: {
    type: Number,
    required: true,
  },
})

const emit = defineEmits(['onConfirm'])

const state = reactive({
  positionList: [] as { label: string; type: number }[],
})

const initEnumData = () => {
  state.positionList = [
    { label: window.$t('common.leftTop'), type: 1 },
    { label: window.$t('common.centerTop'), type: 2 },
    { label: window.$t('common.rightTop'), type: 3 },
    { label: window.$t('common.leftCenter'), type: 4 },
    { label: window.$t('common.centerCenter'), type: 5 },
    { label: window.$t('common.rightCenter'), type: 6 },
    { label: window.$t('common.leftBottom'), type: 7 },
    { label: window.$t('common.centerBottom'), type: 8 },
    { label: window.$t('common.rightBottom'), type: 9 },
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
  width: 150px;
  .select__btn {
  }
}
</style>
