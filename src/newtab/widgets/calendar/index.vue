<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { Solar, Lunar, HolidayUtil } from 'lunar-typescript'
import { gaProxy } from '@/logic/gtag'
import { isDragMode } from '@/logic/moveable'
import { localConfig, getIsWidgetRender, getLayoutStyle, getStyleField, getStyleConst } from '@/logic/store'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const isRender = getIsWidgetRender(WIDGET_CODE)

const todayDayjs = dayjs()

const state = reactive({
  today: todayDayjs.format('YYYY-MM-DD'),
  currYear: todayDayjs.get('year'),
  currMonth: todayDayjs.get('month') + 1,
  currDay: todayDayjs.get('date'),
  yearList: Array.from(Array(101), (v, i) => ({ label: `${2000 + i}`, value: 2000 + i })),
  dateList: [] as {
    date: string // YYYY-MM-DD
    shortDate: string // MM.DD
    day: number // D
    desc: string // 节日
    type: number // 0不展示，1休，2班
    isToday: boolean
    isWeekend: boolean
    isFestival: boolean
    festivalCountdownDay: number
    isNotCurrMonth: boolean
  }[],
  currDetailDate: '',
})

const festivalList = computed(() =>
  state.dateList.filter((item) => {
    return item.isFestival && item.festivalCountdownDay >= 0
  }),
)

const monthsList = computed(() => [
  { label: window.$t('calendar.january'), value: 1 },
  { label: window.$t('calendar.february'), value: 2 },
  { label: window.$t('calendar.march'), value: 3 },
  { label: window.$t('calendar.april'), value: 4 },
  { label: window.$t('calendar.may'), value: 5 },
  { label: window.$t('calendar.june'), value: 6 },
  { label: window.$t('calendar.july'), value: 7 },
  { label: window.$t('calendar.august'), value: 8 },
  { label: window.$t('calendar.september'), value: 9 },
  { label: window.$t('calendar.october'), value: 10 },
  { label: window.$t('calendar.november'), value: 11 },
  { label: window.$t('calendar.december'), value: 12 },
])

const sundayOption = { label: window.$t('calendar.sunday'), value: 7 }

const weekList = computed(() => {
  const list = [
    { label: window.$t('calendar.monday'), value: 1 },
    { label: window.$t('calendar.tuesday'), value: 2 },
    { label: window.$t('calendar.wednesday'), value: 3 },
    { label: window.$t('calendar.thursday'), value: 4 },
    { label: window.$t('calendar.friday'), value: 5 },
    { label: window.$t('calendar.saturday'), value: 6 },
  ]
  if (localConfig.calendar.weekBeginsOn === 7) {
    list.unshift(sundayOption)
  } else if (localConfig.calendar.weekBeginsOn === 1) {
    list.push(sundayOption)
  }
  return list
})

const holidayTypeToDesc = computed(() => ({
  1: window.$t('calendar.rest'),
  2: window.$t('calendar.work'),
}))

/**
 * dateEle: dayjs widget
 */
const genDateList = (type: 'start' | 'main' | 'end', dateEle: typeof dayjs) => {
  const formatDate = dateEle.format('YYYY-MM-DD')
  const shortDate = dateEle.format('MM.DD')
  const targetDateEle = new Date(formatDate)
  const solarEle = Solar.fromDate(targetDateEle)
  const lunarEle = Lunar.fromDate(targetDateEle)
  const holidayEle = HolidayUtil.getHoliday(dateEle.get('year'), dateEle.get('month') + 1, dateEle.get('date'))

  // desc展示优先级：阴历节日, 阳历节日, 节气, 阴历月份, 阴历日期
  let desc = lunarEle.getFestivals()[0] || solarEle.getFestivals()[0] || lunarEle.getJieQi() || ''
  let isFestival = true
  let festivalCountdownDay = 0
  if (desc.length === 0) {
    isFestival = false
    desc = lunarEle.getDay() === 1 ? `${lunarEle.getMonthInChinese()}月` : lunarEle.getDayInChinese()
  } else {
    festivalCountdownDay = dateEle.diff(todayDayjs, 'day')
  }

  let dayType = 0
  if (holidayEle && holidayEle.isWork()) {
    dayType = 2
  } else if (holidayEle && holidayEle.getName()) {
    dayType = 1
  }

  const param = {
    date: formatDate,
    shortDate,
    day: dateEle.get('date'),
    desc,
    type: dayType,
    isToday: state.today === formatDate,
    isWeekend: [6, 0].includes(dateEle.get('day')),
    isFestival,
    festivalCountdownDay,
    isNotCurrMonth: type !== 'main',
  }
  if (type === 'start') {
    state.dateList.unshift(param)
  } else {
    state.dateList.push(param)
  }
}

