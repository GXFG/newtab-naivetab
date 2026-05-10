<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { Solar, Lunar, HolidayUtil } from 'lunar-typescript'
import { gaProxy } from '@/logic/gtag'
import { isDragMode } from '@/logic/moveable'
import { localConfig, getStyleField } from '@/logic/store'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

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
const customBodyWrapHeight = getStyleField(WIDGET_CODE, 'width', 'vmin', 6)
const customBorderRadius = getStyleField(WIDGET_CODE, 'borderRadius', 'vmin')
const customTodayDayFontColor = getStyleField(WIDGET_CODE, 'todayDayFontColor')
const customTodayDescFontColor = getStyleField(
  WIDGET_CODE,
  'todayDescFontColor',
)
const customTodayLabelBackgroundColor = getStyleField(
  WIDGET_CODE,
  'todayLabelBackgroundColor',
)
const customTodayLabelFontColor = getStyleField(
  WIDGET_CODE,
  'todayLabelFontColor',
)
const customTodayItemBackgroundColor = getStyleField(
  WIDGET_CODE,
  'todayItemBackgroundColor',
)
const customRestDayFontColor = getStyleField(WIDGET_CODE, 'restDayFontColor')
const customRestDescFontColor = getStyleField(WIDGET_CODE, 'restDescFontColor')
const customRestLabelBackgroundColor = getStyleField(
  WIDGET_CODE,
  'restLabelBackgroundColor',
)
const customRestLabelFontColor = getStyleField(
  WIDGET_CODE,
  'restLabelFontColor',
)
const customRestItemBackgroundColor = getStyleField(
  WIDGET_CODE,
  'restItemBackgroundColor',
)
const customWorkDayFontColor = getStyleField(WIDGET_CODE, 'workDayFontColor')
const customWorkDescFontColor = getStyleField(WIDGET_CODE, 'workDescFontColor')
const customWorkLabelBackgroundColor = getStyleField(
  WIDGET_CODE,
  'workLabelBackgroundColor',
)
const customWorkLabelFontColor = getStyleField(
  WIDGET_CODE,
  'workLabelFontColor',
)
const customWorkItemBackgroundColor = getStyleField(
  WIDGET_CODE,
  'workItemBackgroundColor',
)
const customDestivalCountdownItemHeight = getStyleField(
  WIDGET_CODE,
  'width',
  'vmin',
  1.4,
)
const customDestivalCountdownFontSize = getStyleField(
  WIDGET_CODE,
  'fontSize',
  'vmin',
  0.95,
)
const customDestivalCountdownRestFontSize = getStyleField(
  WIDGET_CODE,
  'fontSize',
  'vmin',
  0.65,
)
const calendarStyle = computed(() => ({
  '--nt-cal-customFontColor': customFontColor.value,
  '--nt-cal-customFontSize': customFontSize.value,
  '--nt-cal-customFontFamily': customFontFamily.value,
  '--nt-cal-customContainerWidth': customContainerWidth.value,
  '--nt-cal-customBorderRadius': customBorderRadius.value,
  '--nt-cal-customBackgroundColor': customBackgroundColor.value,
  '--nt-cal-customBackgroundBlur': customBackgroundBlur.value,
  '--nt-cal-customFontSize_btn': customFontSize.value,
  '--nt-cal-customFontColor_btn': customFontColor.value,
  '--nt-cal-customHolidayFontColor': customHolidayFontColor.value,
  '--nt-cal-customBodyWrapHeight': customBodyWrapHeight.value,
  '--nt-cal-customItemWidth': customItemWidth.value,
  '--nt-cal-customDayFontColor': customDayFontColor.value,
  '--nt-cal-customDayFontSize': customDayFontSize.value,
  '--nt-cal-customDayFontFamily': customDayFontFamily.value,
  '--nt-cal-customDescFontColor': customDescFontColor.value,
  '--nt-cal-customDescFontSize': customDescFontSize.value,
  '--nt-cal-customDescFontFamily': customDescFontFamily.value,
  '--nt-cal-customWorkItemBackgroundColor': customWorkItemBackgroundColor.value,
  '--nt-cal-customWorkLabelFontColor': customWorkLabelFontColor.value,
  '--nt-cal-customWorkLabelBackgroundColor':
    customWorkLabelBackgroundColor.value,
  '--nt-cal-customWorkDayFontColor': customWorkDayFontColor.value,
  '--nt-cal-customWorkDescFontColor': customWorkDescFontColor.value,
  '--nt-cal-customRestItemBackgroundColor': customRestItemBackgroundColor.value,
  '--nt-cal-customRestLabelFontColor': customRestLabelFontColor.value,
  '--nt-cal-customRestLabelBackgroundColor':
    customRestLabelBackgroundColor.value,
  '--nt-cal-customRestDayFontColor': customRestDayFontColor.value,
  '--nt-cal-customRestDescFontColor': customRestDescFontColor.value,
  '--nt-cal-customTodayItemBackgroundColor':
    customTodayItemBackgroundColor.value,
  '--nt-cal-customTodayLabelFontColor': customTodayLabelFontColor.value,
  '--nt-cal-customTodayLabelBackgroundColor':
    customTodayLabelBackgroundColor.value,
  '--nt-cal-customTodayDayFontColor': customTodayDayFontColor.value,
  '--nt-cal-customTodayDescFontColor': customTodayDescFontColor.value,
  '--nt-cal-customBorderWidth': customBorderWidth.value,
  '--nt-cal-customBorderColor': customBorderColor.value,
  '--nt-cal-customShadowColor': customShadowColor.value,
  '--nt-cal-customDestivalCountdownItemHeight':
    customDestivalCountdownItemHeight.value,
  '--nt-cal-customDestivalCountdownFontSize':
    customDestivalCountdownFontSize.value,
  '--nt-cal-customRestLabelFontSize': customDestivalCountdownRestFontSize.value,
}))

