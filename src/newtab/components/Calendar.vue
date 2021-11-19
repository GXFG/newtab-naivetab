<template>
  <div id="calendar">
    <div class="calendar__options">
      <div class="options__item">
        <span>{{ state.currYear }}</span>
      </div>
      <div class="options__item">
        <span class="item__btn" @click="onPrevMonth()">
          <ic:outline-chevron-left />
        </span>
        <select v-model="state.currMonth" class="item__select" @change="onMonthChange()">
          <option
            v-for="month in MONTHS_ENUM"
            :key="month.value"
            :value="month.value"
          >
            {{ `${month.label}-${month.value}` }}
          </option>
        </select>
        <span class="item__btn" @click="onNextMonth()">
          <ic:outline-chevron-right />
        </span>
      </div>
      <div class="options__item">
        <span class="item__btn" @click="onReset()">
          <ic:twotone-settings-backup-restore />
        </span>
      </div>
    </div>
    <!-- header -->
    <ul class="calendar__header">
      <li
        v-for="item in WEEK_ENUM"
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
        >{{ LEGAL_HOLIDAY_TYPE_TO_DESC[item.type as 1 | 2] }}</span>
        <span class="item__day">{{ item.day }}</span>
        <span
          class="item__desc"
          :class="{ 'item__desc--highlight': item.isFestival }"
        >{{ item.desc }}</span>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { WEEK_ENUM, MONTHS_ENUM, LEGAL_HOLIDAY_ENUM, LEGAL_HOLIDAY_TYPE_TO_DESC } from '@/logic'
import { calendar } from '@/lib/calendar'

const state = reactive({
  today: dayjs().format('YYYY-MM-DD'),
  currYear: dayjs().get('year'),
  currMonth: dayjs().get('month') + 1,
  currDay: dayjs().get('date'),
  dateList: [] as {
    date: string // YYYY-MM-DD
    day: string // DD
    desc: string
    type: number // 1休，2班
    isToday: boolean
    isWeekend: boolean
    isFestival: boolean
    isNotCurrMonth: boolean
  }[],
})

const getIsWeekend = (date: string) => {
  return [0, 6].includes(dayjs(date).day())
}

/**
 * type: 1start, 2main, 3end
 * dateEl: dayjs element
 */
const genDateList = (type: 1 | 2 | 3, dateEl: any) => {
  const formatDate = dateEl.format('YYYY-MM-DD')
  const shortDate = dateEl.format('MMDD')
  const day = dateEl.format('D')
  const lunar = calendar.solar2lunar(...formatDate.split('-'))
  // desc优先级：阳历节日，阴历节日，节气，阴历月份，阴历日期
  let desc = lunar.festival || lunar.lunarFestival || lunar.Term || ''
  let isFestival = true
  if (desc.length === 0) {
    desc = lunar.lDay === 1 ? lunar.IMonthCn : lunar.IDayCn
    isFestival = false
  }
  const param = {
    date: formatDate,
    day,
    desc,
    type: (LEGAL_HOLIDAY_ENUM[state.currYear] && LEGAL_HOLIDAY_ENUM[state.currYear][shortDate]) || 0,
    isToday: formatDate === state.today,
    isWeekend: getIsWeekend(formatDate),
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
  const padStartCount = currMonthFirstWeek - 1
  const isPadStartEmpty = padStartCount === 0
  if (!isPadStartEmpty) {
    for (let index = 0; index < padStartCount; index += 1) {
      const dateEL = dayjs(currMonthFirstDate).subtract(index + 1, 'day')
      genDateList(1, dateEL)
    }
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

const onMonthChange = () => {
  onRender()
}

const onReset = () => {
  state.currYear = dayjs().get('year')
  state.currMonth = dayjs().get('month') + 1
  state.currDay = dayjs().get('date')
  onRender()
}

</script>

<style scoped>
#calendar {
  width: 330px;
  color: var(--text-color-main);
  text-align: center;
  text-shadow: 2px 8px 6px var(--shadow-watch-a),
    0px -5px 35px var(--shadow-watch-b);
  border-radius: 5px;
  overflow: hidden;
  user-select: none;
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
        width: 40px;
        font-size: 20px;
        cursor: pointer;
      }
      .item__select {
        cursor: pointer;
        background-color: rgba(0, 0, 0, 0);
      }
    }
  }
  .calendar__header {
    display: flex;
    justify-content: center;
    align-items: center;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
    overflow: hidden;
    .header__item {
      flex: 1;
      height: 30px;
      line-height: 30px;
      /* font-weight: bold; */
      text-align: center;
      background-color: var(--bg-calendar-header-main);
    }
    .header__item--weekend {
      color: var(--text-color-red);
    }
  }
  .calendar__body {
    display: flex;
    flex-wrap: wrap;
    background-color: var(--bg-calendar-body-main);
    .body__item {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: space-around;
      align-items: center;
      box-sizing: border-box;
      padding: 3px;
      margin: 1px;
      width: 45px;
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
        top: 0;
        left: 0;
        padding: 2px;
        color: var(--text-color-main);
        font-size: 12px;
        transform: scale(0.7);
      }
      .item__label--work {
        background-color: var(--bg-calendar-item-label);
      }
      .item__label--rest {
        background-color: var(--text-color-red);
      }
    }
    .body__item:hover {
      border: 1px solid var(--bg-calendar-item-hover);
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
      background-color: var(--bg-calendar-item-active);
    }
    .body__item--blur {
      opacity: 0.4;
    }
  }
}
</style>
