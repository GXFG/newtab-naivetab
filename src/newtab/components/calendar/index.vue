<script setup lang="ts">
import { Solar, Lunar, HolidayUtil } from 'lunar-typescript'
import { isDragMode, localConfig, getIsComponentRender, getLayoutStyle, getStyleField } from '@/logic'

const CNAME = 'calendar'
const isRender = getIsComponentRender(CNAME)

const state = reactive({
  today: dayjs().format('YYYY-MM-DD'),
  currYear: dayjs().get('year'),
  currMonth: dayjs().get('month') + 1,
  currDay: dayjs().get('date'),
  yearList: Array.from(Array(101), (v, i) => ({ label: `${2000 + i}`, value: 2000 + i })),
  dateList: [] as {
    date: string // YYYY-MM-DD
    day: number // D
    desc: string // 节日
    type: number // 0不展示，1休，2班
    isToday: boolean
    isWeekend: boolean
    isFestival: boolean
    isNotCurrMonth: boolean
  }[],
  currDetailDate: '',
})

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
 * dateEle: dayjs element
 */
const genDateList = (type: 'start' | 'main' | 'end', dateEle: typeof dayjs) => {
  const formatDate = dateEle.format('YYYY-MM-DD')
  const targetDateEle = new Date(formatDate)
  const solarEle = Solar.fromDate(targetDateEle)
  const lunarEle = Lunar.fromDate(targetDateEle)
  const holidayEle = HolidayUtil.getHoliday(dateEle.get('year'), dateEle.get('month') + 1, dateEle.get('date'))

  // desc优先级：阳历节日, 阴历节日, 节气, 阴历月份, 阴历日期
  let desc = solarEle.getFestivals()[0] || lunarEle.getFestivals()[0] || lunarEle.getJieQi() || ''
  let isFestival = true
  if (desc.length === 0) {
    isFestival = false
    desc = lunarEle.getDay() === 1 ? `${lunarEle.getMonthInChinese()}月` : lunarEle.getDayInChinese()
  }

  let dayType = 0
  if (holidayEle && holidayEle.isWork()) {
    dayType = 2
  } else if (holidayEle && holidayEle.getName()) {
    dayType = 1
  }

  const param = {
    date: formatDate,
    day: dateEle.get('date'),
    desc,
    type: dayType,
    isToday: state.today === formatDate,
    isWeekend: [6, 0].includes(dateEle.get('day')),
    isFestival,
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
}

const onNextMonth = () => {
  if (state.currMonth === 12) {
    state.currYear += 1
    state.currMonth = 1
  } else {
    state.currMonth += 1
  }
  onRender()
}

const onDateChange = () => {
  onRender()
}

const isResetBtnVisible = computed(() => state.currYear !== dayjs().get('year') || state.currMonth !== dayjs().get('month') + 1)

const onReset = () => {
  state.currYear = dayjs().get('year')
  state.currMonth = dayjs().get('month') + 1
  state.currDay = dayjs().get('date')
  onRender()
}

const detailInfo = reactive({
  date: '',
  lunar: '',
  solarFestivals: '',
  lunarFestivals: '',
  xingzuo: '',
  yi: '',
  ji: '',
  jishen: '',
  xiongsha: '',
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
  detailInfo.yi = lunarEle.getDayYi().join(' ')
  detailInfo.ji = lunarEle.getDayJi().join(' ')
  detailInfo.jishen = lunarEle.getDayJiShen().join(' ')
  detailInfo.xiongsha = lunarEle.getDayXiongSha().join(' ')

  state.currDetailDate = date
}

const dragStyle = ref('')
const containerStyle = getLayoutStyle(CNAME)
const customContainerWidth = getStyleField(CNAME, 'width', 'vmin', 7.4)
const customFontSize = getStyleField(CNAME, 'fontSize', 'vmin')
const customFontFamily = getStyleField(CNAME, 'fontFamily')
const customFontColor = getStyleField(CNAME, 'fontColor')
const customBackgroundColor = getStyleField(CNAME, 'backgroundColor')
const customBorderWidth = getStyleField(CNAME, 'borderWidth', 'px')
const customBorderColor = getStyleField(CNAME, 'borderColor')
const customShadowColor = getStyleField(CNAME, 'shadowColor')
const customItemWidth = getStyleField(CNAME, 'width', 'vmin')
const customBorderRadius = getStyleField(CNAME, 'borderRadius', 'vmin')
const customItemBackgroundActiveColor = getStyleField(CNAME, 'backgroundActiveColor')

const customHolidayFontColor = getStyleField(CNAME, 'holidayFontColor')
const customRestItemBackgroundColor = getStyleField(CNAME, 'restItemBackgroundColor')
const customWorkItemBackgroundColor = getStyleField(CNAME, 'workItemBackgroundColor')
const customRestLabelBackgroundColor = getStyleField(CNAME, 'restLabelBackgroundColor')
const customWorkLabelBackgroundColor = getStyleField(CNAME, 'workLabelBackgroundColor')
const customRestLabelFontColor = getStyleField(CNAME, 'restLabelFontColor')
const customWorkLabelFontColor = getStyleField(CNAME, 'workLabelFontColor')
</script>

<template>
  <MoveableComponentWrap v-model:dragStyle="dragStyle" componentName="calendar">
    <div v-if="isRender" id="calendar" data-target-type="1" data-target-name="calendar">
      <div
        class="calendar__container"
        :style="dragStyle || containerStyle"
        :class="{
          'calendar__container-shadow': localConfig.calendar.isShadowEnabled,
          'calendar__container-border': localConfig.calendar.isBorderEnabled,
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
              @update:value="onDateChange()"
            />
          </div>
          <div class="options__item">
            <NButton class="item__btn" text :disabled="isDragMode" :style="isDragMode ? 'cursor: move;' : ''" @click="onPrevMonth()">
              <fa-solid:angle-left class="btn__icon" />
            </NButton>
            <NSelect
              v-model:value="state.currMonth"
              class="item__select_month"
              size="small"
              :options="monthsList"
              :disabled="isDragMode"
              @update:value="onDateChange()"
            />
            <NButton class="item__btn" text :disabled="isDragMode" :style="isDragMode ? 'cursor: move;' : ''" @click="onNextMonth()">
              <fa-solid:angle-right class="btn__icon" />
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
              <si-glyph:arrow-backward class="btn__icon" />
            </NButton>
          </div>
        </div>
        <!-- header -->
        <ul class="calendar__header">
          <li v-for="item in weekList" :key="item.value" class="header__item" :class="{ 'header__item--weekend': [6, 7].includes(item.value) }">
            {{ item.label }}
          </li>
        </ul>
        <!-- body -->
        <ul class="calendar__body">
          <li v-for="item in state.dateList" :key="item.date" @click="onToggleDetailPopover(item.date)">
            <NPopover
              style="max-width: 300px"
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
                    'body__item--active': item.isToday,
                    'body__item--blur': item.isNotCurrMonth,
                    'body__item--weekend': item.isWeekend,
                    'body__item--rest': item.type === 1,
                    'body__item--work': item.type === 2,
                  }"
                >
                  <span
                    v-if="item.type"
                    class="item__label"
                    :class="{
                      'item__label--rest': item.type === 1,
                      'item__label--work': item.type === 2,
                    }"
                  >{{ holidayTypeToDesc[item.type as 1 | 2] }}</span>
                  <span v-if="item.isToday" class="item__today">{{ $t('calendar.today') }}</span>
                  <span class="item__day">{{ item.day }}</span>
                  <span class="item__desc" :class="{ 'item__desc--highlight': item.isFestival }">{{ item.desc }}</span>
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
                  {{ `${detailInfo.solarFestivals} ${detailInfo.lunarFestivals}` }}
                </p>
                <div class="detail__row">
                  <p class="row__tag row__tag--yi">
                    易
                  </p>
                  <p class="row__value">
                    {{ detailInfo.yi }}
                  </p>
                </div>
                <div class="detail__row">
                  <p class="row__tag row__tag--ji">
                    忌
                  </p>
                  <p class="row__value">
                    {{ detailInfo.ji }}
                  </p>
                </div>
                <div class="detail__row">
                  <p class="row__label">
                    吉神
                  </p>
                  <p class="row__value">
                    {{ detailInfo.jishen }}
                  </p>
                </div>
                <div class="detail__row">
                  <p class="row__label">
                    凶煞
                  </p>
                  <p class="row__value">
                    {{ detailInfo.xiongsha }}
                  </p>
                </div>
              </div>
            </NPopover>
          </li>
        </ul>
      </div>
    </div>
  </MoveableComponentWrap>
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
        margin: 0.1vmin;
        width: v-bind(customItemWidth);
        height: v-bind(customItemWidth);
        text-align: center;
        border-radius: v-bind(customBorderRadius);
        border: 1px solid rgba(0, 0, 0, 0);
        overflow: hidden;
        cursor: pointer;
        .item__day {
        }
        .item__desc {
          margin-top: 0.2vmin;
          color: v-bind(customFontColor);
          font-size: v-bind(customFontSize);
          transform: scale(0.8);
          overflow: hidden;
          white-space: nowrap;
        }
        .item__desc--highlight {
          color: v-bind(customHolidayFontColor);
        }
        .item__today {
          position: absolute;
          top: -7%;
          right: -7%;
          padding: 7%;
          color: v-bind(customFontColor);
          font-size: v-bind(customFontSize);
          transform: scale(0.8);
        }
        .item__label {
          position: absolute;
          top: -7%;
          left: -7%;
          padding: 7%;
          font-size: v-bind(customFontSize);
          transform: scale(0.8);
        }
        .item__label--work {
          color: v-bind(customWorkLabelFontColor);
          background-color: v-bind(customWorkLabelBackgroundColor);
        }
        .item__label--rest {
          color: v-bind(customRestLabelFontColor);
          background-color: v-bind(customRestLabelBackgroundColor);
        }
      }
      .body__item--hover:hover {
        border: 1px solid v-bind(customItemBackgroundActiveColor);
      }
      .body__item--work {
        color: v-bind(customHolidayFontColor) !important;
        background-color: v-bind(customWorkItemBackgroundColor);
      }
      .body__item--rest {
        color: v-bind(customFontColor) !important;
        background-color: v-bind(customRestItemBackgroundColor);
      }
      .body__item--weekend {
        color: v-bind(customHolidayFontColor);
      }
      .body__item--active {
        background-color: v-bind(customItemBackgroundActiveColor);
      }
      .body__item--blur {
        opacity: 0.4;
      }
    }
  }
  .calendar__container-border {
    outline: v-bind(customBorderWidth) solid v-bind(customBorderColor);
  }
  .calendar__container-shadow {
    box-shadow: v-bind(customShadowColor) 0px 2px 4px 0px, v-bind(customShadowColor) 0px 2px 16px 0px;
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
    .row__tag {
      flex: 0 0 auto;
      margin: 0 10px;
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
      width: 40px;
      font-weight: bold;
      text-align: center;
    }
    .row__value {
    }
  }
}
</style>
