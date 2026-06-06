<script setup lang="ts">
import NTInputNumber from '@/components/ui/NTInputNumber.vue'
import NTAutoComplete from '@/components/ui/NTAutoComplete.vue'
import { useDebounceFn } from '@vueuse/core'
import { Icon } from '@iconify/vue'
import { getCityLookup } from '@/api'
import { URL_QWEATHER_START } from '@/logic/constants/urls'
import { localConfig } from '@/logic/config/state'
import {
  SettingHeaderBar,
  SettingFormWrap,
  SettingFormItem,
  SettingFormSection,
} from '@/setting/components'
import { ICONS } from '@/logic/constants/icons'
import { FontField, SwitchField } from '@/setting/fields'

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

const onSelectCity = (cityId: string) => {
  const target = state.cityList.find((item) => item.value === cityId)
  const cityName = target ? target.label : state.keyword
  localConfig.weather.city.name = cityName
  localConfig.weather.city.id = cityId
}
</script>

<template>
  <SettingHeaderBar :title="$t('setting.weather')" />

  <SettingFormWrap
    id="weather__setting"
    widget-code="weather"
  >
    <!-- 数据设置 -->
    <SettingFormSection
      :title="$t('weather.dataSettings')"
      :icon="ICONS.temp"
    >
      <SettingFormItem :label="$t('weather.city')">
        <NTInput
          v-if="!state.isEditCityModel"
          v-model:value="localConfig.weather.city.name"
          size="small"
          :disabled="true"
        />
        <NTAutoComplete
          v-else
          v-model:value="state.keyword"
          :options="state.cityList"
          :loading="state.isSearchLoading"
          size="small"
          @update:value="onChangeCity"
          @select="onSelectCity"
        />

        <NTButton
          type="primary"
          size="small"
          variant="secondary"
          @click="state.isEditCityModel = !state.isEditCityModel"
        >
          <template v-if="state.isEditCityModel">
            <Icon
              :icon="ICONS.check"
              class="item__icon"
            />
          </template>
          <template v-else>
            <Icon
              :icon="ICONS.edit"
              class="item__icon"
            />
          </template>
        </NTButton>
      </SettingFormItem>

      <SettingFormItem
        :label="$t('weather.apiKey')"
        :tip-content="URL_QWEATHER_START"
        :tip-link="URL_QWEATHER_START"
      >
        <NTInput
          v-model:value="localConfig.weather.apiKey"
          size="small"
        />
      </SettingFormItem>

      <SwitchField
        v-model="localConfig.weather.iconEnabled"
        :label="$t('weather.icon')"
      >
        <template #extra>
          <NTSlider
            v-model:value="localConfig.weather.iconSize"
            :step="1"
            :min="30"
            :max="200"
          />
          <NTInputNumber
            v-model:value="localConfig.weather.iconSize"
            class="setting__num-input"
            size="small"
            :step="1"
            :min="30"
            :max="200"
          />
        </template>
      </SwitchField>
    </SettingFormSection>

    <!-- 文字排版 -->
    <SettingFormSection section-key="common.typography">
      <FontField
        v-model:font-family="localConfig.weather.fontFamily"
        v-model:font-color="localConfig.weather.fontColor"
        v-model:font-size="localConfig.weather.fontSize"
        :label="$t('common.font')"
      />
    </SettingFormSection>
  </SettingFormWrap>
</template>
