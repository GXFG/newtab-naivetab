<script setup lang="ts">
import { useDebounceFn } from '@vueuse/core'
import { getCityLookup } from '@/api'
import { SECOND_MODAL_WIDTH, URL_QWEATHER_START } from '@/logic/const'
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
  isCityPickerVisible: false,
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
  console.log(cityId)
  localConfig.weather.city.name = state.keyword
  localConfig.weather.city.id = cityId
}

const onOpenCityPicker = () => {
  state.keyword = ''
  state.cityList = []
  state.isCityPickerVisible = true
}
</script>

<template>
  <!-- CityPicker -->
  <NDrawer
    v-model:show="state.isCityPickerVisible"
    :width="SECOND_MODAL_WIDTH"
  >
    <NDrawerContent
      :title="`${$t('common.edit')}${$t('weather.city')}`"
      closable
    >
      <NAutoComplete
        v-model:value="state.keyword"
        :options="state.cityList"
        :loading="state.isSearchLoading"
        @update:value="onChangeCity"
        @select="onSelectCity"
      />
    </NDrawerContent>
  </NDrawer>

  <!-- main -->
  <BaseComponentSetting
    id="weather__setting"
    cname="weather"
  >
    <template #header>
      <NFormItem :label="$t('weather.city')">
        <NInput
          v-model:value="localConfig.weather.city.name"
          :disabled="true"
        />
        <NButton
          class="setting__item-element"
          @click="onOpenCityPicker()"
        >
          <uil:edit class="item__icon" />
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