const onRender = () => {
  state.dateList = []

  const currMonthFirstDate = `${state.currYear}-${state.currMonth}-01`
  let currMonthFirstDateWeek = dayjs(currMonthFirstDate).day()
  currMonthFirstDateWeek = currMonthFirstDateWeek === 0 ? 7 : currMonthFirstDateWeek // 1234567

  // padStart
  let padStartCount = currMonthFirstDateWeek - 1
  if (localConfig.calendar.weekBeginsOn === 7) {
    // begins on sunday
    padStartCount = currMonthFirstDateWeek === 7 ? 0 : currMonthFirstDateWeek
  }
  for (let index = 0; index < padStartCount; index += 1) {
    const dateEle = dayjs(currMonthFirstDate).subtract(index + 1, 'day')
    genDateList('start', dateEle)
  }

  const currMonthLastDate = dayjs(`${state.currYear}-${state.currMonth + 1}-01`)
    .subtract(1, 'day')
    .format('YYYY-MM-DD')
  const currMonthLastDay = dayjs(`${state.currYear}-${state.currMonth + 1}-01`)
    .subtract(1, 'day')
    .get('date')
  let currMonthLastDateWeek = dayjs(currMonthLastDate).day()
  currMonthLastDateWeek = currMonthLastDateWeek === 0 ? 7 : currMonthLastDateWeek
  // add main
  for (let index = 0; index < currMonthLastDay; index += 1) {
    const dateEle = dayjs(`${state.currYear}-${state.currMonth}-${index + 1}`)
    genDateList('main', dateEle)
  }

  // padEnd
  let padEndCount = 7 - currMonthLastDateWeek
  if (localConfig.calendar.weekBeginsOn === 7) {
    // begins on sunday
    padEndCount = currMonthLastDateWeek === 7 ? 6 : 6 - currMonthLastDateWeek
  }
  if (state.dateList.length + padEndCount === 35) {
    // 确保整体为6行
    padEndCount += 7
  }
  for (let index = 0; index < padEndCount; index += 1) {
    const dateEle = dayjs(currMonthLastDate).add(index + 1, 'day')
    genDateList('end', dateEle)
  }
}

onMounted(() => {
  onRender()
})

watch(
  () => localConfig.calendar.weekBeginsOn,
  () => {
    onRender()
  },
)

const onPrevMonth = () => {
  if (state.currMonth === 1) {
    state.currYear -= 1
    state.currMonth = 12
  } else {
    state.currMonth -= 1
  }
  onRender()
  gaProxy('click', ['calendar', 'prevMonth'])
}

const onNextMonth = () => {
  if (state.currMonth === 12) {
    state.currYear += 1
    state.currMonth = 1
  } else {
    state.currMonth += 1
  }
  onRender()
  gaProxy('click', ['calendar', 'nextMonth'])
}

const onDateChange = (type: 'year' | 'month') => {
  gaProxy('click', ['calendar', 'dateChange', type])
  onRender()
}

const isResetBtnVisible = computed(() => state.currYear !== todayDayjs.get('year') || state.currMonth !== todayDayjs.get('month') + 1)

const onReset = () => {
  state.currYear = todayDayjs.get('year')
  state.currMonth = todayDayjs.get('month') + 1
  state.currDay = todayDayjs.get('date')
  onRender()
  gaProxy('click', ['calendar', 'resetToady'])
}

const detailInfo = reactive({
  date: '',
  lunar: '',
  solarFestivals: '',
  lunarFestivals: '',
  xingzuo: '',
  yi: [] as string[],
  ji: [] as string[],
  jishen: [] as string[],
  xiongsha: [] as string[],
})

