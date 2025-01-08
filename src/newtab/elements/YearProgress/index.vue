<script setup lang="ts">
import { isDragMode } from '@/logic/moveable'
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { currDayjsLang, localConfig, getIsComponentRender, getLayoutStyle, getStyleField, getStyleConst } from '@/logic/store'
import MoveableComponentWrap from '@/newtab/components/moveable/MoveableComponentWrap.vue'

const CNAME = 'yearProgress'
const isRender = getIsComponentRender(CNAME)

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
      addTimerTask(CNAME, onRender)
    } else {
      removeTimerTask(CNAME)
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

const containerStyle = getLayoutStyle(CNAME)
const customPadding = getStyleField(CNAME, 'padding', 'vmin')
const customWidth = getStyleField(CNAME, 'width', 'vmin')
const customHeight = getStyleField(CNAME, 'height', 'vmin')

const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customFontSize = getStyleField(CNAME, 'fontSize', 'px')
const customSubFontSize = getStyleField(CNAME, 'fontSize', 'px', 0.9)

const customBorderRadius = getStyleField(CNAME, 'borderRadius', 'vmin')
const customBorderWidth = getStyleField(CNAME, 'borderWidth', 'px')
const customBorderColor = getStyleField(CNAME, 'borderColor')
const customBackgroundColor = getStyleField(CNAME, 'backgroundColor')
const customShadowColor = getStyleField(CNAME, 'shadowColor')

const customTextActiveColor = getStyleField(CNAME, 'textActiveColor')
const customTextLineHeight = getStyleField(CNAME, 'textLineHeight')

const customBlockMargin = getStyleField(CNAME, 'blockMargin', 'vmin')
const customBlockSize = getStyleField(CNAME, 'blockSize', 'vmin')
const customBlockRadius = getStyleField(CNAME, 'blockRadius', 'vmin')
const customBlockDefaultColor = getStyleField(CNAME, 'blockDefaultColor')
const customBlockActiveColor = getStyleField(CNAME, 'blockActiveColor')

const bgMoveableComponentMain = getStyleConst('bgMoveableComponentMain')
</script>

<template>
  <MoveableComponentWrap
    v-model:dragStyle="dragStyle"
    component-name="yearProgress"
  >
    <div
      v-if="isRender"
      id="yearProgress"
      data-target-type="1"
      data-target-name="yearProgress"
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
  </MoveableComponentWrap>
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
      background-color: v-bind(bgMoveableComponentMain) !important;
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
