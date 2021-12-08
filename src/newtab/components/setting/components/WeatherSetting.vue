<template>
  <ComponentLayout field="weather">
    <NFormItem :label="$t('weather.forecastEnabled')">
      <NSwitch v-model:value="globalState.setting.weather.forecastEnabled" />
    </NFormItem>
    <NFormItem :label="$t('weather.city')">
      <NInputGroup>
        <NAutoComplete
          v-model:value="state.cityLabel"
          :loading="state.isSearchLoading"
          :options="state.cityList"
          @update:value="onUpdateCity"
          @select="onSelectCity"
          @search="onSearch()"
        ></NAutoComplete>
        <NButton @click="onSearch()">
          <bx:bx-search class="item__icon" />
        </NButton>
      </NInputGroup>
    </NFormItem>
    <NFormItem label="AQI">
      <NSelect
        v-model:value="globalState.setting.weather.aqi"
        :options="aqiOptions"
      ></NSelect>
    </NFormItem>
    <NFormItem :label="$t('weather.temperatureUnit')">
      <NSelect
        v-model:value="globalState.setting.weather.temperatureUnit"
        :options="temperatureUnitOptions"
      ></NSelect>
    </NFormItem>
    <NFormItem :label="$t('weather.speedUnit')">
      <NSelect
        v-model:value="globalState.setting.weather.speedUnit"
        :options="speedUnitOptions"
      ></NSelect>
    </NFormItem>
    <NFormItem label="API Key">
      <NInput v-model:value="globalState.setting.weather.apiKey"></NInput>
      <div style="margin-left: 10px; padding: 3px 8px; background-color: #fff;border-radius: 2px;">
        <a href="https://www.weatherapi.com/" title="Free Weather API">
          <img src="https://cdn.weatherapi.com/v4/images/weatherapi_logo.png" alt="Weather data by WeatherAPI.com" border="0">
        </a>
      </div>
    </NFormItem>
  </ComponentLayout>

  <ElementConfig field="weather" />
</template>

<script setup lang="ts">
import { NFormItem, NInputGroup, NAutoComplete, NInput, NSelect, NButton, NSwitch } from 'naive-ui'
import { WEATHER_LANG_MAP, globalState } from '@/logic'
import http from '@/lib/http'

const aqiOptions = [
  { label: 'yes', value: 'yes' },
  { label: 'no', value: 'no' },
]

const temperatureUnitOptions = [
  { label: '℃', value: 'c' },
  { label: '℉', value: 'f' },
]

const speedUnitOptions = [
  { label: 'kph', value: 'kph' },
  { label: 'mph', value: 'mph' },
]

const state = reactive({
  isSearchLoading: false,
  cityLabel: globalState.setting.weather.city.label,
  cityList: [] as { label: string; value: string }[],
})

const getSearch = async() => {
  if (state.isSearchLoading || globalState.setting.weather.city.value.length === 0) {
    return
  }
  state.isSearchLoading = true
  try {
    const data: any = await http({
      url: 'https://api.weatherapi.com/v1/search.json',
      params: {
        key: globalState.setting.weather.apiKey,
        q: globalState.setting.weather.city.label,
        lang: WEATHER_LANG_MAP[globalState.setting.general.lang],
      },
    })
    state.isSearchLoading = false
    state.cityList = data.map(
      (item: {
        country: string // "China"
        id: number // 386793
        lat: number // 39.93
        lon: number // 116.39
        name: string // "Beijing Shi, Beijing, China"
        region: string // "Beijing"
        url: string // "beijing-shi-beijing-china"
      }) => ({
        label: item.name,
        value: item.url,
      }),
    )
  } catch (e) {
    state.isSearchLoading = false
  }
}

const onUpdateCity = (label: any) => {}

const onSelectCity = (value: any) => {
  globalState.setting.weather.city.label = state.cityLabel
  globalState.setting.weather.city.value = value
}

const onSearch = () => {
  getSearch()
}

</script>