const onToggleDetailPopover = (date?: string) => {
  if (isDragMode.value) {
    return
  }
  if (!date) {
    state.currDetailDate = ''
    return
  }
  const targetDateEle = new Date(date)
  const lunarEle = Lunar.fromDate(targetDateEle)
  const solarEle = Solar.fromDate(targetDateEle)

  detailInfo.date = `${date} 周${lunarEle.getWeekInChinese()}`
  detailInfo.lunar = `${lunarEle.getYearInGanZhi()}${lunarEle.getYearShengXiao()}年 农历${lunarEle.getMonthInChinese()}月${lunarEle.getDayInChinese()}`
  detailInfo.solarFestivals = `${solarEle.getFestivals().join(' ')} ${solarEle.getOtherFestivals().join(' ')}`
  detailInfo.lunarFestivals = `${lunarEle.getFestivals().join(' ')} ${lunarEle.getOtherFestivals().join(' ')}`
  detailInfo.xingzuo = `${solarEle.getXingZuo()}座`
  detailInfo.yi = lunarEle.getDayYi()
  detailInfo.ji = lunarEle.getDayJi()
  detailInfo.jishen = lunarEle.getDayJiShen()
  detailInfo.xiongsha = lunarEle.getDayXiongSha()

  state.currDetailDate = date
  gaProxy('click', ['calendar', 'detail'])
}

const dragStyle = ref('')
const containerStyle = getLayoutStyle(WIDGET_CODE)
const customContainerWidth = getStyleField(WIDGET_CODE, 'width', 'vmin', 7.3)

const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customDayFontFamily = getStyleField(WIDGET_CODE, 'dayFontFamily')
const customDayFontSize = getStyleField(WIDGET_CODE, 'dayFontSize', 'vmin')
const customDayFontColor = getStyleField(WIDGET_CODE, 'dayFontColor')
const customDescFontFamily = getStyleField(WIDGET_CODE, 'descFontFamily')
const customDescFontSize = getStyleField(WIDGET_CODE, 'descFontSize', 'vmin')
const customDescFontColor = getStyleField(WIDGET_CODE, 'descFontColor')

const customHolidayFontColor = getStyleField(WIDGET_CODE, 'holidayFontColor')

const customBackgroundColor = getStyleField(WIDGET_CODE, 'backgroundColor')
const customBackgroundBlur = getStyleField(WIDGET_CODE, 'backgroundBlur', 'px')
const customBorderWidth = getStyleField(WIDGET_CODE, 'borderWidth', 'px')
const customBorderColor = getStyleField(WIDGET_CODE, 'borderColor')
const customShadowColor = getStyleField(WIDGET_CODE, 'shadowColor')
const customItemWidth = getStyleField(WIDGET_CODE, 'width', 'vmin')
const customBorderRadius = getStyleField(WIDGET_CODE, 'borderRadius', 'vmin')

const customTodayDayFontColor = getStyleField(WIDGET_CODE, 'todayDayFontColor')
const customTodayDescFontColor = getStyleField(WIDGET_CODE, 'todayDescFontColor')
const customTodayLabelBackgroundColor = getStyleField(WIDGET_CODE, 'todayLabelBackgroundColor')
const customTodayLabelFontColor = getStyleField(WIDGET_CODE, 'todayLabelFontColor')
const customTodayItemBackgroundColor = getStyleField(WIDGET_CODE, 'todayItemBackgroundColor')

const customRestDayFontColor = getStyleField(WIDGET_CODE, 'restDayFontColor')
const customRestDescFontColor = getStyleField(WIDGET_CODE, 'restDescFontColor')
const customRestLabelBackgroundColor = getStyleField(WIDGET_CODE, 'restLabelBackgroundColor')
const customRestLabelFontColor = getStyleField(WIDGET_CODE, 'restLabelFontColor')
const customRestItemBackgroundColor = getStyleField(WIDGET_CODE, 'restItemBackgroundColor')

const customWorkDayFontColor = getStyleField(WIDGET_CODE, 'workDayFontColor')
const customWorkDescFontColor = getStyleField(WIDGET_CODE, 'workDescFontColor')
const customWorkLabelBackgroundColor = getStyleField(WIDGET_CODE, 'workLabelBackgroundColor')
const customWorkLabelFontColor = getStyleField(WIDGET_CODE, 'workLabelFontColor')
const customWorkItemBackgroundColor = getStyleField(WIDGET_CODE, 'workItemBackgroundColor')

const customDestivalCountdownItemHeight = getStyleField(WIDGET_CODE, 'width', 'vmin', 1.4)
const customDestivalCountdownFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin', 0.95)
const customDestivalCountdownRestFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin', 0.65)

const bgMoveableWidgetMain = getStyleConst('bgMoveableWidgetMain')
</script>

