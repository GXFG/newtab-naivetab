<template>
  <div id="current">
    <div class="current__legend">
      <div class="legend__img">
        <img class="img__main" :src="`https://${globalState.localState.weather.current.condition.icon}`" />
      </div>
    </div>
    <div class="current__info">
      <div class="info__row">
        <div class="info__item">
          <div class="item__value">
            <span class="value__text">{{ globalState.localState.weather.current.condition.text }}</span>
          </div>
        </div>
        <div class="info__item">
          <div class="item__label">
            <raphael:temp />
          </div>
          <div class="item__value">
            <span class="value__text value__text--large">{{ `${globalState.setting.weather.temperatureUnit === 'c' ? globalState.localState.weather.current.temp_c : globalState.localState.weather.current.temp_f}` }} </span>
            <span class="value__unit">{{ temperatureUnit }}</span>
          </div>
        </div>
        <div class="info__item">
          <div class="item__label">
            <carbon:temperature-feels-like />
          </div>
          <div class="item__value">
            <span class="value__text value__text--large">{{ `${globalState.setting.weather.temperatureUnit === 'c' ? globalState.localState.weather.current.feelslike_c : globalState.localState.weather.current.feelslike_f}` }} </span>
            <span class="value__unit">{{ temperatureUnit }}</span>
          </div>
        </div>
      </div>
      <div class="info__row">
        <div class="info__item">
          <div class="item__label">
            <ri:windy-fill />
          </div>
          <div class="item__value">
            <span class="value__text">{{ `${globalState.localState.weather.current.wind_dir} / ${globalState.setting.weather.speedUnit === 'kph' ? globalState.localState.weather.current.wind_kph : globalState.localState.weather.current.wind_mph}` }} </span>
            <span class="value__unit">{{ speedUnit }}</span>
          </div>
        </div>
        <div class="info__item">
          <div class="item__label">
            <carbon:humidity />
          </div>
          <div class="item__value">
            <span class="value__text">{{ globalState.localState.weather.current.humidity }}</span>
            <span class="value__unit">%</span>
          </div>
        </div>
        <div class="info__item">
          <div class="item__label">
            <carbon:uv-index-alt />
          </div>
          <div class="item__value">
            <span class="value__text">{{ globalState.localState.weather.current.uv }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { WEATHER_TEMPERATURE_UNIT_MAP, WEATHER_SPEED_UNIT_MAP, globalState } from '@/logic'

const temperatureUnit = computed(() => WEATHER_TEMPERATURE_UNIT_MAP[globalState.setting.weather.temperatureUnit])
const speedUnit = computed(() => WEATHER_SPEED_UNIT_MAP[globalState.setting.weather.speedUnit])

const customIconSize = computed(() => `${globalState.style.weather.fontSize * 1.4}px`)
const customLargerFontSize = computed(() => `${globalState.style.weather.fontSize * 3.5}px`)
const customLargeFontSize = computed(() => `${globalState.style.weather.fontSize * 2}px`)
</script>

<style>
#current {
  display: flex;
  justify-content: center;
  align-items: center;
  .current__legend {
    .legend__img {
      width: 100px;
      height: 100px;
      .img__main {
        width: 100%;
      }
    }
  }
  .current__info {
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
          font-size: v-bind(customIconSize);
        }
        .item__value {
          margin-left: 6px;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          .value__text {
          }
          .value__text--large {
            font-size: v-bind(customLargeFontSize);
          }
          .value__text--larger {
            font-size: v-bind(customLargerFontSize);
          }
          .value__unit {
          }
        }
      }
    }
  }
}
</style>
