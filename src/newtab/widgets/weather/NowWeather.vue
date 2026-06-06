<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { ICONS } from '@/logic/constants/icons'
import {
  WEATHER_TEMPERATURE_UNIT_MAP,
  WEATHER_SPEED_UNIT_MAP,
} from '@/logic/constants/weather'
import { URL_QWEATHER_HOME } from '@/logic/constants/urls'
import { createTab } from '@/logic/utils/common'
import { isDragMode } from '@/logic/moveable'
import { localConfig, localState } from '@/logic/config/state'
import { globalState } from '@/logic/store/state'
import { getStyleField } from '@/logic/store/style'
import {
  weatherState,
  weatherIndicesInfo,
  weatherWarningInfo,
} from '@/newtab/widgets/weather/logic'
import { WIDGET_CODE } from './config'

const customIconSize = getStyleField(WIDGET_CODE, 'iconSize', 'vmin')
const customLabelSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin', 1.4)
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin', 1.2)
const customLargeFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin', 1.5)
const customXLargeFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin', 2.2)

const nowWeatherStyle = computed(() => ({
  '--nt-wn-icon-size': customIconSize.value,
  '--nt-wn-label-size': customLabelSize.value,
  '--nt-wn-font-size': customFontSize.value,
  '--nt-wn-large-font-size': customLargeFontSize.value,
  '--nt-wn-xlarge-font-size': customXLargeFontSize.value,
}))

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

const isWeatherWarning = computed(
  () => weatherState.value.warning.list.length > 0,
)

