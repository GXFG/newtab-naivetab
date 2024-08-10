<script setup lang="ts">
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { currDayjsLang, localConfig, getIsComponentRender, getLayoutStyle, getStyleField } from '@/logic/store'
import MoveableComponentWrap from '@/newtab/components/moveable/MoveableComponentWrap.vue'

const CNAME = 'date'
const isRender = getIsComponentRender(CNAME)

const state = reactive({
  date: '',
})

const updateDate = () => {
  state.date = dayjs().locale(currDayjsLang.value).format(localConfig.date.format)
}

watch(
  isRender,
  (value) => {
    if (!value) {
      removeTimerTask(CNAME)
      return
    }
    addTimerTask(CNAME, updateDate)
  },
  { immediate: true },
)

const dragStyle = ref('')
const containerStyle = getLayoutStyle(CNAME)
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customFontSize = getStyleField(CNAME, 'fontSize', 'vmin')
const customShadowColor = getStyleField(CNAME, 'shadowColor')
const customLetterSpacing = getStyleField(CNAME, 'letterSpacing', 'vmin')
</script>

<template>
  <MoveableComponentWrap
    v-model:dragStyle="dragStyle"
    component-name="date"
  >
    <div
      v-if="isRender"
      id="date"
      data-target-type="1"
      data-target-name="date"
    >
      <div
        class="date__container"
        :style="dragStyle || containerStyle"
        :class="{ 'date__container--shadow': localConfig.date.isShadowEnabled }"
      >
        <p class="date__text">
          {{ state.date }}
        </p>
      </div>
    </div>
  </MoveableComponentWrap>
</template>

<style scoped>
#date {
  font-family: v-bind(customFontFamily);
  color: v-bind(customFontColor);
  user-select: none;
  .date__container {
    z-index: 10;
    position: absolute;
    .date__text {
      font-size: v-bind(customFontSize);
      letter-spacing: v-bind(customLetterSpacing);
      white-space: nowrap;
    }
  }
  .date__container--shadow {
    text-shadow: 2px 8px 6px v-bind(customShadowColor);
  }
}
</style>
