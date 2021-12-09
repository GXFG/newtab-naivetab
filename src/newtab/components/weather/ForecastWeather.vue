<template>
  <div v-if="globalState.setting.weather.forecastEnabled" id="forecast" ref="chartDom"></div>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import * as echarts from 'echarts/core'
import { TitleComponent, ToolboxComponent, TooltipComponent, GridComponent, LegendComponent, MarkPointComponent } from 'echarts/components'
import { LineChart } from 'echarts/charts'
import { UniversalTransition } from 'echarts/features'
import { CanvasRenderer } from 'echarts/renderers'
import { globalState } from '@/logic'

echarts.use([TitleComponent, ToolboxComponent, TooltipComponent, GridComponent, LegendComponent, MarkPointComponent, LineChart, CanvasRenderer, UniversalTransition])

const WEEK_MAP = {
  0: window.$t('calendar.sunday'),
  1: window.$t('calendar.monday'),
  2: window.$t('calendar.tuesday'),
  3: window.$t('calendar.wednesday'),
  4: window.$t('calendar.thursday'),
  5: window.$t('calendar.friday'),
  6: window.$t('calendar.saturday'),
}

const initXAxis = () => {
  const totalCount = globalState.localState.weather.forecastday.length
  let currWeek = dayjs().day()
  const res: any = []
  for (let idx = 0; idx < totalCount; idx++) {
    res.push(WEEK_MAP[currWeek])
    if (currWeek === 6) {
      currWeek = 0
    } else {
      currWeek += 1
    }
  }
  return res
}

const chartDom = ref()
let myChart: any = null

const onRender = () => {
  if (!globalState.setting.weather.forecastEnabled) {
    return
  }
  myChart = echarts.init(chartDom.value)
}

const onSetOptions = () => {
  if (!globalState.setting.weather.forecastEnabled) {
    return
  }
  const option = {
    title: {
      text: '',
    },
    tooltip: {
      trigger: 'axis',
    },
    legend: {},
    toolbox: {
      show: false,
      feature: {
        dataZoom: {
          yAxisIndex: 'none',
        },
        dataView: { readOnly: false },
        magicType: { type: ['line', 'bar'] },
        restore: {},
        saveAsImage: {},
      },
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: initXAxis(),
    },
    yAxis: {
      type: 'value',
      axisLabel: {
        formatter: '{value} °C',
      },
    },
    series: [
      {
        name: 'max',
        type: 'line',
        data: globalState.localState.weather.forecastday.map(item => item.day.maxtemp_c),
        // markPoint: {
        //   data: [
        //     { type: 'max', name: 'Max' },
        //     { type: 'min', name: 'Min' },
        //   ],
        // },
        // markLine: {
        //   data: [{ type: 'average', name: 'Avg' }],
        // },
      },
      {
        name: 'min',
        type: 'line',
        data: globalState.localState.weather.forecastday.map(item => item.day.mintemp_c),
        // markPoint: {
        //   data: [{ name: '周最低', value: -2, xAxis: 1, yAxis: -1.5 }],
        // },
        // markLine: {
        //   data: [
        //     { type: 'average', name: 'Avg' },
        //     [
        //       {
        //         symbol: 'none',
        //         x: '90%',
        //         yAxis: 'max',
        //       },
        //       {
        //         symbol: 'circle',
        //         label: {
        //           position: 'start',
        //           formatter: 'Max',
        //         },
        //         type: 'max',
        //         name: '最高点',
        //       },
        //     ],
        //   ],
        // },
      },
    ],
  }

  myChart.setOption(option)
}

onMounted(() => {
  onRender()
  watch(
    () => globalState.localState.weather.current.last_updated_epoch,
    () => {
      onSetOptions()
    },
    { immediate: true },
  )
})

watch(
  () => globalState.setting.weather.forecastEnabled,
  () => {
    nextTick(() => {
      onRender()
      onSetOptions()
    })
  },
)
</script>

<style>
#forecast {
  width: 400px;
  height: 200px;
}
</style>
