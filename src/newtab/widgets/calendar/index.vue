<script setup lang="ts">
import NTScrollArea from '@/components/ui/NTScrollArea.vue'
import { Icon } from '@iconify/vue/offline'
import { ICONS } from '@/logic/constants/icons'
import {
  SOLAR_TERM_NAMES,
  getDayCell,
  getDayDetail,
  getFestivalList,
} from '@/logic/calendar'
import type {
  ICalendarOptions,
  TCalendarCellOptions,
  TConstellationKey,
} from '@/logic/calendar'
import { getMonthGridPadding } from '@/logic/calendar/grid'
import { addDailyTask, removeDailyTask } from '@/logic/task'
import {
  CUSTOM_SUBSCRIPTION,
  getSubscriptionUrl,
  isMainlandSubscription,
  loadSubscription,
  resolveSubscriptionRegion,
  subscriptionState,
} from '@/logic/calendar/subscriptions'
import { gaProxy } from '@/logic/utils/gtag'
import { isDragMode } from '@/logic/moveable'
import { localConfig } from '@/logic/config/state'
import { CalendarDayType } from '@/common/widget-constants'
import { getIsWidgetRender, getStyleField } from '@/logic/store/style'
import WidgetWrap from '../WidgetWrap.vue'
import MonthPicker from './MonthPicker.vue'
import {
  CALENDAR_MAX_YEAR,
  CALENDAR_MIN_YEAR,
  WIDGET_CODE,
  clampYearMonth,
  toYearMonth,
} from './config'

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
const customFestivalCountdownItemHeight = getStyleField(
  WIDGET_CODE,
  'width',
  'vmin',
  1.4,
)
const customFestivalCountdownFontSize = getStyleField(
  WIDGET_CODE,
  'fontSize',
  'vmin',
  0.95,
)
const customFestivalRestLabelFontSize = getStyleField(
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
  '--nt-cal-customFestivalCountdownItemHeight':
    customFestivalCountdownItemHeight.value,
  '--nt-cal-customFestivalCountdownFontSize':
    customFestivalCountdownFontSize.value,
  // 倒计时列表里「休」小字的字号：与格子上的 RestLabel 系列（颜色）不是一回事，故带 Festival 前缀
  '--nt-cal-customFestivalRestLabelFontSize':
    customFestivalRestLabelFontSize.value,
}))

/** Popover 渲染在 Portal 中，需显式传入日历自定义字体变量 */
const detailPopoverStyle = computed(() => ({
  maxWidth: '350px',
  '--nt-cal-customFontFamily': customFontFamily.value,
  '--nt-cal-customFontColor': customFontColor.value,
  '--nt-cal-customFontSize': customFontSize.value,
}))

/**
 * 年月选择器的弹层同样在 Portal 里，除了字体三件套还要传「今天」的背景色：
 * 弹层里的当前月用与格子上「今天」同一支颜色，两张界面才是一套配色，
 * 否则用户在弹层里看到的强调色和日历上的完全无关。
 *
 * 与 detailPopoverStyle 刻意各自独立，不抽公共对象：那个对象带 `maxWidth: 350px`
 * （详情弹窗要限宽），而选择器的宽度由 `.picker` 的 184px 决定，混在一起会把两处
 * 互不相干的宽度策略绑死。重复的只是三行字体变量，比多一层抽象好读。
 */
const pickerPopoverStyle = computed(() => ({
  '--nt-cal-customFontFamily': customFontFamily.value,
  '--nt-cal-customFontColor': customFontColor.value,
  '--nt-cal-customFontSize': customFontSize.value,
  '--nt-cal-customTodayItemBackgroundColor':
    customTodayItemBackgroundColor.value,
}))

/**
 * 「今天」用 ref 而不是常量：跨天时要能就地更新。
 * 见下方 syncToday 与 addDailyTask 的说明。
 */
const todayDayjs = ref(dayjs())

const slideDirection = ref<'left' | 'right'>('left')