<template>
  <WidgetWrap
    v-model:dragStyle="dragStyle"
    widget-code="calendar"
  >
    <div
      v-if="isRender"
      id="calendar"
      data-target-type="widget"
      data-target-code="calendar"
    >
      <div
        class="calendar__container"
        :style="dragStyle || containerStyle"
        :class="{
          'calendar__container--drag': isDragMode,
          'calendar__container--shadow': localConfig.calendar.isShadowEnabled,
          'calendar__container--border': localConfig.calendar.isBorderEnabled,
        }"
      >
        <div class="calendar__options">
          <div class="options__item">
            <NSelect
              v-model:value="state.currYear"
              class="item__select_year"
              size="small"
              :options="state.yearList"
              :disabled="isDragMode"
              @update:value="onDateChange('year')"
            />
          </div>
          <div class="options__item">
            <NButton
              class="item__btn"
              text
              :disabled="isDragMode"
              :style="isDragMode ? 'cursor: move;' : ''"
              @click="onPrevMonth()"
            >
              <Icon
                :icon="ICONS.angleLeft"
                class="btn__icon"
              />
            </NButton>
            <NSelect
              v-model:value="state.currMonth"
              class="item__select_month"
              size="small"
              :options="monthsList"
              :disabled="isDragMode"
              @update:value="onDateChange('month')"
            />
            <NButton
              class="item__btn"
              text
              :disabled="isDragMode"
              :style="isDragMode ? 'cursor: move;' : ''"
              @click="onNextMonth()"
            >
              <Icon
                :icon="ICONS.angleRight"
                class="btn__icon"
              />
            </NButton>
          </div>
          <div class="options__item options__reset">
            <NButton
              v-show="isResetBtnVisible"
              class="item__btn"
              text
              :disabled="isDragMode"
              :style="isDragMode ? 'cursor: move;' : ''"
              @click="onReset()"
            >
              <Icon
                :icon="ICONS.arrowBackward"
                class="btn__icon"
              />
            </NButton>
          </div>
        </div>

        <!-- header -->
        <ul class="calendar__header">
          <li
            v-for="item in weekList"
            :key="item.value"
            class="header__item"
            :class="{ 'header__item--weekend': [6, 7].includes(item.value) }"
          >
            {{ item.label }}
          </li>
        </ul>

        <!-- body -->
        <ul
          class="calendar__body"
          :class="{
            'calendar__body--hover': !isDragMode,
          }"
        >
          <li
            v-for="item in state.dateList"
            :key="item.date"
            @click="onToggleDetailPopover(item.date)"
          >
            <NPopover
              style="max-width: 350px"
              display-directive="if"
              :show="state.currDetailDate === item.date"
              :title="item.date"
              trigger="manual"
              @clickoutside="onToggleDetailPopover()"
            >
              <template #trigger>
                <div
                  class="body__item"
                  :class="{
                    'body__item--hover': !isDragMode,
                    'body__item--blur': item.isNotCurrMonth,
                    'body__item--weekend': item.isWeekend,
                    'body__item--today': item.isToday,
                    'body__item--rest': item.type === 1,
                    'body__item--work': item.type === 2,
                  }"
                >
                  <span
                    v-if="item.type"
                    class="item__label"
                  >{{ holidayTypeToDesc[item.type as 1 | 2] }}</span>
                  <span
                    v-if="item.isToday"
                    class="item__label item__label--today"
                  >{{ $t('calendar.today') }}</span>
                  <!-- 日期 -->
                  <span class="item__day">{{ item.day }}</span>
                  <!-- 描述 -->
                  <span
                    class="item__desc"
                    :class="{
                      'item__desc--highlight': item.isFestival,
                    }"
                  >{{ item.desc }}</span>
                </div>
              </template>

              <!-- detail -->
              <div class="calendar__detail">
                <p class="detail__date">
                  {{ detailInfo.date }}
                  {{ detailInfo.xingzuo }}
                </p>
                <p class="detail__date">
                  {{ detailInfo.lunar }}
                </p>
                <p class="detail__festival">
                  {{ `${detailInfo.lunarFestivals} ${detailInfo.solarFestivals}` }}
                </p>
                <div class="detail__row">
                  <p class="row__tag row__tag--yi">易</p>
                  <div class="row__value">
                    <n-tag
                      v-for="yiItem in detailInfo.yi"
                      :key="yiItem"
                      class="tag__item"
                      type="success"
                      size="small"
                      :bordered="false"
                    >
                      {{ yiItem }}
                    </n-tag>
                  </div>
                </div>
                <div class="detail__row">
                  <p class="row__tag row__tag--ji">忌</p>
                  <div class="row__value">
                    <n-tag
                      v-for="yiItem in detailInfo.ji"
                      :key="yiItem"
                      class="tag__item"
                      type="error"
                      size="small"
                      :bordered="false"
                    >
                      {{ yiItem }}
                    </n-tag>
                  </div>
                </div>
                <div class="detail__row">
                  <p class="row__label">吉神</p>
                  <div class="row__value">
                    <n-tag
                      v-for="yiItem in detailInfo.jishen"
                      :key="yiItem"
                      class="tag__item"
                      type="info"
                      size="small"
                      :bordered="false"
                    >
                      {{ yiItem }}
                    </n-tag>
                  </div>
                </div>
                <div class="detail__row">
                  <p class="row__label">凶煞</p>
                  <div class="row__value">
                    <n-tag
                      v-for="yiItem in detailInfo.xiongsha"
                      :key="yiItem"
                      class="tag__item"
                      size="small"
                      :bordered="false"
                    >
                      {{ yiItem }}
                    </n-tag>
                  </div>
                </div>
              </div>
            </NPopover>
          </li>
        </ul>

        <div
          v-if="localConfig.calendar.festivalCountdown"
          class="calendar__festival__list"
        >
          <div
            v-for="item in festivalList"
            :key="item.date"
            :title="`${item.shortDate} ${item.desc} ${item.festivalCountdownDay}${$t('common.day')}`"
            class="festival__item"
          >
            <div class="item__left">
              <p class="left__date">{{ item.shortDate }}</p>
              <p
                v-if="item.type === 1"
                class="left__rest"
              >
                {{ $t('calendar.rest') }}
              </p>
              <p class="left__desc">
                {{ item.desc }}
              </p>
            </div>

            <div class="item__right">
              <p class="right__count">{{ item.festivalCountdownDay }}</p>
              <p class="right__unit">{{ $t('common.day') }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </WidgetWrap>
</template>

<style>
#calendar {
  color: v-bind(customFontColor);
  font-size: v-bind(customFontSize);
  font-family: v-bind(customFontFamily);
  .calendar__container {
    z-index: 10;
    position: absolute;
    width: v-bind(customContainerWidth);
    text-align: center;
    border-radius: v-bind(customBorderRadius);
    background-color: v-bind(customBackgroundColor);
    backdrop-filter: blur(v-bind(customBackgroundBlur));
    user-select: none;
    overflow: hidden;
    .calendar__options {
      padding: 1.5%;
      display: flex;
      justify-content: space-around;
      align-items: center;
      .n-base-selection-label {
        background-color: rgba(255, 255, 255, 0.1) !important;
      }
      .options__item {
        display: flex;
        justify-content: center;
        align-items: center;
        .item__btn {
          display: flex;
          justify-content: center;
          align-items: center;
          margin: 0 0.8vmin;
          cursor: pointer;
          .btn__icon {
            font-size: v-bind(customFontSize);
          }
        }
        .n-base-selection-input__content {
          color: v-bind(customFontColor) !important;
          font-size: v-bind(customFontSize) !important;
        }
        .item__select_year {
          width: 80px;
        }
        .item__select_month {
          flex: 0 0 auto;
          width: 95px;
        }
      }
      .options__reset {
        flex: 0 0 auto;
        width: 0.8vmin;
      }
    }
    .calendar__header {
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      font-weight: 500;
      .header__item {
        flex: 1;
        height: 30px;
        line-height: 30px;
        text-align: center;
      }
      .header__item--weekend {
        color: v-bind(customHolidayFontColor);
      }
    }
    .calendar__body {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      .body__item {
        position: relative;
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
        width: v-bind(customItemWidth);
        height: v-bind(customItemWidth);
        text-align: center;
        overflow: hidden;
        .item__day {
          color: v-bind(customDayFontColor);
          font-size: v-bind(customDayFontSize);
          font-family: v-bind(customDayFontFamily);
          font-weight: 500;
        }
        .item__desc {
          margin-top: 0.2vmin;
          color: v-bind(customDescFontColor);
          font-size: v-bind(customDescFontSize);
          font-family: v-bind(customDescFontFamily);
          overflow: hidden;
          white-space: nowrap;
        }
        .item__desc--highlight {
          color: v-bind(customHolidayFontColor) !important;
        }
        .item__label {
          position: absolute;
          top: -7%;
          left: -7%;
          padding: 7%;
          font-size: v-bind(customFontSize);
          transform: scale(0.8);
          border-radius: 4px;
        }
      }
      .body__item--hover:hover {
        opacity: 0.5;
        transition: all 200ms ease-in-out;
      }
      .body__item--work {
        background-color: v-bind(customWorkItemBackgroundColor);
        .item__label {
          color: v-bind(customWorkLabelFontColor);
          background-color: v-bind(customWorkLabelBackgroundColor);
        }
        .item__day {
          color: v-bind(customWorkDayFontColor);
        }
        .item__desc {
          color: v-bind(customWorkDescFontColor);
        }
      }
      .body__item--rest {
        background-color: v-bind(customRestItemBackgroundColor);
        .item__label {
          color: v-bind(customRestLabelFontColor);
          background-color: v-bind(customRestLabelBackgroundColor);
        }
        .item__day {
          color: v-bind(customRestDayFontColor);
        }
        .item__desc {
          color: v-bind(customRestDescFontColor);
        }
      }
      .body__item--weekend {
        color: v-bind(customHolidayFontColor);
      }
      .body__item--today {
        border-radius: 4px;
        background-color: v-bind(customTodayItemBackgroundColor);
        .item__label--today {
          left: auto !important;
          right: -7% !important;
          color: v-bind(customTodayLabelFontColor);
          background-color: v-bind(customTodayLabelBackgroundColor);
        }
        .item__day {
          color: v-bind(customTodayDayFontColor);
        }
        .item__desc {
          color: v-bind(customTodayDescFontColor);
        }
      }
      .body__item--blur {
        opacity: 0.4;
      }
    }
    .calendar__body--hover {
      cursor: pointer;
    }
  }
  .calendar__container--border {
    outline: v-bind(customBorderWidth) solid v-bind(customBorderColor);
  }
  .calendar__container--shadow {
    box-shadow:
      v-bind(customShadowColor) 0px 2px 4px 0px,
      v-bind(customShadowColor) 0px 2px 16px 0px;
  }
  .calendar__container--drag {
    background-color: transparent !important;
    &:hover {
      background-color: v-bind(bgMoveableWidgetMain) !important;
    }
  }
}

