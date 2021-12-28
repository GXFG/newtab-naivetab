<template>
  <Moveable componentName="clockDigital" @onDrag="(style) => (containerStyle = style)">
    <div v-if="globalState.setting.clockDigital.enabled" id="digital-clock" cname="clockDigital">
      <div class="clockDigital__container" :style="containerStyle" :class="{ 'clockDigital__container--shadow': globalState.style.clockDigital.isShadowEnabled }">
        <div class="clock__time">
          <p class="time__text">
            {{ state.time }}
          </p>
          <span v-if="globalState.setting.clockDigital.unitEnabled" class="time__unit">{{ state.unit }}</span>
        </div>
      </div>
    </div>
  </Moveable>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { globalState, addTimerTask, removeTimerTask, getLayoutStyle, formatNumWithPixl } from '@/logic'

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

const customFontSize = computed(() => formatNumWithPixl(CNAME, 'fontSize'))
const customUnitFontSize = computed(() => formatNumWithPixl(CNAME, 'unit', 'fontSize'))
const customLetterSpacing = computed(() => formatNumWithPixl(CNAME, 'letterSpacing'))
</script>

<style scoped>
#digital-clock {
  font-family: v-bind(globalState.style.clockDigital.fontFamily);
  color: v-bind(globalState.style.clockDigital.fontColor[globalState.localState.currThemeCode]);
  user-select: none;
  .clockDigital__container {
    position: fixed;
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
    text-shadow: 2px 8px 6px v-bind(globalState.style.clockDigital.shadowColor[globalState.localState.currThemeCode]);
  }
}
</style>
