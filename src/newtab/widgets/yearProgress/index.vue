<script setup lang="ts">
import { isDragMode } from '@/logic/moveable'
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { currDayjsLang, localConfig, getIsWidgetRender, getLayoutStyle, getStyleField, getStyleConst } from '@/logic/store'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const isRender = getIsWidgetRender(WIDGET_CODE)

const state = reactive({
  totalDay: 0,
  passDay: 0,
  percent: '',
  date: '',
  tableList: [] as {
    dayNum: number
    date: string
  }[],
})

const startOfYear = dayjs().startOf('year')
const endOfYear = dayjs().endOf('year')

const calculateDay = () => {
  state.totalDay = endOfYear.diff(startOfYear, 'day') + 1
  state.passDay = dayjs().diff(startOfYear, 'day') + 1
  state.tableList = Array.from(Array(state.totalDay), (_, index) => {
    return {
      dayNum: index + 1,
      date: startOfYear.add(index, 'day').format('YYYY-MM-DD'),
    }
  })
}

const startYearTS = startOfYear.valueOf()
const endYearTS = endOfYear.valueOf()
const totalTS = endYearTS - startYearTS

const calculateProgress = () => {
  const currTS = dayjs().valueOf()
  const passTS = currTS - startYearTS
  state.percent = (passTS / totalTS * 100).toFixed(localConfig.yearProgress.percentageDecimal)
}

const updateDate = () => {
  state.date = dayjs().locale(currDayjsLang.value).format(localConfig.yearProgress.format)
}

const onRender = () => {
  calculateDay()
  calculateProgress()
  updateDate()
}

watch(
  [
    isRender,
    () => localConfig.yearProgress.isRealtime,
  ],
  () => {
    if (isRender && localConfig.yearProgress.isRealtime) {
      addTimerTask(WIDGET_CODE, onRender)
    } else {
      removeTimerTask(WIDGET_CODE)
    }
  },
  { immediate: true },
)

watch(
  () => localConfig.yearProgress.percentageDecimal,
  () => {
    calculateProgress()
  },
)

watch(
  [
    () => localConfig.yearProgress.format,
    currDayjsLang,
  ],
  () => {
    updateDate()
  },
)

onMounted(() => {
  onRender()
})

const dragStyle = ref('')

const containerStyle = getLayoutStyle(WIDGET_CODE)
const customPadding = getStyleField(WIDGET_CODE, 'padding', 'vmin')
const customWidth = getStyleField(WIDGET_CODE, 'width', 'vmin')
const customHeight = getStyleField(WIDGET_CODE, 'height', 'vmin')

const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'px')
const customSubFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'px', 0.9)

const customBorderRadius = getStyleField(WIDGET_CODE, 'borderRadius', 'vmin')
const customBorderWidth = getStyleField(WIDGET_CODE, 'borderWidth', 'px')
const customBorderColor = getStyleField(WIDGET_CODE, 'borderColor')
const customBackgroundColor = getStyleField(WIDGET_CODE, 'backgroundColor')
const customShadowColor = getStyleField(WIDGET_CODE, 'shadowColor')
const customBackgroundBlur = getStyleField(WIDGET_CODE, 'backgroundBlur', 'px')

const customTextActiveColor = getStyleField(WIDGET_CODE, 'textActiveColor')
const customTextLineHeight = getStyleField(WIDGET_CODE, 'textLineHeight')

const customBlockMargin = getStyleField(WIDGET_CODE, 'blockMargin', 'vmin')
const customBlockSize = getStyleField(WIDGET_CODE, 'blockSize', 'vmin')
const customBlockRadius = getStyleField(WIDGET_CODE, 'blockRadius', 'vmin')
const customBlockDefaultColor = getStyleField(WIDGET_CODE, 'blockDefaultColor')
const customBlockActiveColor = getStyleField(WIDGET_CODE, 'blockActiveColor')

const bgMoveableWidgetMain = getStyleConst('bgMoveableWidgetMain')
</script>

<template>
  <WidgetWrap
    v-model:dragStyle="dragStyle"
    widget-code="yearProgress"
  >
    <div
      v-if="isRender"
      id="yearProgress"
      data-target-type="widget"
      data-target-code="yearProgress"
    >
      <div
        class="yearProgress__container"
        :style="dragStyle || containerStyle"
        :class="{
          'yearProgress__container--drag': isDragMode,
          'yearProgress__container--shadow': localConfig.yearProgress.isShadowEnabled,
          'yearProgress__container--border': localConfig.yearProgress.isBorderEnabled,
        }"
      >
        <div class="progress__text">
          <p class="text__day">
            <span class="text__active">{{ state.passDay }}</span>
            <span class="text__blur"> / {{ state.totalDay }}</span>
          </p>
          <p
            v-if="localConfig.yearProgress.isPercentageEnabled"
            class="text__percent"
          >
            <span class="text__active">{{ state.percent }}</span>
            <span class="text__blur"> %</span>
          </p>
          <p
            v-if="localConfig.yearProgress.isDateEnabled"
            class="text__date"
          >
            <span class="text__blur">{{ state.date }}</span>
          </p>
        </div>

        <div class="progress__table">
          <div
            v-for="item in state.tableList"
            :key="item.dayNum"
            :title="`${item.dayNum} @ ${item.date}`"
            class="table__block"
            :class="{
              'table__block--active': item.dayNum <= state.passDay,
            }"
          />
        </div>
      </div>
    </div>
  </WidgetWrap>
</template>

<style>
#yearProgress {
  font-family: v-bind(customFontFamily);
  color: v-bind(customFontColor);
  font-size: v-bind(customFontSize);
  user-select: none;
  .yearProgress__container {
    z-index: 10;
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    width: v-bind(customWidth);
    height: v-bind(customHeight);
    border-radius: v-bind(customBorderRadius);
    background-color: v-bind(customBackgroundColor);
    backdrop-filter: blur(v-bind(customBackgroundBlur));
    .progress__text {
      flex: 0 0 auto;
      width: 30%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      line-height: v-bind(customTextLineHeight);
      .text__blur {
        opacity: 0.7;
      }
      .text__active {
        font-weight: 600;
        color: v-bind(customTextActiveColor);
      }
      .text__day {
      }
      .text__percent {
        font-size: v-bind(customSubFontSize);
      }
      .text__date {
        font-size: v-bind(customSubFontSize);
      }
    }

    .progress__table {
      flex: 1;
      padding: v-bind(customPadding);
      width: 70%;
      display: flex;
      flex-wrap: wrap;
      .table__block {
        margin: v-bind(customBlockMargin);
        width: v-bind(customBlockSize);
        height: v-bind(customBlockSize);
        border-radius: v-bind(customBlockRadius);
        background-color: v-bind(customBlockDefaultColor);
        &:hover {
          opacity: 0.6;
        }
      }
      .table__block--active {
        background-color: v-bind(customBlockActiveColor);
      }
    }
  }
  .yearProgress__container--drag {
    background-color: transparent !important;
    &:hover {
      background-color: v-bind(bgMoveableWidgetMain) !important;
    }
  }
  .yearProgress__container--border {
    border: v-bind(customBorderWidth) solid v-bind(customBorderColor);
  }
  .yearProgress__container--shadow {
    box-shadow:
      v-bind(customShadowColor) 0px 2px 4px 0px,
      v-bind(customShadowColor) 0px 2px 16px 0px;
  }
}
</style>
