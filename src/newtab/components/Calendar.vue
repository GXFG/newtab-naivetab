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
          <option v-for="month in MONTHS" :key="month.value" :value="month.value">
            {{ `${month.label}-${month.value}` }}
          </option>
        </select>
        <span class="item__btn" @click="onNextMonth()">
          <ic:outline-chevron-right />
        </span>
      </div>
      <div class="options__item" @click="onReset()">
        <button>返回今天</button>
      </div>
    </div>
    <!-- header -->
    <ul class="calendar__header">
      <li v-for="item in state.weekList" :key="item.value" class="header__item">
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
          'body__item--blur': item.isNotCurrMonth
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

const MONTHS = [
  { label: 'January', value: 1 },
  { label: 'February', value: 2 },
  { label: 'March', value: 3 },
  { label: 'April', value: 4 },
  { label: 'May', value: 5 },
  { label: 'June', value: 6 },
  { label: 'July', value: 7 },
  { label: 'August', value: 8 },
  { label: 'September', value: 9 },
  { label: 'October', value: 10 },
  { label: 'November', value: 11 },
  { label: 'December', value: 12 },
]

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
    isNotCurrMonth?: boolean
  }[],
})

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
      const day = dateEl.get('date')
      state.dateList.unshift({
        date: dateEl.format('YYYY-MM-DD'),
        day: `${day}`,
        isNotCurrMonth: true,
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
    })
  }

  // padEnd
  let padEndCount = 7 - currMonthLastWeek
  if (state.dateList.length + padEndCount === 35) {
    padEndCount += 7
  }
  for (const index of [...Array(padEndCount).keys()]) {
    const dateEl = dayjs(currMonthLastDate).add(index + 1, 'day')
    const day = dateEl.get('date')
    state.dateList.push({
      date: dateEl.format('YYYY-MM-DD'),
      day: `${day}`,
      isNotCurrMonth: true,
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
  width: 350px;
  color: var(--text-color-watch);
  text-align: center;
  text-shadow: 2px 8px 6px var(--shadow-watch-a),
    0px -5px 35px var(--shadow-watch-b);
  color: #000;
  user-select: none;
  .calendar__options {
    padding: 5px;
    display: flex;
    justify-content: space-around;
    align-items: center;
    font-size: 16px;
    .options__item {
      display: flex;
      align-items: center;
      .item__btn {
        width: 40px;
        font-size: 26px;
        cursor: pointer;
      }
      .item__select {
        background-color: rgba(0, 0, 0, 0);
      }
    }
  }
  .calendar__header {
    display: flex;
    .header__item {
      width: 50px;
      height: 30px;
      line-height: 30px;
      text-align: center;
      background-color: rgb(179, 176, 176);
    }
  }
  .calendar__body {
    display: flex;
    flex-wrap: wrap;
    .body__item {
      width: 50px;
      height: 50px;
      line-height: 50px;
      text-align: center;
      background-color: #444;
    }
    .body__item--blur {
      opacity: 0.5;
    }
  }
}
</style>
