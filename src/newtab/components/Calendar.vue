<template>
  <div v-if="globalState.setting.calendar.enabled" id="calendar">
    <div class="calendar__container" :style="positionStyle">
      <div class="calendar__options">
        <div class="options__item">
          <NSelect
            v-model:value="state.currYear"
            class="item__select_year"
            size="small"
            :options="state.yearList"
            @update:value="onDateChange()"
          ></NSelect>
        </div>
        <div class="options__item">
          <NButton class="item__btn" text @click="onPrevMonth()">
            <fa-solid:angle-left />
          </NButton>
          <NSelect
            v-model:value="state.currMonth"
            class="item__select_month"
            size="small"
            :options="state.monthsList"
            @update:value="onDateChange()"
          ></NSelect>
          <NButton class="item__btn" text @click="onNextMonth()">
            <fa-solid:angle-right />
          </NButton>
        </div>
        <div class="options__item">
          <NButton class="item__btn" text @click="onReset()">
            <si-glyph:arrow-backward />
          </NButton>
        </div>
      </div>
      <!-- header -->
      <ul class="calendar__header">
        <li
          v-for="item in state.weekList"
          :key="item.value"
          class="header__item"
          :class="{ 'header__item--weekend': [6, 7].includes(item.value) }"
        >
          {{ item.label }}
        </li>
      </ul>
      <!-- body -->
      <ul class="calendar__body">
        <li
          v-for="item in state.dateList"
          :key="item.date"
          class="body__item"
          :class="{
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
          >{{ state.holidayTypeToDesc[item.type as 1 | 2] }}</span>
          <span class="item__day">{{ item.day }}</span>
          <span
            class="item__desc"
            :class="{ 'item__desc--highlight': item.isFestival }"
          >{{ item.desc }}</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { NButton, NSelect } from 'naive-ui'
import { globalState, LEGAL_HOLIDAY_ENUM, getLayoutStyle, getCustomFontSize } from '@/logic'
import { calendar } from '@/lib/calendar'

const CNAME = 'calendar'

const state = reactive({
  today: dayjs().format('YYYY-MM-DD'),
  currYear: dayjs().get('year'),
  currMonth: dayjs().get('month') + 1,
  currDay: dayjs().get('date'),
  yearList: Array.from(Array(51), (v, i) => ({ label: `${2000 + i}`, value: 2000 + i })),
  monthsList: [] as TEnum[],
  weekList: [] as TEnum[],
  holidayTypeToDesc: {},
  dateList: [] as {
    date: string // YYYY-MM-DD
    day: number // D
    desc: string
    type: number // 1休，2班
    isToday: boolean
    isWeekend: boolean
    isFestival: boolean
    isNotCurrMonth: boolean
  }[],
})

const initEnumData = () => {
  state.monthsList = [
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
  ]
  state.weekList = [
    { label: window.$t('calendar.monday'), value: 1 },
    { label: window.$t('calendar.tuesday'), value: 2 },
    { label: window.$t('calendar.wednesday'), value: 3 },
    { label: window.$t('calendar.thursday'), value: 4 },
    { label: window.$t('calendar.friday'), value: 5 },
    { label: window.$t('calendar.saturday'), value: 6 },
    { label: window.$t('calendar.sunday'), value: 7 },
  ]
  state.holidayTypeToDesc = {
    1: window.$t('calendar.rest'),
    2: window.$t('calendar.work'),
  }
}

initEnumData()

watch(() => globalState.setting.general.lang, () => {
  initEnumData()
})

/**
 * type: 1start, 2main, 3end
 * dateEl: dayjs element
 */
const genDateList = (type: 1 | 2 | 3, dateEl: any) => {
  const formatDate = dateEl.format('YYYY-MM-DD')
  const shortDate = dateEl.format('MMDD')
  const lunar: TCalendar = calendar.solar2lunar(...formatDate.split('-'))
  const { cYear, cDay, nWeek, isToday, festival, lunarFestival, Term, IMonthCn, IDayCn, lDay } = lunar
  // desc优先级：阳历节日，阴历节日，节气，阴历月份，阴历日期
  let isFestival = true
  let desc = festival || lunarFestival || Term || ''
  if (desc.length === 0) {
    isFestival = false
    desc = lDay === 1 ? IMonthCn : IDayCn
  }
  const param = {
    date: formatDate,
    day: cDay,
    desc,
    type: (LEGAL_HOLIDAY_ENUM[cYear] && LEGAL_HOLIDAY_ENUM[cYear][shortDate]) || 0,
    isToday,
    isWeekend: [6, 7].includes(nWeek),
    isFestival,
    isNotCurrMonth: type !== 2,
  }
  if (type === 1) {
    state.dateList.unshift(param)
  } else {
    state.dateList.push(param)
  }
}

