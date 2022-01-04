<template>
  <!-- <div v-if="isDragMode" class="confirm-wrap">
    <NButton text type="primary" @click="toggleIsDragMode()">
      <mdi:exit-to-app class="item__icon" />
    </NButton>
  </div> -->
  <div id="moveable-tool"></div>
</template>

<script setup lang="ts">
// import { NButton } from 'naive-ui'
import { isDragMode, toggleIsDragMode, addKeyboardTask, currDragComponentName, globalState } from '@/logic'

const CNAME = 'moveable-tool'

// const state = reactive({})

const keyboardHandler = (e: KeyboardEvent) => {
  if (!isDragMode.value) {
    return
  }
  const { key } = e
  if (key === 'Escape') {
    toggleIsDragMode()
  } else if (['Delete', 'Backspace'].includes(key)) {
    if (currDragComponentName.value.length === 0) {
      return
    }
    if (currDragComponentName.value === 'general') {
      globalState.setting.general.isSetttingIconEnabled = false
    } else {
      globalState.setting[currDragComponentName.value].enabled = false
    }
  }
}

addKeyboardTask(CNAME, keyboardHandler)
</script>

<style>
#moveable-tool {
}
/* .confirm-wrap {
  z-index: 1999;
  position: absolute;
  top: 3%;
  right: 2%;
  .item__icon {
    font-size: 28px;
  }
} */
</style>