const state = reactive({
  today: todayDayjs.value.format('YYYY-MM-DD'),
  currYear: todayDayjs.value.get('year'),
  currMonth: todayDayjs.value.get('month') + 1,
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

/**
 * 关闭「休 / 班标记」后，格子与倒计时列表都不再展示标记（节日与节气不受影响）。
 *
 * 这个开关刻意留在展示层、不并入 TCalendarCellOptions：适配层返回的 dayType
 * 是订阅里的事实（这天到底休不休），「要不要显示」是渲染决策。农历/黄历开关进
 * 适配层则是因为它们要过滤**文案与数组**（不传下去就没有可用的数据），
 * 两者性质不同，不要为了「看起来统一」把这个开关也搬过去。
 */
const toDisplayDayType = (dayType: CalendarDayType) =>
  localConfig.calendar.isHolidayMarkVisible ? dayType : CalendarDayType.NORMAL

/**
 * 当前订阅地址：预设地区直接拼 Apple 地址，或用户自定义地址。
 * 自定义地址只在设置面板验证成功后才写入 config，所以这里不会拿到半成品 URL。
 */
const subscriptionUrl = computed(() => {
  if (localConfig.calendar.subscriptionRegion === CUSTOM_SUBSCRIPTION) {
    return localConfig.calendar.customSubscriptionUrl.trim()
  }
  // 运行期配置可能来自云同步/旧开发版，非法地区回退默认值，避免 /undefined.ics
  return getSubscriptionUrl(
    resolveSubscriptionRegion(localConfig.calendar.subscriptionRegion),
  )
})

/**
 * 订阅数据是否已经可用。
 * 不用 status === 'ready' 判断：后台刷新/缓存过期时状态会短暂变化，
 * 但旧数据仍然有效，按数据本身判断可避免日历瞬间清空。
 */
const subscriptionDays = computed(() =>
  subscriptionState.url === subscriptionUrl.value &&
  Object.keys(subscriptionState.days).length > 0
    ? subscriptionState.days
    : null,
)

/** 拉取订阅：有缓存立即就绪，无缓存进入 loading */
const refreshSubscription = (force = false) => {
  void loadSubscription(subscriptionUrl.value, {
    termNames: SOLAR_TERM_NAMES,
    force,
  })
}

/** 加载失败后重试 */
const onRetrySubscription = () => {
  refreshSubscription(true)
}

/**
 * 订阅只在**失败**时提示：一个可点击重试的图标。
 *
 * 刷新过程不做任何提示 —— 有缓存时数据本来就还在，没有缓存也只是短暂缺节日，
 * 转圈的收益低于它对这张小卡片的打扰。
 *
 * 自动刷新的失败还按**自然日去重**（见 subscriptions.shouldPromptError）：
 * 一天只提示第一次，之后静默 —— 数据一年只变几次，网络不好时每天弹一个警告图标不值得。
 * 用户主动点这个图标重试（force）失败则照常提示，那是他要求的反馈。
 *
 * stale = 有旧数据可用、只是本次更新失败（弱提示色）
 * error = 没有可展示的数据（才用错误色）
 */
const subscribeStatus = computed<'idle' | 'stale' | 'error'>(() => {
  // 切换地址的瞬间，store 里还是上一个地址的数据，不能拿来判断
  if (subscriptionState.url !== subscriptionUrl.value) return 'idle'
  if (!subscriptionState.error) return 'idle'
  // 同一天内的重复失败不再打扰（自动刷新一天只提示一次）
  if (!subscriptionState.isErrorVisible) return 'idle'
  return subscriptionState.status === 'ready' ? 'stale' : 'error'
})

const subscribeTipText = computed(() => {
  switch (subscribeStatus.value) {
    case 'stale':
      return window.$t('calendar.subscriptionStaleTip')
    case 'error':
      return window.$t('calendar.subscriptionFailedTip')
    default:
      return ''
  }
})

/** 格子与倒计时列表的选项（不含黄历，故切换黄历开关不会触发重算） */
const cellOptions = computed<TCalendarCellOptions>(() => ({
  subscription: subscriptionDays.value,
  // 通用节日表只有中文名且多为大陆常用节日，只在订阅中国大陆时补充
  includeLocalFestivals: isMainlandSubscription(
    localConfig.calendar.subscriptionRegion,
  ),
  showLunarTerm: localConfig.calendar.isLunarTermVisible,
}))

/** 详情弹窗的选项：格子选项 + 黄历开关 */
const detailOptions = computed<ICalendarOptions>(() => ({
  ...cellOptions.value,
  showAlmanac: localConfig.calendar.isAlmanacVisible,
}))

/** 星期文案，索引与 tyme4ts 的 Week.NAMES 一致（0 = 周日） */
const weekdayTextList = computed(() => [
  window.$t('calendar.weekday.sunday'),
  window.$t('calendar.weekday.monday'),
  window.$t('calendar.weekday.tuesday'),
  window.$t('calendar.weekday.wednesday'),
  window.$t('calendar.weekday.thursday'),
  window.$t('calendar.weekday.friday'),
  window.$t('calendar.weekday.saturday'),
])

/** 星座文案，键与适配层的 CONSTELLATION_KEYS 一致 */
const constellationTextMap = computed<Record<TConstellationKey, string>>(
  () => ({
    aries: window.$t('calendar.constellation.aries'),
    taurus: window.$t('calendar.constellation.taurus'),
    gemini: window.$t('calendar.constellation.gemini'),
    cancer: window.$t('calendar.constellation.cancer'),
    leo: window.$t('calendar.constellation.leo'),
    virgo: window.$t('calendar.constellation.virgo'),
    libra: window.$t('calendar.constellation.libra'),
    scorpio: window.$t('calendar.constellation.scorpio'),
    sagittarius: window.$t('calendar.constellation.sagittarius'),
    capricorn: window.$t('calendar.constellation.capricorn'),
    aquarius: window.$t('calendar.constellation.aquarius'),
    pisces: window.$t('calendar.constellation.pisces'),
  }),
)

/** 依赖 cellOptions 与「今天」：切换订阅/农历开关、跨天后自动重算（毫秒级，仅变更时发生一次） */
const festivalList = computed(() =>
  getFestivalList(todayDayjs.value.toDate(), cellOptions.value).map((item) => ({
    date: dayjs(item.date).format('YYYY-MM-DD'),
    shortDate: dayjs(item.date).format('MM.DD'),
    desc: item.desc,
    type: toDisplayDayType(item.dayType),
    festivalCountdownDay: item.offsetDays,
  })),
)

/**
 * 月份标签用短形态（中文「1月」/ 英文「Jan」），不用语言包里的全名。
 *
 * 中文的「一月」本来就是 month one，写成「1月」零语义损失、字更少；英文全名
 * （September 约 66px）在 4 列网格里放不下、在标题里也过长，缩写直接砍掉一半。
 * 顺带与 widget 其它地方的写法一致：详情弹窗是 YYYY-MM-DD、倒计日区是 MM.DD。
 */
const monthLabels = computed(() => [
  window.$t('calendar.month.january'),
  window.$t('calendar.month.february'),
  window.$t('calendar.month.march'),
  window.$t('calendar.month.april'),
  window.$t('calendar.month.may'),
  window.$t('calendar.month.june'),
  window.$t('calendar.month.july'),
  window.$t('calendar.month.august'),
  window.$t('calendar.month.september'),
  window.$t('calendar.month.october'),
  window.$t('calendar.month.november'),
  window.$t('calendar.month.december'),
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
 * 纯函数：根据日期和类型生成日期项数据，不修改外部状态。
 * @returns 日期项对象，isNotCurrMonth 由 type 决定
 */
const genDateItem = (type: 'start' | 'main' | 'end', dateEle: typeof dayjs) => {
  const formatDate = dateEle.format('YYYY-MM-DD')
  // 传本地时间日期：适配层按本地时间取值，避免 new Date('YYYY-MM-DD') 的 UTC 解析偏差
  const cell = getDayCell(dateEle.toDate(), cellOptions.value)

  return {
    date: formatDate,
    day: dateEle.get('date'),
    desc: cell.desc,
    type: toDisplayDayType(cell.dayType),
    isToday: state.today === formatDate,
    isWeekend: [6, 0].includes(dateEle.get('day')),
    isFestival: cell.isFestival,
    isNotCurrMonth: type !== 'main',
  }
}

const onRender = () => {
  const currMonthFirstDate = `${state.currYear}-${state.currMonth}-01`
  const currMonthFirstDateEle = dayjs(currMonthFirstDate)
  let currMonthFirstDateWeek = currMonthFirstDateEle.day()
  currMonthFirstDateWeek =
    currMonthFirstDateWeek === 0 ? 7 : currMonthFirstDateWeek // 1234567

  // 当月最后一天及其星期（与首日星期一起算出前后填充）。
  // currMonth + 1 在 12 月会拼出「13 月」，靠 dayjs 按 Date 语义滚到次年 1 月——不要换成严格解析。
  const currMonthLastDateEle = dayjs(
    `${state.currYear}-${state.currMonth + 1}-01`,
  ).subtract(1, 'day')
  const currMonthLastDay = currMonthLastDateEle.get('date')
  let currMonthLastDateWeek = currMonthLastDateEle.day()
  currMonthLastDateWeek =
    currMonthLastDateWeek === 0 ? 7 : currMonthLastDateWeek

  // 前后填充格数：固定补足到 6 行（42 格），否则 2 月（整 4 周）会在容器底部空出两行
  const weekBeginsOn = localConfig.calendar.weekBeginsOn === 7 ? 7 : 1
  const { padStart: padStartCount, padEnd: padEndCount } = getMonthGridPadding(
    currMonthFirstDateWeek,
    currMonthLastDateWeek,
    currMonthLastDay,
    weekBeginsOn,
  )

  // padStart — 上月末尾填充日期
  const startDates: ReturnType<typeof genDateItem>[] = []
  for (let index = 0; index < padStartCount; index += 1) {
    const dateEle = currMonthFirstDateEle.subtract(index + 1, 'day')
    startDates.push(genDateItem('start', dateEle))
  }
  startDates.reverse() // 让日期从远到近排列

  // main — 当月日期
  const mainDates: ReturnType<typeof genDateItem>[] = []
  for (let index = 0; index < currMonthLastDay; index += 1) {
    const dateEle = dayjs(`${state.currYear}-${state.currMonth}-${index + 1}`)
    mainDates.push(genDateItem('main', dateEle))
  }

  // padEnd — 下月开头填充日期
  const endDates: ReturnType<typeof genDateItem>[] = []
  for (let index = 0; index < padEndCount; index += 1) {
    const dateEle = currMonthLastDateEle.add(index + 1, 'day')
    endDates.push(genDateItem('end', dateEle))
  }

  state.dateList = [...startDates, ...mainDates, ...endDates]
}

/**
 * 跨天校正：「今天」不能只在 setup 时取一次。
 *
 * 新标签页会长期驻留（合盖过夜后直接打开、或一直挂在标签栏），此时 setup 时算出的
 * todayDayjs 仍是昨天 —— 昨天的格子继续挂「今」、「回到今日」回到昨天、
 * 节日倒计时整体差 1 天。
 *
 * 用 `addDailyTask`（逻辑见 `logic/task/daily.ts`）而不是自己挂 visibilitychange：
 * 合盖恢复、或标签页一直可见只是窗口失焦时 document 不会触发 visibilitychange，
 * 只有共享的 rAF 循环能在恢复后补上这一次。日期比较由 daily 统一做，这里不再自己比。
 *
 * 注册只挂 `isRender`：禁用只销毁 WidgetWrap 内部的 slot DOM（组件不卸载），
 * `onUnmounted` 在禁用时不会触发，只兜「组件真被销毁」那一种（错误边界）。
 */
const syncToday = (now: Date) => {
  const next = dayjs(now)

  // 用户正翻在别的月份时不要把他拽回来；只有本来停在「今天所在月」才跟随
  const wasFollowingToday =
    state.currYear === todayDayjs.value.get('year') &&
    state.currMonth === todayDayjs.value.get('month') + 1

  todayDayjs.value = next
  state.today = next.format('YYYY-MM-DD')

  if (wasFollowingToday) {
    state.currYear = next.get('year')
    state.currMonth = next.get('month') + 1
  }
  onRender()
}

const isRender = getIsWidgetRender(WIDGET_CODE)

watch(
  isRender,
  (value) => {
    if (!value) {
      removeDailyTask(WIDGET_CODE)
      return
    }
    // daily 注册即执行一次，首次渲染由它触发，不必再单独 onRender
    addDailyTask(WIDGET_CODE, syncToday)
  },
  { immediate: true },
)

onMounted(() => {
  refreshSubscription()
})

onUnmounted(() => {
  removeDailyTask(WIDGET_CODE)
})

/**
 * 订阅地址变化时加载。
 * 只有“切换预设地区”或“自定义地址验证成功”才会改变 config，
 * 输入框的逐字编辑只改设置面板的 draft，不会再触发这里去请求半成品 URL。
 */
watch(subscriptionUrl, () => {
  refreshSubscription()
})

watch(
  [
    () => localConfig.calendar.weekBeginsOn,
    subscriptionDays,
    () => localConfig.calendar.isHolidayMarkVisible,
    () => localConfig.calendar.isLunarTermVisible,
  ],
  () => {
    onRender()
  },
)

/**
 * 是否已到可浏览范围的端点。箭头按钮与两个下拉共用同一份边界，
 * 避免出现「箭头能翻出 2000，但下拉里没有 1999」这种半截状态。
 */
const isPrevDisabled = computed(
  () =>
    toYearMonth(state.currYear, state.currMonth) <=
    toYearMonth(CALENDAR_MIN_YEAR, 1),
)

const isNextDisabled = computed(
  () =>
    toYearMonth(state.currYear, state.currMonth) >=
    toYearMonth(CALENDAR_MAX_YEAR, 12),
)

const onPrevMonth = () => {
  if (isPrevDisabled.value) return
  slideDirection.value = 'right'
  // 月份传 0 或 13 由 clampYearMonth 完成 12 进制进位（2026-01 的上一月 → 2025-12）
  const prev = clampYearMonth(state.currYear, state.currMonth - 1)
  state.currYear = prev.year
  state.currMonth = prev.month
  onRender()
  gaProxy('click', ['calendar', 'prevMonth'])
}

const onNextMonth = () => {
  if (isNextDisabled.value) return
  slideDirection.value = 'left'
  const next = clampYearMonth(state.currYear, state.currMonth + 1)
  state.currYear = next.year
  state.currMonth = next.month
  onRender()
  gaProxy('click', ['calendar', 'nextMonth'])
}

/**
 * 年月选择器的提交入口（MonthPicker 的 @select）。
 *
 * 年月一次性写入、只渲染一次：翻年和点月都走这里，不必先写年再写月。
 * 方向按「年 × 12 + 月」的单调序号比较 —— 跨年时只看月份会判反
 * （2026-12 → 2027-01 月份在减小，但时间在往前走）。
 */
const onPickerSelect = (year: number, month: number) => {
  const oldYearMonth = toYearMonth(state.currYear, state.currMonth)
  const next = clampYearMonth(year, month)
  state.currYear = next.year
  state.currMonth = next.month

  slideDirection.value =
    toYearMonth(next.year, next.month) >= oldYearMonth ? 'left' : 'right'
  gaProxy('click', ['calendar', 'dateChange', 'picker'])
  onRender()
}

const isResetBtnVisible = computed(
  () =>
    state.currYear !== todayDayjs.value.get('year') ||
    state.currMonth !== todayDayjs.value.get('month') + 1,
)

const onReset = () => {
  const currYearMonth = toYearMonth(state.currYear, state.currMonth)
  const todayYearMonth = toYearMonth(
    todayDayjs.value.get('year'),
    todayDayjs.value.get('month') + 1,
  )
  slideDirection.value = currYearMonth > todayYearMonth ? 'right' : 'left'
  state.currYear = todayDayjs.value.get('year')
  state.currMonth = todayDayjs.value.get('month') + 1
  onRender()
  gaProxy('click', ['calendar', 'resetToady'])
}

/**
 * 详情弹窗内容：由「当前打开的日期」派生，不命令式搬运字段。
 * 好处是切日期/切黄历开关时不会出现「部分字段还是上一天」的中间态。
 */
const detailInfo = computed(() => {
  if (!state.currDetailDate) return null

  const detail = getDayDetail(
    dayjs(state.currDetailDate).toDate(),
    detailOptions.value,
  )

  return {
    date: `${state.currDetailDate} ${weekdayTextList.value[detail.weekday]}`,
    lunar: detail.lunar,
    festivals: detail.festivals,
    xingzuo: constellationTextMap.value[detail.constellation],
    yi: detail.yi,
    ji: detail.ji,
    jishen: detail.jishen,
    xiongsha: detail.xiongsha,
  }
})

/**
 * 日期格子的交互入口，支持两种调用路径：
 *   1. @click 在 <li> 上 → 切换/打开日期
 *   2. @clickoutside 在 NTPopover 上 → 仅当该 Popover 所属日期仍是当前打开日期时才关闭，
 *      避免 A 的 clickoutside 误关刚打开的 B（每个日期格子有独立 NTPopover 实例）
 *
 * 翻月时**不**手动清空 state.currDetailDate：箭头按钮与年月下拉都在 Popover 外部，
 * pointerdown 会先触发 interact-outside 走到下面的 clickoutside 分支清空。
 * 只有纯键盘翻月（Tab + Enter，不产生 pointerdown）会让残留在翻回原月份时重开弹窗，
 * 属已知的极低概率路径，不值得为此在翻月路径上加一个副作用。
 */
const onToggleDetailPopover = (date?: string, source?: 'clickoutside') => {
  if (isDragMode.value) {
    return
  }
  if (!date) return

  if (source === 'clickoutside') {
    // 仅关闭「自己所属日期」的 popover，不误伤已切换到的新日期
    if (state.currDetailDate === date) {
      state.currDetailDate = ''
    }
    return
  }

  // 模板挂在 <li> 的 @click 上：toggle 关闭或打开新日期
  if (state.currDetailDate === date) {
    state.currDetailDate = ''
    return
  }

  // 打开新日期（内容由 detailInfo 派生）
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
          <button
            type="button"
            class="item__btn"
            :class="{
              'item__btn--move': isDragMode,
              'item__btn--edge': isPrevDisabled,
            }"
            :disabled="isDragMode || isPrevDisabled"
            @click="onPrevMonth()"
          >
            <Icon
              :icon="ICONS.angleLeft"
              class="btn__icon"
            />
          </button>
          <MonthPicker
            :year="state.currYear"
            :month="state.currMonth"
            :labels="monthLabels"
            :min-year="CALENDAR_MIN_YEAR"
            :max-year="CALENDAR_MAX_YEAR"
            :disabled="isDragMode"
            :popover-style="pickerPopoverStyle"
            @select="onPickerSelect"
          />
          <button
            type="button"
            class="item__btn"
            :disabled="isDragMode || isNextDisabled"
            :class="{
              'item__btn--move': isDragMode,
              'item__btn--edge': isNextDisabled,
            }"
            @click="onNextMonth()"
          >
            <Icon
              :icon="ICONS.angleRight"
              class="btn__icon"
            />
          </button>
        </div>
        <div class="options__item options__reset">
          <!-- 订阅失败提示：只在失败时出一个图标，图标本身即重试入口；刷新过程不提示 -->
          <button
            v-if="subscribeStatus !== 'idle'"
            type="button"
            class="item__btn item__retry"
            :class="{
              'item__btn--move': isDragMode,
              'item__retry--danger': subscribeStatus === 'error',
            }"
            :disabled="isDragMode"
            :title="subscribeTipText"
            :aria-label="subscribeTipText"
            @click="onRetrySubscription()"
          >
            <Icon
              :icon="ICONS.warning"
              class="retry__icon"
            />
          </button>
          <button
            v-show="isResetBtnVisible"
            type="button"
            class="item__btn"
            :disabled="isDragMode"
            :class="{ 'item__btn--move': isDragMode }"
            @click="onReset()"
          >
            <Icon
              :icon="ICONS.arrowBackward"
              class="btn__icon"
            />
          </button>
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
              <NTPopover
                :style="detailPopoverStyle"
                display-directive="if"
                :show="state.currDetailDate === item.date"
                :title="item.date"
                trigger="manual"
                @clickoutside="onToggleDetailPopover(item.date, 'clickoutside')"
              >
                <template #trigger>
                  <div
                    class="body__item"
                    :class="{
                      'body__item--hover': !isDragMode,
                      'body__item--blur': item.isNotCurrMonth,
                      'body__item--weekend': item.isWeekend,
                      'body__item--today': item.isToday,
                      'body__item--rest': item.type === CalendarDayType.REST,
                      'body__item--work': item.type === CalendarDayType.WORK,
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
                <div
                  v-if="detailInfo"
                  class="calendar__detail"
                >
                  <div class="detail__header">
                    <p class="detail__date">
                      {{ detailInfo.date }}
                      <span class="detail__xingzuo">
                        {{ detailInfo.xingzuo }}
                      </span>
                    </p>
                    <p
                      v-if="detailInfo.lunar"
                      class="detail__lunar"
                    >
                      {{ detailInfo.lunar }}
                    </p>
                    <p
                      v-if="detailInfo.festivals.length"
                      class="detail__festival"
                    >
                      {{ detailInfo.festivals.join(' · ') }}
                    </p>
                  </div>
                  <div
                    v-if="detailInfo.yi.length"
                    class="detail__row"
                  >
                    <p class="row__tag row__tag--yi">{{ $t('calendar.yi') }}</p>
                    <div class="row__value">
                      <NTTag
                        v-for="yiItem in detailInfo.yi"
                        :key="yiItem"
                        class="tag__item"
                        type="success"
                        size="small"
                        :bordered="false"
                      >
                        {{ yiItem }}
                      </NTTag>
                    </div>
                  </div>
                  <div
                    v-if="detailInfo.ji.length"
                    class="detail__row"
                  >
                    <p class="row__tag row__tag--ji">{{ $t('calendar.ji') }}</p>
                    <div class="row__value">
                      <NTTag
                        v-for="jiItem in detailInfo.ji"
                        :key="jiItem"
                        class="tag__item"
                        type="error"
                        size="small"
                        :bordered="false"
                      >
                        {{ jiItem }}
                      </NTTag>
                    </div>
                  </div>
                  <div
                    v-if="detailInfo.jishen.length"
                    class="detail__row"
                  >
                    <p class="row__label">{{ $t('calendar.jishen') }}</p>
                    <div class="row__value">
                      <NTTag
                        v-for="shenItem in detailInfo.jishen"
                        :key="shenItem"
                        class="tag__item"
                        type="info"
                        size="small"
                        :bordered="false"
                      >
                        {{ shenItem }}
                      </NTTag>
                    </div>
                  </div>
                  <div
                    v-if="detailInfo.xiongsha.length"
                    class="detail__row"
                  >
                    <p class="row__label">{{ $t('calendar.xiongsha') }}</p>
                    <div class="row__value">
                      <NTTag
                        v-for="shaItem in detailInfo.xiongsha"
                        :key="shaItem"
                        class="tag__item"
                        size="small"
                        :bordered="false"
                      >
                        {{ shaItem }}
                      </NTTag>
                    </div>
                  </div>
                </div>
              </NTPopover>
            </li>
          </ul>
        </Transition>
      </div>

      <NTScrollArea
        v-if="localConfig.calendar.festivalCountdown"
        class="calendar__festival__scroll"
      >
        <div class="calendar__festival__list">
          <div
            v-for="item in festivalList"
            :key="item.date"
            :title="`${item.shortDate} ${item.desc} ${$t('calendar.festivalCountdownDaySuffix', { n: item.festivalCountdownDay }, item.festivalCountdownDay)}`"
            class="festival__item"
          >
            <div class="item__left">
              <p class="left__date">{{ item.shortDate }}</p>
              <p
                v-if="item.type === CalendarDayType.REST"
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
      </NTScrollArea>
    </div>
  </WidgetWrap>
</template>

<style>
#calendar {
  color: var(--nt-cal-customFontColor);
  font-size: var(--nt-cal-customFontSize);
  font-family: var(--nt-cal-customFontFamily);
  .calendar__container {
    z-index: var(--nt-z-index);
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
      /* 三栏 grid 而不是 flex + space-between：左右各 1fr、中间 auto，
         中间的「‹ 年月 ▾ ›」永远落在卡片正中，且与两侧内容宽度无关。
         原来只有两个 flex 子项时标题被推到最左，右半边空着。*/
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      align-items: center;
      .options__item {
        grid-column: 2;
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 5px;
        .item__btn {
          all: unset;
          display: flex;
          justify-content: center;
          align-items: center;
          width: 2.4vmin;
          min-width: 2.4vmin;
          height: 2.4vmin;
          min-height: 2.4vmin;
          flex-shrink: 0;
          border-radius: 50%;
          cursor: pointer;
          transition: background-color 150ms ease-in-out;
          &:hover {
            background-color: var(--nt-gray-moderate);
          }
          &.item__btn--move {
            cursor: move !important;
            &:hover {
              background-color: transparent;
            }
          }
          /* 已到可浏览范围的端点：箭头置灰，避免「点了没反应」被当成卡死 */
          &.item__btn--edge {
            opacity: 0.3;
            cursor: default;
            &:hover {
              background-color: transparent;
            }
          }
          .btn__icon {
            font-size: var(--nt-cal-customFontSize);
            color: var(--nt-cal-customFontColor);
          }
        }
        /* 订阅失败提示：图标即重试入口，靠语义色区分「有缓存兜底」与「彻底失败」 */
        .item__retry .retry__icon {
          font-size: calc(var(--nt-cal-customFontSize) * 0.85);
          color: var(--color-warning);
        }
        .item__retry--danger .retry__icon {
          color: var(--color-error);
        }
      }
      /* 年月已改成标题 + 弹层网格（见 MonthPicker.vue），这里不再有 Select。
         早先写在这里的 .item__select_year { width: 84px } / .item__select_month { width: 105px }
         从来没有生效过：当时 NTSelect 的根节点是 Reka 的 SelectRoot（Fragment +
         inheritAttrs: false），调用方传的 class 落不到任何元素，真正决定宽度的是
         .reka-select__trigger 自己的 min-width。
         该问题已在 NTSelect.vue 修好（显式 inheritAttrs: false + 把 $attrs 绑到
         SelectTrigger），现在 <NTSelect class="…"> 的 class 会正常落到触发按钮上，
         所以这些宽度也不用再补回来 —— 年月已经不是 Select 了。*/
      .options__reset {
        grid-column: 3;
        justify-self: end;
        /* 用 min-width 而非固定宽度：重试图标出现时向右槽位左侧扩展，
           「回到今日」贴着容器右边缘不动，不会跳动 */
        min-width: 2.2vmin;
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
        background-color: var(--nt-gray-moderate);
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
          left: auto;
          right: 2px;
          color: var(--nt-cal-customTodayLabelFontColor);
          background-color: var(--nt-cal-customTodayLabelBackgroundColor);
        }
        .item__day {
          color: var(--nt-cal-customTodayDayFontColor);
          border-radius: 50%;
          padding: 1px 6px;
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
  font-family: var(--nt-cal-customFontFamily);
  color: var(--nt-cal-customFontColor);
  font-size: var(--nt-cal-customFontSize);
  line-height: 1.6;
  .detail__header {
    padding-bottom: 8px;
    margin-bottom: 8px;
    border-bottom: 1px solid var(--nt-gray-light);
  }
  .detail__date {
    text-align: center;
    font-weight: 500;
  }
  .detail__xingzuo {
    margin-left: 4px;
    opacity: 0.6;
    font-size: 0.9em;
  }
  .detail__lunar {
    text-align: center;
    opacity: 0.7;
    font-size: 0.9em;
  }
  .detail__festival {
    color: var(--color-error);
    text-align: center;
    font-weight: 600;
    margin-top: 2px;
  }
  .detail__row {
    display: flex;
    margin: 4px 0;
    .row__tag {
      flex: 0 0 auto;
      margin: 3px 14px 3px 2px;
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
      background-color: var(--color-success);
    }
    .row__tag--ji {
      background-color: var(--color-error);
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
    }
  }
}

/* NTScrollArea 外层：接管高度约束和分隔线。height 必须有确定值，否则 Reka viewport 的 height:100% 无法解析 */
.calendar__festival__scroll {
  height: var(--nt-cal-customFestivalCountdownItemHeight);
  max-height: var(--nt-cal-customFestivalCountdownItemHeight);
  border-top: 1px solid var(--nt-gray-light);
}

/* 内层：flex 布局 + padding，不再处理滚动 */
.calendar__festival__list {
  padding: 0.8% 0 1.5%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  .festival__item {
    padding: 0.4% 3%;
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 50%;
    font-size: var(--nt-cal-customFestivalCountdownFontSize);
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
        font-size: var(--nt-cal-customFestivalRestLabelFontSize);
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
