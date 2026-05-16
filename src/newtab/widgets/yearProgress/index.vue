<script setup lang="ts">
import { isDragMode } from '@/logic/moveable'
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { localConfig } from '@/logic/config/state'
import { getIsWidgetRender, getStyleField } from '@/logic/store/style'
import { currDayjsLang } from '@/logic/store/theme'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const customPadding = getStyleField(WIDGET_CODE, 'padding', 'vmin')
const customWidth = getStyleField(WIDGET_CODE, 'width', 'vmin')
const customHeight = getStyleField(WIDGET_CODE, 'height', 'vmin')
const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customSubFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin', 0.9)
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

const ypStyle = computed(() => ({
  '--nt-yp-padding': customPadding.value,
  '--nt-yp-width': customWidth.value,
  '--nt-yp-height': customHeight.value,
  '--nt-yp-font-family': customFontFamily.value,
  '--nt-yp-font-color': customFontColor.value,
  '--nt-yp-font-size': customFontSize.value,
  '--nt-yp-sub-font-size': customSubFontSize.value,
  '--nt-yp-border-radius': customBorderRadius.value,
  '--nt-yp-border-width': customBorderWidth.value,
  '--nt-yp-border-color': customBorderColor.value,
  '--nt-yp-background-color': customBackgroundColor.value,
  '--nt-yp-shadow-color': customShadowColor.value,
  '--nt-yp-background-blur': customBackgroundBlur.value,
  '--nt-yp-text-active-color': customTextActiveColor.value,
  '--nt-yp-text-line-height': customTextLineHeight.value,
  '--nt-yp-block-margin': customBlockMargin.value,
  '--nt-yp-block-size': customBlockSize.value,
  '--nt-yp-block-radius': customBlockRadius.value,
  '--nt-yp-block-default-color': customBlockDefaultColor.value,
  '--nt-yp-block-active-color': customBlockActiveColor.value,
}))

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

/**
 * 获取当前年份的起止时间戳。
 * 使用 getter 而非模块级常量，避免页面跨年时数据过时。
 */
const getYearRange = () => {
  const start = dayjs().startOf('year')
  const end = dayjs().endOf('year')
  return { start, end }
}

/**
 * 初始化表格数据：构建全年 365/366 天的日期数组。
 * 一年内的数据不变，只需在 onMounted 时执行一次。
 */
const initTableData = () => {
  const { start, end } = getYearRange()
  state.totalDay = end.diff(start, 'day') + 1
  state.passDay = dayjs().diff(start, 'day') + 1
  state.tableList = Array.from(Array(state.totalDay), (_, index) => {
    return {
      dayNum: index + 1,
      date: start.add(index, 'day').format('YYYY-MM-DD'),
    }
  })
}

const calculateProgress = () => {
  const { start, end } = getYearRange()
  const totalTS = end.valueOf() - start.valueOf()
  const currTS = dayjs().valueOf()
  const passTS = currTS - start.valueOf()
  state.percent = ((passTS / totalTS) * 100).toFixed(
    localConfig.yearProgress.percentageDecimal,
  )
}

const updateDate = () => {
  state.date = dayjs()
    .locale(currDayjsLang.value)
    .format(localConfig.yearProgress.format)
}

/**
 * 每秒执行：只更新进度百分比和日期文本。
 * 表格数据由 initTableData 在 onMounted 时初始化一次，不在此重复构建。
 */
const onRender = () => {
  calculateProgress()
  updateDate()
}

