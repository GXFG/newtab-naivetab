<template>
  <MoveableElement componentName="clockDigital" @onDrag="(style) => (containerStyle = style)">
    <div v-if="globalState.setting.clockDigital.enabled" id="digital-clock" data-cname="clockDigital">
      <div class="clockDigital__container" :style="containerStyle" :class="{ 'clockDigital__container--shadow': globalState.style.clockDigital.isShadowEnabled }">
        <div class="clock__time">
          <p class="time__text">
            {{ state.time }}
          </p>
          <span v-if="globalState.setting.clockDigital.unitEnabled" class="time__unit">{{ state.unit }}</span>
        </div>
      </div>
    </div>
  </MoveableElement>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { globalState, addTimerTask, removeTimerTask, getLayoutStyle, getStyleField } from '@/logic'

const CNAME = 'clockDigital'

const state = reactive({
  time: '',
  unit: '',
})

const updateTime = () => {
  state.time = dayjs().format(globalState.setting.clockDigital.format)
  state.unit = dayjs().format('a')
}

watch(
  () => globalState.setting.clockDigital.enabled,
  (value) => {
    if (value) {
      updateTime()
      addTimerTask(CNAME, updateTime)
    } else {
      removeTimerTask(CNAME)
    }
  },
  { immediate: true },
)

const containerStyle = ref(getLayoutStyle(CNAME))
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')
const customShadowColor = getStyleField(CNAME, 'shadowColor')
const customUnitFontSize = getStyleField(CNAME, 'unit.fontSize', 'px')
const customLetterSpacing = getStyleField(CNAME, 'letterSpacing', 'px')
</script>

<style scoped>
#digital-clock {
  font-family: v-bind(customFontFamily);
  color: v-bind(customFontColor);
  user-select: none;
  .clockDigital__container {
    z-index: 10;
    position: absolute;
    text-align: center;
    .clock__time {
      display: flex;
      justify-content: center;
      align-items: baseline;
      .time__text {
        font-size: v-bind(customFontSize);
        letter-spacing: v-bind(customLetterSpacing);
      }
      .time__unit {
        font-size: v-bind(customUnitFontSize);
      }
    }
  }
  .clockDigital__container--shadow {
    text-shadow: 2px 8px 6px v-bind(customShadowColor);
  }
}
</style>
