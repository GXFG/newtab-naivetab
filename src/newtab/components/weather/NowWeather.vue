<template>
  <div id="now">
    <div class="now__icon">
      <div v-if="globalState.setting.weather.iconEnabled" class="icon__wrap">
        <i :class="`qi-${globalState.localState.weather.now.icon}`" />
      </div>
    </div>
    <div class="now__info">
      <!-- row 1 -->
      <div class="info__row">
        <div class="info__item">
          <div class="item__label">
            <div v-if="isWarningVisible">
              <NTooltip :show="state.isWarningVisible" trigger="manual">
                <template #trigger>
                  <div
                    class="label__info"
                    :class="{ 'label__info--move': isDragMode }"
                    @mouseenter="handleWarningMouseEnter()"
                    @mouseleave="handleWarningMouseLeave()"
                  >
                    <emojione:warning />
                  </div>
                </template>
                <p class="weather__indices">
                  {{ warningInfo }}
                </p>
              </NTooltip>
            </div>
            <NTooltip :show="state.isIndicesVisible" trigger="manual">
              <template #trigger>
                <div
                  class="label__info"
                  :class="{ 'label__info--move': isDragMode }"
                  @mouseenter="handleIndicesMouseEnter()"
                  @mouseleave="handleIndicesMouseLeave()"
                  @click="onOpenWeather()"
                >
                  <heroicons-outline:information-circle />
                </div>
              </template>
              <p class="weather__indices">
                {{ indicesInfo }}
              </p>
            </NTooltip>
          </div>
          <div class="item__value">
            <span class="value__text value__text--l">{{ globalState.localState.weather.now.text }}</span>
          </div>
        </div>
        <div class="info__item">
          <div class="item__label">
            <raphael:temp />
          </div>
          <div class="item__value">
            <span class="value__text value__text--xl">{{ globalState.localState.weather.now.temp }}</span>
            <span class="value__unit">{{ temperatureUnit }}</span>
          </div>
        </div>
        <div class="info__item">
          <div class="item__label">
            <carbon:temperature-feels-like />
          </div>
          <div class="item__value">
            <span class="value__text value__text--xl">{{ globalState.localState.weather.now.feelsLike }} </span>
            <span class="value__unit">{{ temperatureUnit }}</span>
          </div>
        </div>
      </div>
      <!-- row 2 -->
      <div class="info__row">
        <div class="info__item">
          <div class="item__label">
            <entypo:air />
          </div>
          <div class="item__value">
            <span class="value__text">{{ `${globalState.localState.weather.air.category} / ${globalState.localState.weather.air.aqi}` }}</span>
          </div>
        </div>
        <div class="info__item">
          <div class="item__label">
            <carbon:humidity />
          </div>
          <div class="item__value">
            <span class="value__text">{{ globalState.localState.weather.now.humidity }}</span>
            <span class="value__unit">%</span>
          </div>
        </div>
        <div class="info__item">
          <div class="item__label">
            <ri:windy-fill />
          </div>
          <div class="item__value">
            <span class="value__text">{{
              `${globalState.localState.weather.now.windDir} / ${globalState.localState.weather.now.windScale} / ${globalState.localState.weather.now.windSpeed}`
            }}
            </span>
            <span class="value__unit">{{ speedUnit }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { URL_QWEATHER_HOME, WEATHER_TEMPERATURE_UNIT_MAP, WEATHER_SPEED_UNIT_MAP, isDragMode, globalState, getStyleField, createTab } from '@/logic'

const CNAME = 'weather'

const state = reactive({
  isWarningVisible: false,
  isIndicesVisible: false,
})

const isWarningVisible = computed(() => globalState.localState.weather.warning.list.length > 0)

const indicesInfo = computed(() => {
  const indicesList = globalState.localState.weather.indices.list.map((item: IndicesItem) => `${item.name}: [${item.category}] ${item.text}`)
  return indicesList.join('\n')
})

const warningInfo = computed(() => {
  const warningList = globalState.localState.weather.warning.list.map((item: WarningItem) => `${item.title} \n ${item.text}`)
  return warningList.join('\n')
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

const temperatureUnit = computed(() => WEATHER_TEMPERATURE_UNIT_MAP[globalState.setting.weather.temperatureUnit])
const speedUnit = computed(() => WEATHER_SPEED_UNIT_MAP[globalState.setting.weather.speedUnit])

const customIconSize = getStyleField(CNAME, 'iconSize', 'px')
const customLabelSize = getStyleField(CNAME, 'fontSize', 'px', 1.4)
const customFontSize = getStyleField(CNAME, 'fontSize', 'px', 1.2)
const customLargeFontSize = getStyleField(CNAME, 'fontSize', 'px', 1.5)
const customXLargeFontSize = getStyleField(CNAME, 'fontSize', 'px', 2)
</script>

<style>
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
          }
          .value__text--l {
            font-size: v-bind(customLargeFontSize);
          }
          .value__text--xl {
            font-size: v-bind(customXLargeFontSize);
          }
          .value__unit {
          }
        }
      }
    }
  }
}
</style>