watch(
  [isRender, () => localConfig.yearProgress.isRealtime],
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

watch([() => localConfig.yearProgress.format, currDayjsLang], () => {
  updateDate()
})

onMounted(() => {
  initTableData()
  onRender()
})
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="yearProgress__container"
      :style="ypStyle"
      :class="{
        'yearProgress__container--drag': isDragMode,
        'yearProgress__container--shadow':
          localConfig.yearProgress.isShadowEnabled,
        'yearProgress__container--border':
          localConfig.yearProgress.isBorderEnabled,
      }"
    >
      <div class="progress__text">
        <div class="text__day-wrap">
          <span class="text__active text__day-num">{{ state.passDay }}</span>
          <span class="text__blur text__day-total">
            / {{ state.totalDay }}</span
          >
        </div>
        <p
          v-if="localConfig.yearProgress.isPercentageEnabled"
          class="text__percent"
        >
          <span class="text__active">{{ state.percent }}</span>
          <span class="text__blur text__unit"> %</span>
        </p>
        <p
          v-if="localConfig.yearProgress.isDateEnabled"
          class="text__date"
        >
          <span class="text__blur">{{ state.date }}</span>
        </p>
      </div>

      <div class="progress__divider" />

      <div class="progress__table">
        <div
          v-for="item in state.tableList"
          :key="item.dayNum"
          :title="`${item.dayNum} @ ${item.date}`"
          class="table__block"
          :class="{
            'table__block--active': item.dayNum <= state.passDay,
            'table__block--current': item.dayNum === state.passDay,
          }"
        />
      </div>
    </div>
  </WidgetWrap>
</template>

<style>
#yearProgress {
  font-family: var(--nt-yp-font-family);
  color: var(--nt-yp-font-color);
  font-size: var(--nt-yp-font-size);
  user-select: none;
  .yearProgress__container {
    z-index: 10;
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: stretch;
    width: var(--nt-yp-width);
    height: var(--nt-yp-height);
    border-radius: var(--nt-yp-border-radius);
    background-color: var(--nt-yp-background-color);
    backdrop-filter: blur(var(--nt-yp-background-blur));
    overflow: hidden;
    will-change: transform;
    transform: translateZ(0);

    .progress__text {
      flex: 0 0 auto;
      width: 28%;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-end;
      padding-right: 10px;
      gap: 1px;
      font-size: var(--nt-yp-font-size);
      line-height: var(--nt-yp-text-line-height);

      .text__blur {
        opacity: 0.5;
      }
      .text__active {
        font-weight: 700;
        color: var(--nt-yp-text-active-color);
      }
      .text__day-wrap {
        display: flex;
        align-items: baseline;
        gap: 2px;
      }
      .text__day-num {
        font-size: var(--nt-yp-font-size);
      }
      .text__day-total {
        font-size: var(--nt-yp-sub-font-size);
      }
      .text__percent {
        display: flex;
        align-items: baseline;
        gap: 1px;
      }
      .text__unit {
        font-size: var(--nt-yp-sub-font-size);
      }
      .text__date {
        font-size: var(--nt-yp-sub-font-size);
      }
    }

    .progress__divider {
      flex: 0 0 1px;
      align-self: stretch;
      margin: 12% 0;
      background-color: var(--nt-yp-font-color);
      opacity: 0.12;
      border-radius: 1px;
    }

    .progress__table {
      flex: 1;
      padding: var(--nt-yp-padding);
      display: flex;
      flex-wrap: wrap;
      align-content: center;

      .table__block {
        margin: var(--nt-yp-block-margin);
        width: var(--nt-yp-block-size);
        height: var(--nt-yp-block-size);
        border-radius: var(--nt-yp-block-radius);
        background-color: var(--nt-yp-block-default-color);
        transition:
          opacity 0.15s ease,
          transform 0.15s ease;

        &:hover {
          transform: scale(1.2);
          box-shadow: 0 0 0 1.5px var(--nt-yp-block-active-color);
          opacity: 0.9;
        }
      }
      .table__block--active {
        background-color: var(--nt-yp-block-active-color);
      }
      .table__block--current {
        box-shadow: 0 0 0 1.5px var(--nt-yp-block-active-color);
        opacity: 0.9;
      }
    }
  }
  .yearProgress__container--drag {
    background-color: transparent !important;
    &:hover {
      background-color: var(--nt-bg-moveable-widget-main) !important;
    }
  }
  .yearProgress__container--border {
    border: var(--nt-yp-border-width) solid var(--nt-yp-border-color);
  }
  .yearProgress__container--shadow {
    box-shadow:
      var(--nt-yp-shadow-color) 0px 2px 4px 0px,
      var(--nt-yp-shadow-color) 0px 2px 16px 0px;
  }
}
</style>