const todayDayjs = dayjs()

const slideDirection = ref<'left' | 'right'>('left')

const state = reactive({
  today: todayDayjs.format('YYYY-MM-DD'),
  currYear: todayDayjs.get('year'),
  currMonth: todayDayjs.get('month') + 1,
  currDay: todayDayjs.get('date'),
  yearList: Array.from(Array(101), (v, i) => ({
    label: `${2000 + i}`,
    value: 2000 + i,
  })),
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

const festivalList = (() => {
  type FestivalItem = {
    date: string
    shortDate: string
    desc: string
    type: number
    festivalCountdownDay: number
  }
  const list: FestivalItem[] = []
  for (let i = 0; i <= 365; i++) {
    const dateEle = todayDayjs.add(i, 'day')
    const formatDate = dateEle.format('YYYY-MM-DD')
    const shortDate = dateEle.format('MM.DD')
    const targetDateEle = new Date(formatDate)
    const solarEle = Solar.fromDate(targetDateEle)
    const lunarEle = Lunar.fromDate(targetDateEle)
    const holidayEle = HolidayUtil.getHoliday(
      dateEle.get('year'),
      dateEle.get('month') + 1,
      dateEle.get('date'),
    )
    const desc =
      lunarEle.getFestivals()[0] ||
      solarEle.getFestivals()[0] ||
      lunarEle.getJieQi() ||
      ''
    if (!desc) continue
    let dayType = 0
    if (holidayEle && holidayEle.isWork()) {
      dayType = 2
    } else if (holidayEle && holidayEle.getName()) {
      dayType = 1
    }
    list.push({
      date: formatDate,
      shortDate,
      desc,
      type: dayType,
      festivalCountdownDay: i,
    })
  }
  return list
})()

const monthsList = computed(() => [
  { label: window.$t('calendar.month.january'), value: 1 },
  { label: window.$t('calendar.month.february'), value: 2 },
  { label: window.$t('calendar.month.march'), value: 3 },
  { label: window.$t('calendar.month.april'), value: 4 },
  { label: window.$t('calendar.month.may'), value: 5 },
  { label: window.$t('calendar.month.june'), value: 6 },
  { label: window.$t('calendar.month.july'), value: 7 },
  { label: window.$t('calendar.month.august'), value: 8 },
  { label: window.$t('calendar.month.september'), value: 9 },
  { label: window.$t('calendar.month.october'), value: 10 },
  { label: window.$t('calendar.month.november'), value: 11 },
  { label: window.$t('calendar.month.december'), value: 12 },
])

const sundayOption = { label: window.$t('calendar.weekday.sunday'), value: 7 }

const weekList = computed(() => {
  const list = [
    { label: window.$t('calendar.weekday.monday'), value: 1 },
    { label: window.$t('calendar.weekday.tuesday'), value: 2 },
    { label: window.$t('calendar.weekday.wednesday'), value: 3 },
    { label: window.$t('calendar.weekday.thursday'), value: 4 },
    { label: window.$t('calendar.weekday.friday'), value: 5 },
    { label: window.$t('calendar.weekday.saturday'), value: 6 },
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
  const holidayEle = HolidayUtil.getHoliday(
    dateEle.get('year'),
    dateEle.get('month') + 1,
    dateEle.get('date'),
  )

  // desc展示优先级：阴历节日, 阳历节日, 节气, 阴历月份, 阴历日期
  let desc =
    lunarEle.getFestivals()[0] ||
    solarEle.getFestivals()[0] ||
    lunarEle.getJieQi() ||
    ''
  let isFestival = true
  let festivalCountdownDay = 0
  if (desc.length === 0) {
    isFestival = false
    desc =
      lunarEle.getDay() === 1
        ? `${lunarEle.getMonthInChinese()}月`
        : lunarEle.getDayInChinese()
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
  currMonthFirstDateWeek =
    currMonthFirstDateWeek === 0 ? 7 : currMonthFirstDateWeek // 1234567

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
  currMonthLastDateWeek =
    currMonthLastDateWeek === 0 ? 7 : currMonthLastDateWeek
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
  slideDirection.value = 'right'
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
  slideDirection.value = 'left'
  if (state.currMonth === 12) {
    state.currYear += 1
    state.currMonth = 1
  } else {
    state.currMonth += 1
  }
  onRender()
  gaProxy('click', ['calendar', 'nextMonth'])
}

const onDateChange = (type: 'year' | 'month', newVal: number) => {
  const oldYearMonth = state.currYear * 12 + state.currMonth
  const newYearMonth =
    type === 'year'
      ? newVal * 12 + state.currMonth
      : state.currYear * 12 + newVal
  slideDirection.value = newYearMonth >= oldYearMonth ? 'left' : 'right'
  gaProxy('click', ['calendar', 'dateChange', type])
  onRender()
}

const isResetBtnVisible = computed(
  () =>
    state.currYear !== todayDayjs.get('year') ||
    state.currMonth !== todayDayjs.get('month') + 1,
)

const onReset = () => {
  const currYearMonth = state.currYear * 12 + state.currMonth
  const todayYearMonth =
    todayDayjs.get('year') * 12 + todayDayjs.get('month') + 1
  slideDirection.value = currYearMonth > todayYearMonth ? 'right' : 'left'
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
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="calendar__container"
      :class="{
        'calendar__container--drag': isDragMode,
        'calendar__container--shadow': localConfig.calendar.isShadowEnabled,
        'calendar__container--border': localConfig.calendar.isBorderEnabled,
      }"
      :style="calendarStyle"
    >
      <div class="calendar__options">
        <div class="options__item">
          <NSelect
            v-model:value="state.currYear"
            class="item__select_year"
            size="small"
            :options="state.yearList"
            :disabled="isDragMode"
            @update:value="(v) => onDateChange('year', v)"
          />
        </div>
        <div class="options__item">
          <NButton
            class="item__btn"
            :class="{ 'item__btn--move': isDragMode }"
            text
            :disabled="isDragMode"
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
            @update:value="(v) => onDateChange('month', v)"
          />
          <NButton
            class="item__btn"
            text
            :disabled="isDragMode"
            :class="{ 'item__btn--move': isDragMode }"
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
            :class="{ 'item__btn--move': isDragMode }"
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
      <div class="calendar__body__wrap">
        <Transition :name="`slide-${slideDirection}`">
          <ul
            :key="`${state.currYear}-${state.currMonth}`"
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
                      >{{ holidayTypeToDesc[item.type as 1 | 2] }}</span
                    >
                    <span
                      v-if="item.isToday"
                      class="item__label item__label--today"
                      >{{ $t('calendar.today') }}</span
                    >
                    <!-- 日期 -->
                    <span class="item__day">{{ item.day }}</span>
                    <!-- 描述 -->
                    <span
                      class="item__desc"
                      :class="{
                        'item__desc--highlight': item.isFestival,
                      }"
                      >{{ item.desc }}</span
                    >
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
                    {{
                      `${detailInfo.lunarFestivals} ${detailInfo.solarFestivals}`
                    }}
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
        </Transition>
      </div>

      <div
        v-if="localConfig.calendar.festivalCountdown"
        class="calendar__festival__list"
      >
        <div
          v-for="item in festivalList"
          :key="item.date"
          :title="`${item.shortDate} ${item.desc} ${item.festivalCountdownDay}${$t('calendar.festivalCountdownDaySuffix')}`"
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
  </WidgetWrap>
</template>

<style>
#calendar {
  color: var(--nt-cal-customFontColor);
  font-size: var(--nt-cal-customFontSize);
  font-family: var(--nt-cal-customFontFamily);
  .calendar__container {
    z-index: 10;
    position: absolute;
    width: var(--nt-cal-customContainerWidth);
    text-align: center;
    border-radius: var(--nt-cal-customBorderRadius);
    background-color: var(--nt-cal-customBackgroundColor);
    backdrop-filter: blur(var(--nt-cal-customBackgroundBlur));
    user-select: none;
    overflow: hidden;
    /* 提升为独立 GPU 合成层，以防止其他 widget 的持续动画（neonFlicker 等）影响 box-shadow 渲染 */
    will-change: transform;
    transform: translateZ(0);
    .calendar__options {
      padding: 1.8% 2%;
      display: flex;
      justify-content: space-between;
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
          width: 2.2vmin;
          height: 2.2vmin;
          border-radius: 50%;
          cursor: pointer;
          transition: background-color 150ms ease-in-out;
          &:hover {
            background-color: var(--gray-alpha-15);
          }
          &.item__btn--move {
            cursor: move !important;
            &:hover {
              background-color: transparent;
            }
          }
          .btn__icon {
            font-size: var(--nt-cal-customFontSize_btn);
            color: var(--nt-cal-customFontColor_btn);
          }
        }
        .n-base-selection-input__content {
          color: var(--nt-cal-customFontColor) !important;
          font-size: var(--nt-cal-customFontSize) !important;
        }
        .item__select_year {
          width: 84px;
        }
        .item__select_month {
          flex: 0 0 auto;
          width: 105px;
        }
      }
      .options__reset {
        flex: 0 0 auto;
        width: 2.2vmin;
        margin-left: 0.5vmin;
      }
    }
    .calendar__header {
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      font-weight: 600;
      opacity: 0.65;
      padding-bottom: 0.3vmin;
      .header__item {
        flex: 1;
        height: 2.4vmin;
        line-height: 2.4vmin;
        text-align: center;
        color: var(--nt-cal-customFontColor);
        font-size: var(--nt-cal-customFontSize);
        letter-spacing: 0.02em;
      }
      .header__item--weekend {
        color: var(--nt-cal-customHolidayFontColor);
      }
    }
    .calendar__body__wrap {
      position: relative;
      overflow: hidden;
      height: var(--nt-cal-customBodyWrapHeight);
    }
    .calendar__body {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      align-items: center;
      padding: 0 0 0.5vmin;
      .body__item {
        position: relative;
        flex: 0 0 auto;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        box-sizing: border-box;
        width: var(--nt-cal-customItemWidth);
        height: var(--nt-cal-customItemWidth);
        text-align: center;
        border-radius: 6px;
        overflow: hidden;
        transition:
          background-color 150ms ease-in-out,
          opacity 150ms ease-in-out;
        .item__day {
          color: var(--nt-cal-customDayFontColor);
          font-size: var(--nt-cal-customDayFontSize);
          font-family: var(--nt-cal-customDayFontFamily);
          font-weight: 500;
          line-height: 1.2;
        }
        .item__desc {
          margin-top: 0.15vmin;
          color: var(--nt-cal-customDescFontColor);
          font-size: var(--nt-cal-customDescFontSize);
          font-family: var(--nt-cal-customDescFontFamily);
          white-space: nowrap;
          line-height: 1.2;
          max-width: 92%;
          overflow: hidden;
          text-align: left;
        }
        .item__desc--highlight {
          color: var(--nt-cal-customHolidayFontColor) !important;
        }
        .item__label {
          position: absolute;
          top: 2px;
          left: 2px;
          padding: 0 2px;
          height: 12px;
          line-height: 12px;
          font-size: 9px;
          font-weight: 600;
          border-radius: 3px;
          letter-spacing: 0;
          white-space: nowrap;
        }
      }
      .body__item--hover:hover {
        background-color: var(--gray-alpha-15);
      }
      .body__item--work {
        background-color: var(--nt-cal-customWorkItemBackgroundColor);
        .item__label {
          color: var(--nt-cal-customWorkLabelFontColor);
          background-color: var(--nt-cal-customWorkLabelBackgroundColor);
        }
        .item__day {
          color: var(--nt-cal-customWorkDayFontColor);
        }
        .item__desc {
          color: var(--nt-cal-customWorkDescFontColor);
        }
        &.body__item--hover:hover {
          filter: brightness(0.92);
        }
      }
      .body__item--rest {
        background-color: var(--nt-cal-customRestItemBackgroundColor);
        .item__label {
          color: var(--nt-cal-customRestLabelFontColor);
          background-color: var(--nt-cal-customRestLabelBackgroundColor);
        }
        .item__day {
          color: var(--nt-cal-customRestDayFontColor);
        }
        .item__desc {
          color: var(--nt-cal-customRestDescFontColor);
        }
        &.body__item--hover:hover {
          filter: brightness(0.92);
        }
      }
      .body__item--weekend {
        .item__day {
          color: var(--nt-cal-customHolidayFontColor);
        }
      }
      .body__item--today {
        background-color: var(--nt-cal-customTodayItemBackgroundColor);
        .item__label--today {
          left: auto !important;
          right: 2px !important;
          color: var(--nt-cal-customTodayLabelFontColor);
          background-color: var(--nt-cal-customTodayLabelBackgroundColor);
        }
        .item__day {
          color: var(--nt-cal-customTodayDayFontColor);
        }
        .item__desc {
          color: var(--nt-cal-customTodayDescFontColor);
        }
        &.body__item--hover:hover {
          filter: brightness(0.9);
          background-color: var(--nt-cal-customTodayItemBackgroundColor);
        }
      }
      .body__item--blur {
        opacity: 0.3;
      }
    }
    .calendar__body--hover {
      cursor: pointer;
    }
  }
  .calendar__container--border {
    outline: var(--nt-cal-customBorderWidth) solid
      var(--nt-cal-customBorderColor);
  }
  .calendar__container--shadow {
    box-shadow:
      var(--nt-cal-customShadowColor) 0px 2px 8px 0px,
      var(--nt-cal-customShadowColor) 0px 4px 20px 0px;
  }
  .calendar__container--drag {
    background-color: transparent !important;
    &:hover {
      background-color: var(--nt-bg-moveable-widget-main) !important;
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
    margin: 4px 0;
    .row__tag {
      flex: 0 0 auto;
      margin: 3px 10px 3px 2px;
      width: 20px;
      height: 20px;
      line-height: 20px;
      text-align: center;
      color: #fff;
      border-radius: 50%;
      font-size: 12px;
      font-weight: 600;
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
      width: 36px;
      font-weight: 600;
      font-size: 12px;
      text-align: center;
      opacity: 0.7;
    }
    .row__value {
      flex: 1;
      display: flex;
      flex-wrap: wrap;
      align-content: flex-start;
      .tag__item {
        margin: 2px 3px;
      }
      .n-tag {
        border-radius: 4px;
      }
    }
  }
}

.calendar__festival__list {
  padding: 0.8% 0 1.5%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  max-height: var(--nt-cal-customDestivalCountdownItemHeight);
  overflow-y: auto;
  border-top: 1px solid var(--gray-alpha-12);
  -ms-overflow-style: none;
  scrollbar-width: none;
  .festival__item {
    padding: 0.4% 3%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 50%;
    font-size: var(--nt-cal-customDestivalCountdownFontSize);
    box-sizing: border-box;
    .item__left {
      display: flex;
      justify-content: flex-start;
      align-items: center;
      width: 70%;
      gap: 3px;
      .left__date {
        flex: 0 0 auto;
        opacity: 0.85;
        letter-spacing: 0.01em;
        color: var(--nt-cal-customDescFontColor);
        font-size: var(--nt-cal-customDescFontSize);
        font-family: var(--nt-cal-customDescFontFamily);
      }
      .left__rest {
        padding: 0 3px;
        flex: 0 0 auto;
        color: var(--nt-cal-customRestLabelFontColor);
        background-color: var(--nt-cal-customRestLabelBackgroundColor);
        font-size: var(--nt-cal-customRestLabelFontSize);
        border-radius: 3px;
        box-sizing: border-box;
        line-height: 1.5;
      }
      .left__desc {
        flex: 1;
        width: 100%;
        color: var(--nt-cal-customDescFontColor);
        font-size: var(--nt-cal-customDescFontSize);
        font-family: var(--nt-cal-customDescFontFamily);
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
      gap: 2px;
      .right__count {
        color: var(--nt-cal-customDayFontColor);
        font-size: var(--nt-cal-customDayFontSize);
        font-family: var(--nt-cal-customDayFontFamily);
        font-weight: 500;
      }
      .right__unit {
        color: var(--nt-cal-customDescFontColor);
        font-size: var(--nt-cal-customDescFontSize);
        font-family: var(--nt-cal-customDescFontFamily);
        opacity: 0.8;
      }
    }
  }
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition:
    transform 260ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 260ms cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}
.slide-left-enter-from {
  transform: translateX(30%);
  opacity: 0;
}
.slide-left-enter-to {
  transform: translateX(0);
  opacity: 1;
}
.slide-left-leave-from {
  transform: translateX(0);
  opacity: 1;
}
.slide-left-leave-to {
  transform: translateX(-30%);
  opacity: 0;
}
.slide-right-enter-from {
  transform: translateX(-30%);
  opacity: 0;
}
.slide-right-enter-to {
  transform: translateX(0);
  opacity: 1;
}
.slide-right-leave-from {
  transform: translateX(0);
  opacity: 1;
}
.slide-right-leave-to {
  transform: translateX(30%);
  opacity: 0;
}
</style>
