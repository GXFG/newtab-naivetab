<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { getCityLookup } from '@/api'
import { URL_QWEATHER_START } from '@/logic/const'
import { localConfig } from '@/logic/store'

const temperatureUnitOptions = [
  { label: '℃', value: 'c' },
  { label: '℉', value: 'f' },
]

const speedUnitOptions = [
  { label: 'kph', value: 'kph' },
  { label: 'mph', value: 'mph' },
]

const state = reactive({
  isEditCityModel: false,
  isSearchLoading: false,
  keyword: '',
  cityList: [] as SelectStringItem[],
})

const getLocation = async () => {
  if (state.isSearchLoading || state.keyword.length === 0) {
    return
  }
  state.isSearchLoading = true
  try {
    const res = await getCityLookup(state.keyword)
    state.isSearchLoading = false
    if (res.code !== '200') {
      state.cityList = []
      return
    }
    state.cityList = res.location.map((item: CityItem) => ({
      label: `${item.country}-${item.adm1}-${item.adm2}-${item.name}`,
      value: item.id,
    }))
  } catch (e) {
    state.isSearchLoading = false
  }
}

const onSearch = useDebounceFn(() => {
  getLocation()
}, 500)

const onChangeCity = (label: string) => {
  state.keyword = label
  onSearch()
}

const onSelectCity: any = (cityId: string) => {
  const target = state.cityList.find((item) => item.value === cityId)
  const cityName = target ? target.label : state.keyword
  localConfig.weather.city.name = cityName
  localConfig.weather.city.id = cityId
}
</script>

<template>
  <BaseComponentSetting
    id="weather__setting"
    cname="weather"
  >
    <template #header>
      <NFormItem :label="$t('weather.city')">
        <NInput
          v-if="!state.isEditCityModel"
          v-model:value="localConfig.weather.city.name"
          :disabled="true"
        />
        <NAutoComplete
          v-else
          v-model:value="state.keyword"
          :options="state.cityList"
          :loading="state.isSearchLoading"
          @update:value="onChangeCity"
          @select="onSelectCity"
        />

        <NButton
          type="primary"
          ghost
          class="setting__item-element"
          @click="state.isEditCityModel = !state.isEditCityModel"
        >
          <template v-if="state.isEditCityModel">
            <ic:outline-check class="item__icon" />
          </template>
          <template v-else>
            <uil:edit class="item__icon" />
          </template>
        </NButton>
      </NFormItem>

      <NFormItem label="API Key">
        <NInput v-model:value="localConfig.weather.apiKey" />
        <Tips
          link
          :content="URL_QWEATHER_START"
        />
      </NFormItem>

      <!-- <NFormItem :label="$t('weather.temperatureUnit')">
        <NSelect v-model:value="localConfig.weather.temperatureUnit" :options="temperatureUnitOptions" />
      </NFormItem>
      <NFormItem :label="$t('weather.speedUnit')">
        <NSelect v-model:value="localConfig.weather.speedUnit" :options="speedUnitOptions" />
      </NFormItem> -->

      <NFormItem :label="$t('weather.icon')">
        <div class="setting__input-wrap">
          <div class="setting__input_item">
            <NSwitch v-model:value="localConfig.weather.iconEnabled" />
          </div>
          <div
            v-if="localConfig.weather.iconEnabled"
            class="setting__input_item"
          >
            <NSlider
              v-model:value="localConfig.weather.iconSize"
              class="item__grow"
              :step="1"
              :min="30"
              :max="200"
              :tooltip="false"
            />
            <NInputNumber
              v-model:value="localConfig.weather.iconSize"
              class="setting__item-element setting__input-number"
              :step="1"
              :min="30"
              :max="200"
            />
          </div>
        </div>
      </NFormItem>

      <!-- <NFormItem :label="$t('weather.forecast')">
        <NSwitch v-model:value="localConfig.weather.forecastEnabled" />
      </NFormItem> -->
    </template>
  </BaseComponentSetting>
</template>

<style>
#weather__setting {
  .n-input.n-input--disabled .n-input__input-el,
  .n-input.n-input--disabled .n-input__textarea-el {
    cursor: not-allowed;
  }
}
</style>
