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
        }"
      >
        {{ item.day }}
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { reactive } from 'vue'
import dayjs from 'dayjs'
import { MONTHS_ENUM } from '@/logic/store'

const state = reactive({
  currYear: dayjs().get('year'),
  currMonth: dayjs().get('month') + 1,
  currDay: dayjs().get('date'),
  weekList: [
    { label: 'Mon', value: 1 },
    { label: 'Tue', value: 2 },
    { label: 'Wed', value: 3 },
    { label: 'Thu', value: 4 },
    { label: 'Fri', value: 5 },
    { label: 'Sat', value: 6 },
    { label: 'Sun', value: 7 },
  ],
  dateList: [] as {
    date: string // YYYY-MM-DD
    day: string // DD
    desc?: string
    label?: string
    isToday?: boolean
    isWeekend?: boolean
    isNotCurrMonth?: boolean
  }[],
})

const getIsWeekend = (date: string) => {
  return [0, 6].includes(dayjs(date).day())
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
    for (const index of [...Array(padStartCount).keys()]) {
      const dateEl = dayjs(currMonthFirstDate).subtract(index + 1, 'day')
      const date = dateEl.format('YYYY-MM-DD')
      const day = dateEl.get('date')
      state.dateList.unshift({
        date,
        day: `${day}`,
        isNotCurrMonth: true,
        isWeekend: getIsWeekend(date),
      })
    }
  }

  const currMonthLastDate = dayjs(`${state.currYear}-${state.currMonth + 1}-01`).subtract(1, 'day').format('YYYY-MM-DD')
  const currMonthLastDay = dayjs(`${state.currYear}-${state.currMonth + 1}-01`).subtract(1, 'day').get('date')
  let currMonthLastWeek = dayjs(currMonthLastDate).day()
  currMonthLastWeek = currMonthLastWeek === 0 ? 7 : currMonthLastWeek
  // add main
  for (const index of [...Array(currMonthLastDay).keys()]) {
    const date = dayjs(`${state.currYear}-${state.currMonth}-${index + 1}`).format('YYYY-MM-DD')
    state.dateList.push({
      date,
      day: `${index + 1}`,
      isToday: dayjs().format('YYYY-MM-DD') === date,
      isWeekend: getIsWeekend(date),
      isNotCurrMonth: false,
    })
  }

  // padEnd
  let padEndCount = 7 - currMonthLastWeek
  if (state.dateList.length + padEndCount === 35) {
    // 保证为6行日期
    padEndCount += 7
  }
  for (const index of [...Array(padEndCount).keys()]) {
    const dateEl = dayjs(currMonthLastDate).add(index + 1, 'day')
    const date = dateEl.format('YYYY-MM-DD')
    const day = dateEl.get('date')
    state.dateList.push({
      date,
      day: `${day}`,
      isNotCurrMonth: true,
      isWeekend: getIsWeekend(date),
    })
  }
}

onRender()

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
  width: 315px;
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
    font-weight: bold;
    border-top-left-radius: 5px;
    border-top-right-radius: 5px;
    overflow: hidden;
    .header__item {
      width: 45px;
      height: 30px;
      line-height: 30px;
      text-align: center;
      background-color: var(--bg-header-main);
    }
    .header__item--weekend {
      color: var(--text-color-weekend);
    }
  }
  .calendar__body {
    display: flex;
    flex-wrap: wrap;
    background-color: var(--bg-body-main);
    .body__item {
      box-sizing: border-box;
      padding: 3px;
      width: 45px;
      height: 45px;
      text-align: center;
      border-radius: 5px;
      border: 1px solid rgba(0, 0, 0, 0);
      overflow: hidden;
    }
    .body__item:hover {
      border: 1px solid var(--bg-item-hover);
    }
    .body__item--weekend {
      color: var(--text-color-weekend);
    }
    .body__item--active {
      background-color: var(--bg-item-active);
    }
    .body__item--blur {
      opacity: 0.3;
    }
  }
}
</style>
