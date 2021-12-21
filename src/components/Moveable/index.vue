<template>
  <slot />
</template>

<script setup lang="ts">
// import Moveable from 'vue3-moveable'
// import { globalState } from '@/logic'

import { globalState } from '@/logic'

const props = defineProps({
  componentName: {
    type: String,
  },
})

const emit = defineEmits(['onDrag'])

// const state = reactive({
//   boundsValue: {},
//   verticalGuidelinesValue: [] as number[],
//   horizontalGuidelinesValue: [] as number[],
// })

// const initDefaultValue = () => {
//   state.boundsValue = { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
//   state.verticalGuidelinesValue = [Math.floor(window.innerWidth / 2), 50, 400]
//   state.horizontalGuidelinesValue = [Math.floor(window.innerHeight / 2), 50, 400]
// }
// initDefaultValue()

const state = reactive({
  isDraging: false,
  startData: {} as any,
})

const targetEl = ref()

const startDrag = (e: MouseEvent) => {
  const { top, right, bottom, left } = targetEl.value.getBoundingClientRect()
  state.isDraging = true
  state.startData = {
    top,
    right,
    bottom,
    left,
    clientX: e.clientX,
    clientY: e.clientY,
  }
}

const stopDrag = () => {
  state.isDraging = false
}

const onDrag = (e: MouseEvent) => {
  if (!state.isDraging) {
    return
  }
  // console.log(e)
  const mouseDiffX = e.clientX - state.startData.clientX
  const mouseDiffY = e.clientY - state.startData.clientY
  // const { top, right, bottom, left } = targetEl.value.getBoundingClientRect()
  // console.log(top, right, bottom, left)
  let xOffsetKey = ''
  let yOffsetKey = ''
  let xOffsetValue = state.startData.left + mouseDiffX
  let yOffsetValue = state.startData.top + mouseDiffY
  // const { innerWidth, innerHeight } = window
  // const xLine = innerWidth / 2
  // const yLine = innerHeight / 2
  // if (xOffsetValue <= xLine) {
  //   xOffsetKey = 'left'
  //   xOffsetValue = `${(xOffsetValue / innerWidth) * 100}`
  // } else {
  //   xOffsetKey = 'right'
  //   xOffsetValue = `${((innerWidth - xOffsetValue) / innerWidth) * 100}`
  // }
  // if (yOffsetValue <= yLine) {
  //   yOffsetKey = 'top'
  //   yOffsetValue = `${(yOffsetValue / innerHeight) * 100}`
  // } else {
  //   yOffsetKey = 'bottom'
  //   yOffsetValue = `${(innerHeight - yOffsetValue / innerHeight) * 100}`
  // }

  xOffsetKey = 'left'
  xOffsetValue = `${(xOffsetValue / innerWidth) * 100}`
  yOffsetKey = 'top'
  yOffsetValue = `${(yOffsetValue / innerHeight) * 100}`
  emit('onDrag', `${xOffsetKey}:${xOffsetValue}%; ${yOffsetKey}:${yOffsetValue}%`)
}

// const onDragEnd = (e: any) => {
//   const { xOffsetKey, xOffsetValue, yOffsetKey, yOffsetValue } = handleDrag(e.lastEvent)
//   globalState.setting[props.componentName as any].layout.xOffsetKey = xOffsetKey
//   globalState.setting[props.componentName as any].layout.xOffsetValue = xOffsetValue
//   globalState.setting[props.componentName as any].layout.yOffsetKey = yOffsetKey
//   globalState.setting[props.componentName as any].layout.yOffsetValue = yOffsetValue
// }

const init = () => {
  targetEl.value = document.querySelector(`.${props.componentName}__container`)
  targetEl.value.addEventListener('mousedown', startDrag)
  globalState.state.dragTaskList.push(onDrag)
  targetEl.value.addEventListener('mouseup', stopDrag)
}

onMounted(() => {
  init()
})
</script>

<style></style>
