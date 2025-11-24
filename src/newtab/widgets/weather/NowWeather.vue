<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/icons'
import { URL_QWEATHER_HOME, WEATHER_TEMPERATURE_UNIT_MAP, WEATHER_SPEED_UNIT_MAP } from '@/logic/constants/index'
import { createTab } from '@/logic/util'
import { isDragMode } from '@/logic/moveable'
import { localConfig, getStyleField, globalState } from '@/logic/store'
import { weatherState, weatherIndicesInfo, weatherWarningInfo } from '@/newtab/widgets/weather/logic'
import { WIDGET_CODE } from './config'

const state = reactive({
  isWarningVisible: false,
  isIndicesVisible: false,
})

// 挂载完成后，才显示warningPopover，避免位置定位错误
const isMounted = ref(false)

onMounted(() => {
  nextTick(() => {
    requestAnimationFrame(() => {
      isMounted.value = true
    })
  })
})

const isWeatherWarning = computed(() => weatherState.value.warning.list.length > 0)

const warningVisible = computed(() => {
  if (isDragMode.value || localConfig.general.isFocusMode || globalState.isSettingDrawerVisible) {
    return false
  }
  return state.isWarningVisible || weatherState.value.state.isWarningVisible
})

const handleWarningMouseEnter = () => {
  if (isDragMode.value) {
    return
  }
  state.isWarningVisible = true
}

const handleWarningMouseLeave = () => {
  state.isWarningVisible = false
}

const onPinWarning = () => {
  weatherState.value.state.isWarningVisible = true
}

const onUnpinWarning = () => {
  weatherState.value.state.isWarningVisible = false
}

const handleIndicesMouseEnter = () => {
  if (isDragMode.value) {
    return
  }
  state.isIndicesVisible = true
}
const handleIndicesMouseLeave = () => {
  state.isIndicesVisible = false
}

const onOpenWeather = () => {
  if (isDragMode.value) {
    return
  }
  createTab(URL_QWEATHER_HOME)
}

const temperatureUnit = computed(() => WEATHER_TEMPERATURE_UNIT_MAP[localConfig.weather.temperatureUnit])
const speedUnit = computed(() => WEATHER_SPEED_UNIT_MAP[localConfig.weather.speedUnit])

const customIconSize = getStyleField(WIDGET_CODE, 'iconSize', 'vmin')
const customLabelSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin', 1.4)
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin', 1.2)
const customLargeFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin', 1.5)
const customXLargeFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin', 2)
</script>

