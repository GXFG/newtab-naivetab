<template>
  <div v-if="isDragMode" class="moveable-tool" :class="{ 'moveable-tool--active': isElementDrawerVisible }">
    <div class="tool__drawer">
      <div class="drawer__switch" @click="onToggleDrawer()">
        <ic:baseline-chevron-right class="switch__icon" :class="{ 'switch__icon--active': isElementDrawerVisible }" />
      </div>
      <div class="drawer__content">
        <div v-for="item in componentList" :key="item.label">
          <div v-if="!item.disabled" class="content__item" draggable="true" @dragstart="onDragStart(item.componentName as TComponents)" @dragend="onDragEnd ">
            <span>{{ item.label }}</span>
          </div>
        </div>
      </div>
      <!-- <NButton text type="primary" @click="toggleIsDragMode()">
        <mdi:exit-to-app class="item__icon" />
      </NButton> -->
    </div>
  </div>
</template>

<script setup lang="ts">
// import { NButton } from 'naive-ui'
import { useToggle } from '@vueuse/core'
import { isDragMode, toggleIsDragMode, addKeyboardTask, currDragMaterielComponentName, currDragComponentName, globalState, changeElementEnabledStatus } from '@/logic'

const CNAME = 'moveable-tool'

const [isElementDrawerVisible, toggleIsElementDrawerVisible] = useToggle(true)

const componentList = computed(() => [
  { label: 'KeyboardBookmark', componentName: 'bookmark', disabled: globalState.setting.bookmark.enabled },
  { label: 'DigitalClock', componentName: 'clockDigital', disabled: globalState.setting.clockDigital.enabled },
  { label: 'AnalogClock', componentName: 'clockAnalog', disabled: globalState.setting.clockAnalog.enabled },
  { label: 'Date', componentName: 'date', disabled: globalState.setting.date.enabled },
  { label: 'Calendar', componentName: 'calendar', disabled: globalState.setting.calendar.enabled },
  { label: 'Search', componentName: 'search', disabled: globalState.setting.search.enabled },
  { label: 'Weather', componentName: 'weather', disabled: globalState.setting.weather.enabled },
  { label: 'Setting', componentName: 'general', disabled: globalState.setting.general.isSetttingIconEnabled },
])

const onDragStart = (componentName: TComponents) => {
  console.log('onDragStart', componentName)
  currDragMaterielComponentName.value = componentName
}

const onDragEnd = () => {
  console.log('onDragEnd')
  currDragMaterielComponentName.value = ''
}

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
    changeElementEnabledStatus(currDragComponentName.value as TComponents, false)
  }
}

addKeyboardTask(CNAME, keyboardHandler)

const onToggleDrawer = () => {
  toggleIsElementDrawerVisible()
}
</script>

<style scoped>
.moveable-tool {
  z-index: 11;
  position: relative;
  top: 0;
  left: -250px;
  width: 250px;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  transition: all 0.3s ease;
  .tool__drawer {
    display: flex;
    flex-direction: column;
    align-items: center;
    .drawer__switch {
      position: absolute;
      top: 50vh;
      right: -20px;
      display: flex;
      justify-content: center;
      align-items: center;
      width: 20px;
      height: 80px;
      transform: translate(0, -50%);
      background-color: rgba(0, 0, 0, 0.5);
      border-top-right-radius: 5px;
      border-bottom-right-radius: 5px;
      cursor: pointer;
      .switch__icon {
        flex: 0 0 auto;
        font-size: 24px;
        transition: all 0.1s ease;
      }
      .switch__icon--active {
        transform: rotate(180deg);
      }
    }
    .drawer__content {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      .content__item {
        padding: 10px;
        text-align: center;
        cursor: pointer;
      }
    }
  }
}
.moveable-tool--active {
  left: 0 !important;
}
</style>