const warningVisible = computed(() => {
  if (
    isDragMode.value ||
    localState.value.isFocusMode ||
    globalState.isSettingDrawerVisible
  ) {
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

const temperatureUnit = computed(
  () =>
    WEATHER_TEMPERATURE_UNIT_MAP[
      localConfig.weather
        .temperatureUnit as keyof typeof WEATHER_TEMPERATURE_UNIT_MAP
    ],
)
const speedUnit = computed(
  () =>
    WEATHER_SPEED_UNIT_MAP[
      localConfig.weather.speedUnit as keyof typeof WEATHER_SPEED_UNIT_MAP
    ],
)
</script>

<template>
  <div
    id="now"
    :style="nowWeatherStyle"
  >
    <!-- 天气图标区域 -->
    <div
      v-if="localConfig.weather.iconEnabled"
      class="now__icon-section"
      @click="onOpenWeather()"
    >
      <NTPopover
        :show="weatherIndicesInfo.length > 0 && state.isIndicesVisible"
        trigger="manual"
      >
        <template #trigger>
          <div
            class="weather-icon__wrap"
            :class="{ 'weather-icon__wrap--move': isDragMode }"
            @mouseenter="handleIndicesMouseEnter()"
            @mouseleave="handleIndicesMouseLeave()"
          >
            <i :class="`qi-${weatherState.now.icon}`" />
          </div>
        </template>
        <p class="weather__indices">
          {{ weatherIndicesInfo }}
        </p>
      </NTPopover>
    </div>

    <!-- 右侧信息区域 -->
    <div class="now__info">
      <!-- 主要信息区（单行：状态 | 温度 | 体感 | 范围） -->
      <div class="info__main">
        <div class="info__temp-row">
          <!-- 天气状态 + 警告 -->
          <div class="temp__condition">
            <span class="text__condition">{{ weatherState.now.text }}</span>
            <div
              v-if="isWeatherWarning"
              class="warning__trigger"
            >
              <NTPopover
                :style="{ width: '500px' }"
                :show="isMounted && warningVisible"
                trigger="manual"
              >
                <template #trigger>
                  <div
                    class="warning__icon"
                    :class="{ 'label__info--move': isDragMode }"
                    @mouseenter="handleWarningMouseEnter()"
                    @mouseleave="handleWarningMouseLeave()"
                    @click.stop="onPinWarning()"
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
                    class="icon__wrap warning__close"
                    @click="onUnpinWarning()"
                  >
                    <Icon :icon="ICONS.closeCircleLine" />
                  </div>
                </div>
              </NTPopover>
            </div>
          </div>

          <div class="temp__divider" />

          <!-- 当前温度 -->
          <div class="temp__primary">
            <Icon
              class="temp__icon"
              :icon="ICONS.temp"
            />
            <span class="temp__value">{{ weatherState.now.temp }}</span>
            <span class="temp__unit">{{ temperatureUnit }}</span>
          </div>

          <div class="temp__divider" />

          <!-- 体感温度 -->
          <div class="temp__secondary">
            <span class="temp__secondary-label">{{
              $t('weather.feelsLike')
            }}</span>
            <span class="temp__secondary-value">{{
              weatherState.now.feelsLike
            }}</span>
            <span class="temp__secondary-unit">{{ temperatureUnit }}</span>
          </div>

          <div class="temp__divider" />

          <!-- 今日温度范围 -->
          <div class="temp__range">
            <span class="temp__range-value">
              {{
                weatherState.forecast.list[0] &&
                `${weatherState.forecast.list[0].tempMax}° / ${weatherState.forecast.list[0].tempMin}°`
              }}
            </span>
          </div>

          <div class="temp__divider" />

          <!-- 湿度 -->
          <div class="temp__humidity">
            <Icon
              class="detail__icon"
              :icon="ICONS.humidity"
            />
            <span class="temp__secondary-value">{{
              weatherState.now.humidity
            }}</span>
            <span class="temp__secondary-unit">%</span>
          </div>
        </div>
      </div>

      <!-- 次要信息行：空气 / 湿度 / 风 -->
      <div class="info__secondary">
        <div class="detail__item">
          <Icon
            class="detail__icon"
            :icon="ICONS.air"
          />
          <span class="detail__label">{{ weatherState.air.category }}</span>
          <span class="detail__badge">AQI {{ weatherState.air.aqi }}</span>
        </div>
        <div class="detail__dot" />
        <div class="detail__item">
          <Icon
            class="detail__icon"
            :icon="ICONS.pm25"
          />
          <span class="detail__label">{{ weatherState.air.pm2p5 }}</span>
          <span class="detail__unit"> μg/m³</span>
        </div>
        <div class="detail__dot" />
        <div class="detail__item">
          <Icon
            class="detail__icon"
            :icon="ICONS.windyFill"
          />
          <span class="detail__label">{{ weatherState.now.windDir }}</span>
          <span class="detail__sub"
            >{{ weatherState.now.windScale
            }}{{ $t('weather.windScaleUnit') }}</span
          >
          <span class="detail__sub detail__sub--speed"
            >{{ weatherState.now.windSpeed
            }}<span class="detail__unit"> {{ speedUnit }}</span></span
          >
        </div>
      </div>

      <!-- 第三行：紫外线 / 日出 / 日落 -->
      <div
        v-if="weatherState.forecast.list[0]"
        class="info__extra"
      >
        <div class="detail__item">
          <Icon
            class="detail__icon"
            :icon="ICONS.uvIndex"
          />
          <span class="detail__label"
            >UV {{ weatherState.forecast.list[0].uvIndex }}</span
          >
        </div>
        <div class="detail__dot" />
        <div class="detail__item">
          <Icon
            class="detail__icon detail__icon--sunrise"
            :icon="ICONS.sunrise"
          />
          <span class="detail__label">{{
            weatherState.forecast.list[0].sunrise
          }}</span>
        </div>
        <div class="detail__dot" />
        <div class="detail__item">
          <Icon
            class="detail__icon detail__icon--sunset"
            :icon="ICONS.sunset"
          />
          <span class="detail__label">{{
            weatherState.forecast.list[0].sunset
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.weather__indices_wrap {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  .warning__close {
    cursor: pointer;
    opacity: 0.7;
    transition: opacity var(--transition-base);
    &:hover {
      opacity: 1;
    }
  }
}
.weather__indices {
  white-space: pre-line;
  line-height: 1.6;
}

#now {
  display: flex;
  align-items: center;
  gap: 14px;

  /* ── 天气图标区 ── */
  .now__icon-section {
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    transition:
      transform 0.3s cubic-bezier(0.34, 1.06, 0.64, 1),
      filter 0.25s ease;
    filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.15));

    &:hover {
      transform: scale(1.1) rotate(-5deg);
      filter: drop-shadow(0 4px 12px rgba(255, 255, 255, 0.35));
    }

    .weather-icon__wrap {
      font-size: var(--nt-wn-icon-size);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .weather-icon__wrap--move {
      cursor: move !important;
    }
  }

  /* ── 右侧信息列 ── */
  .now__info {
    display: flex;
    flex-direction: column;
    gap: 6px;

    /* 温度行（含天气状态） */
    .info__temp-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* 天气状态 + 警告 */
    .temp__condition {
      display: flex;
      align-items: center;
      gap: 5px;

      .text__condition {
        font-size: var(--nt-wn-large-font-size);
        font-weight: 700;
        letter-spacing: 0.03em;
        text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
        white-space: nowrap;
      }
      .warning__trigger {
        display: flex;
        align-items: center;
      }
      .warning__icon {
        display: flex;
        align-items: center;
        font-size: var(--nt-wn-label-size);
        cursor: pointer;
        color: #f5a623;
        filter: drop-shadow(0 0 4px rgba(245, 166, 35, 0.6));
        transition:
          transform var(--transition-base),
          filter var(--transition-base);
        &:hover {
          transform: scale(1.2);
          filter: drop-shadow(0 0 8px rgba(245, 166, 35, 0.9));
        }
      }
      .label__info--move {
        cursor: move !important;
      }
    }

    /* 当前温度（主） */
    .temp__primary {
      display: flex;
      align-items: baseline;
      gap: 2px;

      .temp__icon {
        font-size: var(--nt-wn-label-size);
        opacity: 0.75;
        /* svg icon 无法直接参与 baseline，用 translate 微调垂直居中 */
        transform: translateY(15%);
      }
      .temp__value {
        font-size: var(--nt-wn-xlarge-font-size);
        font-weight: 800;
        line-height: 1;
        letter-spacing: -1px;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
      }
      .temp__unit {
        font-size: var(--nt-wn-font-size);
        font-weight: 600;
        opacity: 0.8;
      }
    }

    /* 分隔线 */
    .temp__divider {
      width: 1px;
      height: 16px;
      background: currentColor;
      opacity: 0.2;
      flex-shrink: 0;
      border-radius: 1px;
    }

    /* 体感温度（次） */
    .temp__secondary {
      display: flex;
      align-items: flex-end;
      gap: 2px;

      .temp__secondary-label {
        font-size: calc(var(--nt-wn-font-size) * 0.9);
        opacity: 0.55;
        margin-bottom: 1px;
        letter-spacing: 0.02em;
      }
      .temp__secondary-value {
        font-size: var(--nt-wn-large-font-size);
        font-weight: 600;
        line-height: 1;
      }
      .temp__secondary-unit {
        font-size: var(--nt-wn-font-size);
        opacity: 0.7;
        margin-bottom: 1px;
      }
    }

    /* 湿度（第一行） */
    .temp__humidity {
      display: flex;
      align-items: center;
      gap: 2px;
      .detail__icon {
        font-size: var(--nt-wn-font-size);
        opacity: 0.7;
      }
    }

    /* 今日温度范围 */
    .temp__range {
      display: flex;
      align-items: center;

      .temp__range-value {
        font-size: var(--nt-wn-font-size);
        font-weight: 500;
        opacity: 0.75;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }
    }

    /* ── 次要信息行 ── */
    .info__secondary,
    .info__extra {
      display: flex;
      align-items: center;
      gap: 7px;
    }

    .detail__item {
      display: flex;
      align-items: center;
      gap: 3px;

      .detail__icon {
        font-size: var(--nt-wn-font-size);
        flex-shrink: 0;
        opacity: 0.7;
        &.detail__icon--sunrise {
          color: #f5c842;
          opacity: 0.9;
        }
        &.detail__icon--sunset {
          color: #a78bfa;
          opacity: 0.9;
        }
      }
      .detail__label {
        font-size: var(--nt-wn-font-size);
        font-weight: 500;
      }
      .detail__sub {
        font-size: calc(var(--nt-wn-font-size) * 0.9);
        opacity: 0.65;
        &::before {
          content: '·';
          margin: 0 2px;
          opacity: 0.6;
        }
        &.detail__sub--speed {
          opacity: 0.55;
        }
      }
      .detail__badge {
        font-size: calc(var(--nt-wn-font-size) * 0.85);
        padding: 1px 5px;
        border-radius: 3px;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.18);
        line-height: 1.5;
        font-weight: 500;
        letter-spacing: 0.02em;
        backdrop-filter: blur(4px);
      }
      .detail__unit {
        font-size: var(--nt-wn-font-size);
        opacity: 0.7;
      }
    }

    /* 圆点分隔 */
    .detail__dot {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: currentColor;
      opacity: 0.3;
      flex-shrink: 0;
    }
  }
}
</style>