.calendar__detail {
  line-height: 1.6;
  .detail__date {
    text-align: center;
  }
  .detail__festival {
    color: rgba(250, 82, 82, 1);
    text-align: center;
    font-weight: 600;
  }
  .detail__row {
    display: flex;
    margin: 5px 0;
    .row__tag {
      flex: 0 0 auto;
      margin: 3px 10px;
      width: 20px;
      height: 20px;
      line-height: 20px;
      text-align: center;
      color: #fff;
      border-radius: 50%;
    }
    .row__tag--yi {
      background-color: rgb(0, 128, 0);
    }
    .row__tag--ji {
      background-color: rgba(250, 82, 82, 1);
    }
    .row__label {
      flex: 0 0 auto;
      padding-top: 2px;
      width: 40px;
      font-weight: bold;
      text-align: center;
    }
    .row__value {
      .tag__item {
        margin: 2px 3px;
      }
      .n-tag {
        border-radius: 5px;
      }
    }
  }
}

.calendar__festival__list {
  padding: 1.5% 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  max-height: v-bind(customDestivalCountdownItemHeight);
  overflow-y: auto;
  -ms-overflow-style: none;
  scrollbar-width: none;
  .festival__item {
    padding: 0.2% 3.5%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 50%;
    font-size: v-bind(customDestivalCountdownFontSize);
    .item__left {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      width: 70%;
      .left__date {
        margin-right: 3px;
        flex: 0 0 auto;
        opacity: 0.8;
      }
      .left__rest {
        margin-right: 2px;
        padding: 2%;
        flex: 0 0 auto;
        color: v-bind(customRestLabelFontColor);
        background-color: v-bind(customRestLabelBackgroundColor);
        font-size: v-bind(customDestivalCountdownRestFontSize);
        border-radius: 4px;
        box-sizing: border-box;
      }
      .left__desc {
        flex: 1;
        width: 100%;
        text-align: start;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
      }
    }
    .item__right {
      flex: 0 0 auto;
      display: flex;
      justify-content: flex-end;
      align-items: baseline;
      width: 30%;
      .right__count {
        font-size: v-bind(customDayFontSize);
        font-family: v-bind(customDayFontFamily);
        font-weight: 500;
      }
      .right__unit {
        margin-left: 2px;
        font-size: v-bind(customDescFontSize);
        font-family: v-bind(customDescFontFamily);
        opacity: 0.8;
      }
    }
  }
}
</style>