<template>
  <div id="now">
    <div class="now__icon">
      <div
        v-if="localConfig.weather.iconEnabled"
        class="icon__wrap"
        @click="onOpenWeather()"
      >
        <NPopover
          :show="weatherIndicesInfo.length > 0 && state.isIndicesVisible"
          trigger="manual"
        >
          <template #trigger>
            <div
              class="label__info"
              :class="{ 'label__info--move': isDragMode }"
              @mouseenter="handleIndicesMouseEnter()"
              @mouseleave="handleIndicesMouseLeave()"
            >
              <i :class="`qi-${weatherState.now.icon}`" />
            </div>
          </template>
          <p class="weather__indices">
            {{ weatherIndicesInfo }}
          </p>
        </NPopover>
      </div>
    </div>
    <div class="now__info">
      <!-- row 1 -->
      <div class="info__row">
        <div class="info__item">
          <div class="item__label">
            <div v-if="isWeatherWarning">
              <NPopover
                :style="{ width: '500px' }"
                :show="isMounted && warningVisible"
                trigger="manual"
              >
                <template #trigger>
                  <div
                    class="label__info"
                    :class="{ 'label__info--move': isDragMode }"
                    @mouseenter="handleWarningMouseEnter()"
                    @mouseleave="handleWarningMouseLeave()"
                    @click="onPinWarning()"
                  >
                    <Icon :icon="ICONS.warning" />
                  </div>
                </template>
                <div class="weather__indices_wrap">
                  <p class="weather__indices">
                    {{ weatherWarningInfo }}
                  </p>
                  <div
                    v-if="weatherState.state.isWarningVisible"
                    class="icon__wrap"
                    @click="onUnpinWarning()"
                  >
                    <Icon :icon="ICONS.closeCircleLine" />
                  </div>
                </div>
              </NPopover>
            </div>
          </div>
        </div>
        <div class="info__item">
          <div class="item__value">
            <span class="value__text value__text--l">{{ weatherState.now.text }}</span>
          </div>
        </div>
        <div class="info__item">
          <div class="item__label">
            <Icon :icon="ICONS.temp" />
          </div>
          <div class="item__value">
            <span class="value__text value__text--xl">{{ weatherState.now.temp }}</span>
            <span class="value__unit">{{ temperatureUnit }}</span>
          </div>
        </div>
        <div class="info__item">
          <div class="item__label">
            <Icon :icon="ICONS.temperatureFeelsLike" />
          </div>
          <div class="item__value">
            <span class="value__text value__text--xl">{{ weatherState.now.feelsLike }} </span>
            <span class="value__unit">{{ temperatureUnit }}</span>
          </div>
        </div>
        <div class="info__item">
          <div class="item__label">
            <Icon :icon="ICONS.plusMinusBold" />
          </div>
          <div class="item__value">
            <span class="value__text">{{ weatherState.forecast.list[0] && `${weatherState.forecast.list[0].tempMax} ~ ${weatherState.forecast.list[0].tempMin}` }} </span>
            <span class="value__unit">{{ temperatureUnit }}</span>
          </div>
        </div>
      </div>
      <!-- row 2 -->
      <div class="info__row">
        <div class="info__item">
          <div class="item__label">
            <Icon :icon="ICONS.air" />
          </div>
          <div class="item__value">
            <span class="value__text">{{ `${weatherState.air.category} / AQI ${weatherState.air.aqi}` }}</span>
          </div>
        </div>
        <div class="info__item">
          <div class="item__label">
            <Icon :icon="ICONS.humidity" />
          </div>
          <div class="item__value">
            <span class="value__text">{{ weatherState.now.humidity }}</span>
            <span class="value__unit">%</span>
          </div>
        </div>
        <div class="info__item">
          <div class="item__label">
            <Icon :icon="ICONS.windyFill" />
          </div>
          <div class="item__value">
            <span class="value__text">{{ `${weatherState.now.windDir} / ${weatherState.now.windScale} / ${weatherState.now.windSpeed}` }} </span>
            <span class="value__unit">{{ speedUnit }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.weather__indices_wrap {
  display: flex;
  .icon__wrap {
    cursor: pointer;
  }
}
.weather__indices {
  white-space: pre-line;
  line-height: 1.5;
}
#now {
  display: flex;
  justify-content: center;
  align-items: center;
  .now__icon {
    .icon__wrap {
      font-size: v-bind(customIconSize);
      cursor: pointer;
    }
  }
  .now__info {
    .info__row {
      display: flex;
      justify-content: center;
      align-items: center;
      .info__item {
        padding: 0 6px;
        display: flex;
        justify-content: center;
        align-items: center;
        .item__label {
          display: flex;
          align-items: center;
          font-size: v-bind(customLabelSize);
          .label__info {
            cursor: pointer;
          }
          .label__info--move {
            cursor: move !important;
          }
        }
        .item__value {
          margin-left: 6px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          .value__text {
            font-size: v-bind(customFontSize);
          }
          .value__text--l {
            font-size: v-bind(customLargeFontSize);
          }
          .value__text--xl {
            font-size: v-bind(customXLargeFontSize);
          }
          .value__text--bold {
            font-weight: bold;
          }
          .value__unit {
            font-size: v-bind(customFontSize);
          }
        }
      }
    }
  }
}
</style>