const onRender = () => {
  state.dateList = []

  const currMonthFirstDate = `${state.currYear}-${state.currMonth}-01`
  let currMonthFirstWeek = dayjs(currMonthFirstDate).day()
  currMonthFirstWeek = currMonthFirstWeek === 0 ? 7 : currMonthFirstWeek

  // padStart
  let padStartCount = currMonthFirstWeek - 1
  padStartCount = padStartCount === 0 ? 7 : padStartCount
  for (let index = 0; index < padStartCount; index += 1) {
    const dateEL = dayjs(currMonthFirstDate).subtract(index + 1, 'day')
    genDateList(1, dateEL)
  }

  const currMonthLastDate = dayjs(`${state.currYear}-${state.currMonth + 1}-01`).subtract(1, 'day').format('YYYY-MM-DD')
  const currMonthLastDay = dayjs(`${state.currYear}-${state.currMonth + 1}-01`).subtract(1, 'day').get('date')
  let currMonthLastWeek = dayjs(currMonthLastDate).day()
  currMonthLastWeek = currMonthLastWeek === 0 ? 7 : currMonthLastWeek
  // add main
  for (let index = 0; index < currMonthLastDay; index += 1) {
    const dateEL = dayjs(`${state.currYear}-${state.currMonth}-${index + 1}`)
    genDateList(2, dateEL)
  }

  // padEnd
  let padEndCount = 7 - currMonthLastWeek
  if (state.dateList.length + padEndCount === 35) {
    // 确保为6行
    padEndCount += 7
  }
  for (let index = 0; index < padEndCount; index += 1) {
    const dateEl = dayjs(currMonthLastDate).add(index + 1, 'day')
    genDateList(3, dateEl)
  }
}

onMounted(() => {
  onRender()
})

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

const onReset = () => {
  state.currYear = dayjs().get('year')
  state.currMonth = dayjs().get('month') + 1
  state.currDay = dayjs().get('date')
  onRender()
}

const positionStyle = computed(() => getLayoutStyle(CNAME))

const customFontSize = computed(() => getCustomFontSize(CNAME))

</script>

<style scoped>
#calendar {
  color: v-bind(globalState.style.calendar.fontColor[globalState.localState.currThemeCode]);
  font-size: v-bind(customFontSize);
  .calendar__container {
    position: fixed;
    width: 330px;
    text-align: center;
    user-select: none;
    border-radius: 5px;
    overflow: hidden;
    transition: all 0.3s ease;
    box-shadow: v-bind(globalState.style.calendar.shadowColor[globalState.localState.currThemeCode]) 0px 2px 4px 0px,
      v-bind(globalState.style.calendar.shadowColor[globalState.localState.currThemeCode]) 0px 2px 16px 0px;
    .calendar__options {
      padding: 5px;
      display: flex;
      justify-content: space-around;
      align-items: center;
      font-size: 16px;
      .options__item {
        display: flex;
        justify-content: center;
        align-items: center;
        .item__btn {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 25%;
          cursor: pointer;
        }
        .item__select_year {
          width: 75px;
        }
        .item__select_month {
          flex: 0 0 auto;
          width: 90px;
        }
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
        color: var(--text-color-red);
      }
    }
    .calendar__body {
      display: flex;
      flex-wrap: wrap;
      .body__item {
        position: relative;
        display: flex;
        flex-direction: column;
        justify-content: space-around;
        align-items: center;
        box-sizing: border-box;
        padding: 3px;
        margin: 1px;
        width: 13.6%;
        height: 45px;
        text-align: center;
        border-radius: 5px;
        border: 1px solid rgba(0, 0, 0, 0);
        overflow: hidden;
        .item__day {
        }
        .item__desc {
          height: 10px;
          color: var(--text-color-main);
          font-size: 12px;
          transform: scale(0.8);
        }
        .item__desc--highlight {
          color: var(--text-color-red);
        }
        .item__label {
          position: absolute;
          top: -3px;
          left: -3px;
          padding: 3px;
          color: var(--text-color-main);
          font-size: 13px;
          transform: scale(0.7);
        }
        .item__label--work {
          background-color: var(--bg-calendar-label-work);
        }
        .item__label--rest {
          background-color: var(--text-color-red);
        }
      }
      .body__item:hover {
        border: 1px solid
          v-bind(
            globalState.style.calendar.activeColor[globalState.localState.currThemeCode]
          );
      }
      .body__item--work {
        color: var(--text-color-red) !important;
        background-color: var(--bg-calendar-work);
      }
      .body__item--rest {
        color: var(--text-color-main) !important;
        background-color: var(--bg-calendar-rest);
      }
      .body__item--weekend {
        color: var(--text-color-red);
      }
      .body__item--active {
        background-color: v-bind(
          globalState.style.calendar.activeColor[globalState.localState.currThemeCode]
        );
      }
      .body__item--blur {
        opacity: 0.4;
      }
    }
  }
}
</style>
