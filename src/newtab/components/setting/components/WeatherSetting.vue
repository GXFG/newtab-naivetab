<template>
  <BaseComponentSetting cname="weather">
    <template #header>
      <NFormItem :label="$t('weather.forecastEnabled')">
        <NTooltip trigger="hover">
          <template #trigger>
            <NSwitch v-model:value="globalState.setting.weather.forecastEnabled" :disabled="true" />
          </template>
          In development, Stay tuned.
        </NTooltip>
      </NFormItem>
      <NFormItem :label="$t('weather.city')">
        <NInputGroup>
          <NAutoComplete v-model:value="state.cityLabel" :loading="state.isSearchLoading" :options="state.cityList" @update:value="onUpdateCity" @select="onSelectCity" />
          <!-- <NButton @click="onSearch()">
            <bx:bx-search class="item__icon" />
          </NButton> -->
        </NInputGroup>
      </NFormItem>
      <NFormItem label="AQI">
        <NSelect v-model:value="globalState.setting.weather.aqi" :options="aqiOptions" />
      </NFormItem>
      <NFormItem :label="$t('weather.temperatureUnit')">
        <NSelect v-model:value="globalState.setting.weather.temperatureUnit" :options="temperatureUnitOptions" />
      </NFormItem>
      <NFormItem :label="$t('weather.speedUnit')">
        <NSelect v-model:value="globalState.setting.weather.speedUnit" :options="speedUnitOptions" />
      </NFormItem>
      <NFormItem label="API Key">
        <NInput v-model:value="globalState.setting.weather.apiKey" />
        <NTooltip trigger="hover" placement="top-end">
          <template #trigger>
            <div style="margin-left: 10px; padding: 0 10px; background-color: #fff; border-radius: 2px">
              <a href="https://www.weatherapi.com/" title="Free Weather API">
                <img :src="'/assets/img/weatherapi.png'" alt="Weather data by WeatherAPI.com" border="0">
              </a>
            </div>
          </template>
          Weather data by WeatherAPI.com
        </NTooltip>
      </NFormItem>
      <NFormItem :label="$t('common.icon')">
        <div class="setting__input-wrap">
          <div class="setting__input_item">
            <NSwitch v-model:value="globalState.setting.weather.iconEnabled" />
          </div>
          <div v-if="globalState.setting.weather.iconEnabled" class="setting__input_item">
            <NSlider v-model:value="globalState.style.weather.iconWidth" class="item__grow" :step="1" :min="30" :max="200" />
            <NInputNumber v-model:value="globalState.style.weather.iconWidth" class="setting__input-number" :step="1" :min="30" :max="200" />
          </div>
        </div>
      </NFormItem>
    </template>
  </BaseComponentSetting>
</template>

<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
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
  cityList: [] as TSelectStringItem[],
})

const getSearch = async() => {
  if (state.isSearchLoading || globalState.setting.weather.city.label.length === 0) {
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

const onSearch = useDebounceFn(() => {
  globalState.setting.weather.city.label = state.cityLabel
  getSearch()
}, 2500)

const onUpdateCity = (label: any) => {
  state.cityLabel = label.replace(/[^A-Za-z0-9, ]/g, '')
  onSearch()
}

const onSelectCity = (value: any) => {
  globalState.setting.weather.city.label = state.cityLabel
  globalState.setting.weather.city.value = value
}
</script>
