<script setup lang="ts">
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { localConfig } from '@/logic/config/state'
import { getIsWidgetRender, getStyleField } from '@/logic/store/style'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const customPaddingVertical = getStyleField(
  WIDGET_CODE,
  'paddingVertical',
  'px',
)
const customPaddingHorizontal = getStyleField(
  WIDGET_CODE,
  'paddingHorizontal',
  'px',
)
const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customPrimaryColor = getStyleField(WIDGET_CODE, 'primaryColor')
const customSecondaryColor = getStyleField(WIDGET_CODE, 'secondaryColor')
const customBackgroundColor = getStyleField(WIDGET_CODE, 'backgroundColor')
const customGlowIntensity = getStyleField(WIDGET_CODE, 'glowIntensity', 'px')
const customBorderColor = getStyleField(WIDGET_CODE, 'borderColor')
const customBorderWidth = getStyleField(WIDGET_CODE, 'borderWidth', 'px')
const customBorderRadius = getStyleField(WIDGET_CODE, 'borderRadius', 'px')
const customFrameColor = getStyleField(WIDGET_CODE, 'frameColor')
const customAccentColor = getStyleField(WIDGET_CODE, 'accentColor')

const clockNeonStyle = computed(() => ({
  '--nt-cn-customPaddingVertical': customPaddingVertical.value,
  '--nt-cn-customPaddingHorizontal': customPaddingHorizontal.value,
  '--nt-cn-customFontFamily': customFontFamily.value,
  '--nt-cn-customFontSize': customFontSize.value,
  '--nt-cn-customFontColor': customFontColor.value,
  '--nt-cn-customPrimaryColor': customPrimaryColor.value,
  '--nt-cn-customSecondaryColor': customSecondaryColor.value,
  '--nt-cn-customBackgroundColor': customBackgroundColor.value,
  '--nt-cn-customGlowIntensity': customGlowIntensity.value,
  '--nt-cn-customBorderColor': customBorderColor.value,
  '--nt-cn-customBorderWidth': customBorderWidth.value,
  '--nt-cn-customBorderRadius': customBorderRadius.value,
  '--nt-cn-customFrameColor': customFrameColor.value,
  '--nt-cn-customAccentColor': customAccentColor.value,
}))

const isRender = getIsWidgetRender(WIDGET_CODE)

const state = reactive({
  hours: '00',
  minutes: '00',
  seconds: '00',
  colonVisible: true,
})

const updateTime = () => {
  const now = new Date()
  let hours = now.getHours()
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()

  if (!localConfig.clockNeon.is24Hour) {
    hours = hours % 12 || 12
  }

  state.hours = hours.toString().padStart(2, '0')
  state.minutes = minutes.toString().padStart(2, '0')
  state.seconds = seconds.toString().padStart(2, '0')

  state.colonVisible = !state.colonVisible
}

watch(
  isRender,
  (value) => {
    if (!value) {
      removeTimerTask(WIDGET_CODE)
      return
    }
    updateTime()
    addTimerTask(WIDGET_CODE, updateTime)
  },
  { immediate: true },
)

const showFrame = computed(() => localConfig.clockNeon.showFrame)
const isBorderEnabled = computed(() => localConfig.clockNeon.isBorderEnabled)
const showSeconds = computed(() => localConfig.clockNeon.showSeconds)
const showLabel = computed(() => localConfig.clockNeon.showLabel)
const labelLeft = computed(() => localConfig.clockNeon.labelLeft)
const labelRight = computed(() => localConfig.clockNeon.labelRight)

const digitDelays = ['0s', '0.4s', '1.2s', '0.8s', '2.1s', '0.6s']
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div class="clockNeon__container">
      <div
        class="neon__frame"
        :class="{
          'neon__frame--border': isBorderEnabled,
          'neon__frame--visible': showFrame,
        }"
        :style="clockNeonStyle"
      >
        <!-- 扫描线遮罩 -->
        <div class="neon__scanlines" />
        <!-- 双色环境光：左青右品红 -->
        <div class="neon__ambient neon__ambient--left" />
        <div class="neon__ambient neon__ambient--right" />

        <div class="neon__display">
          <!-- Hours - 青色 -->
          <div class="neon__digit-group neon__digit-group--primary">
            <span
              v-for="(digit, idx) in state.hours.split('')"
              :key="`hour-${idx}`"
              class="neon__digit"
              :style="{ animationDelay: digitDelays[idx] }"
            >
              <span class="neon__digit-ghost">{{ digit }}</span>
              <span class="neon__digit-lit neon__digit-lit--primary">{{
                digit
              }}</span>
            </span>
          </div>

          <div class="neon__separator">
            <span
              class="neon__dot neon__dot--primary"
              :class="{ 'neon__dot--dim': !state.colonVisible }"
            />
            <span
              class="neon__dot neon__dot--secondary"
              :class="{ 'neon__dot--dim': !state.colonVisible }"
            />
          </div>

          <!-- Minutes - 品红色 -->
          <div class="neon__digit-group neon__digit-group--secondary">
            <span
              v-for="(digit, idx) in state.minutes.split('')"
              :key="`minute-${idx}`"
              class="neon__digit"
              :style="{ animationDelay: digitDelays[idx + 2] }"
            >
              <span class="neon__digit-ghost neon__digit-ghost--secondary">{{
                digit
              }}</span>
              <span class="neon__digit-lit neon__digit-lit--secondary">{{
                digit
              }}</span>
            </span>
          </div>

          <template v-if="showSeconds">
            <div class="neon__separator neon__separator--small">
              <span
                class="neon__dot neon__dot--small neon__dot--secondary"
                :class="{ 'neon__dot--dim': !state.colonVisible }"
              />
              <span
                class="neon__dot neon__dot--small neon__dot--primary"
                :class="{ 'neon__dot--dim': !state.colonVisible }"
              />
            </div>

            <!-- Seconds - 混合色，偏小 -->
            <div class="neon__digit-group neon__digit-group--accent">
              <span
                v-for="(digit, idx) in state.seconds.split('')"
                :key="`second-${idx}`"
                class="neon__digit neon__digit--small"
                :style="{ animationDelay: digitDelays[idx + 4] }"
              >
                <span class="neon__digit-ghost neon__digit-ghost--accent">{{
                  digit
                }}</span>
                <span class="neon__digit-lit neon__digit-lit--accent">{{
                  digit
                }}</span>
              </span>
            </div>
          </template>
        </div>

        <!-- 底部标签装饰 -->
        <div
          v-if="showLabel"
          class="neon__label"
        >
          <span class="neon__label-text">{{ labelLeft }}</span>
          <span class="neon__label-dot" />
          <span class="neon__label-text">{{ labelRight }}</span>
        </div>
      </div>
    </div>
  </WidgetWrap>
</template>

<style>
#clockNeon {
  user-select: none;

  .clockNeon__container {
    z-index: 10;
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;

    .neon__frame {
      position: relative;
      padding: var(--nt-cn-customPaddingVertical)
        var(--nt-cn-customPaddingHorizontal);
      background: var(--nt-cn-customBackgroundColor);
      border-radius: var(--nt-cn-customBorderRadius);
      transition:
        opacity 0.3s ease,
        box-shadow 0.3s ease,
        border-color 0.3s ease;
      backdrop-filter: blur(12px);
      overflow: hidden;

      /* 玻璃反光 */
      &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 40%;
        background: linear-gradient(
          180deg,
          rgba(255, 255, 255, 0.05) 0%,
          transparent 100%
        );
        pointer-events: none;
        z-index: 1;
      }

      &.neon__frame--border {
        border: var(--nt-cn-customBorderWidth) solid
          var(--nt-cn-customBorderColor);
        box-shadow:
          0 0 6px var(--nt-cn-customBorderColor),
          0 0 14px var(--nt-cn-customBorderColor),
          0 0 var(--nt-cn-customGlowIntensity) var(--nt-cn-customBorderColor),
          0 0 calc(var(--nt-cn-customGlowIntensity) * 2)
            var(--nt-cn-customBorderColor),
          inset 0 0 16px rgba(0, 0, 0, 0.6),
          inset 0 1px 0 rgba(255, 255, 255, 0.06);
      }

      /* 内框装饰：双色角标 */
      &.neon__frame--visible {
        &::after {
          content: '';
          position: absolute;
          top: 6px;
          left: 6px;
          right: 6px;
          bottom: 6px;
          pointer-events: none;
          z-index: 1;
          /* 用 outline + clip 做四角发光框 */
          border-top: 1px solid var(--nt-cn-customPrimaryColor);
          border-bottom: 1px solid var(--nt-cn-customSecondaryColor);
          border-left: 1px solid var(--nt-cn-customPrimaryColor);
          border-right: 1px solid var(--nt-cn-customSecondaryColor);
          border-radius: calc(var(--nt-cn-customBorderRadius) - 4px);
          box-shadow:
            /* 内框主色发光 */
            0 0 3px var(--nt-cn-customFrameColor),
            inset 0 0 3px var(--nt-cn-customFrameColor);
          opacity: 0.7;
        }
      }

      /* 扫描线 */
      .neon__scanlines {
        position: absolute;
        inset: 0;
        background: repeating-linear-gradient(
          0deg,
          transparent,
          transparent 2px,
          rgba(0, 0, 0, 0.08) 2px,
          rgba(0, 0, 0, 0.08) 4px
        );
        pointer-events: none;
        z-index: 2;
        border-radius: var(--nt-cn-customBorderRadius);
      }

      /* 双色环境光 */
      .neon__ambient {
        position: absolute;
        width: 50%;
        top: 10%;
        bottom: 10%;
        filter: blur(30px);
        pointer-events: none;
        z-index: 0;
        opacity: 0.12;

        &.neon__ambient--left {
          left: 0;
          background: radial-gradient(
            ellipse at right center,
            var(--nt-cn-customPrimaryColor),
            transparent 70%
          );
        }

        &.neon__ambient--right {
          right: 0;
          background: radial-gradient(
            ellipse at left center,
            var(--nt-cn-customSecondaryColor),
            transparent 70%
          );
        }
      }

      .neon__display {
        position: relative;
        display: flex;
        align-items: center;
        gap: 6px;
        font-family: var(--nt-cn-customFontFamily), 'Orbitron', monospace;
        z-index: 3;

        .neon__digit-group {
          display: flex;
          gap: 3px;
        }

        /* 数字容器 */
        .neon__digit {
          position: relative;
          font-size: var(--nt-cn-customFontSize);
          font-weight: 900;
          width: 0.65em;
          display: inline-block;
          text-align: center;
          animation: neonFlicker 10s infinite;
          /* 告知浏览器此元素需独立合成层，以防止 opacity 动画影响周边 widget 渲染 */
          will-change: opacity;

          /* 熄灭轮廓 */
          .neon__digit-ghost {
            position: absolute;
            inset: 0;
            opacity: 0.07;
            filter: blur(0.5px);
            text-shadow: none;
            color: var(--nt-cn-customFontColor);

            &.neon__digit-ghost--secondary {
              color: var(--nt-cn-customSecondaryColor);
            }

            &.neon__digit-ghost--accent {
              color: var(--nt-cn-customAccentColor);
              opacity: 0.1;
            }
          }

          /* 点亮发光 - 青色（小时） */
          .neon__digit-lit {
            position: relative;

            &.neon__digit-lit--primary {
              color: var(--nt-cn-customFontColor);
              text-shadow:
                0 0 2px #fff,
                0 0 5px #fff,
                0 0 10px var(--nt-cn-customFontColor),
                0 0 20px var(--nt-cn-customPrimaryColor),
                0 0 35px var(--nt-cn-customPrimaryColor),
                0 0 var(--nt-cn-customGlowIntensity)
                  var(--nt-cn-customPrimaryColor),
                /* 赛博朋克特征：互补色边缘光晕（品红渗透） */ 2px 0 8px
                  var(--nt-cn-customSecondaryColor),
                -1px 0 4px var(--nt-cn-customSecondaryColor);
            }

            /* 点亮发光 - 品红色（分钟） */
            &.neon__digit-lit--secondary {
              color: var(--nt-cn-customSecondaryColor);
              text-shadow:
                0 0 2px #fff,
                0 0 5px #fff,
                0 0 10px var(--nt-cn-customSecondaryColor),
                0 0 20px var(--nt-cn-customSecondaryColor),
                0 0 35px var(--nt-cn-customSecondaryColor),
                0 0 var(--nt-cn-customGlowIntensity)
                  var(--nt-cn-customSecondaryColor),
                /* 互补色边缘光晕（青色渗透） */ -2px 0 8px
                  var(--nt-cn-customPrimaryColor),
                1px 0 4px var(--nt-cn-customPrimaryColor);
            }

            /* 秒数 - 强调色 */
            &.neon__digit-lit--accent {
              color: var(--nt-cn-customAccentColor);
              text-shadow:
                0 0 2px #fff,
                0 0 6px var(--nt-cn-customAccentColor),
                0 0 14px var(--nt-cn-customAccentColor),
                0 0 24px var(--nt-cn-customAccentColor),
                0 0 var(--nt-cn-customGlowIntensity)
                  var(--nt-cn-customAccentColor);
            }
          }

          &.neon__digit--small {
            font-size: calc(var(--nt-cn-customFontSize) * 0.58);
            opacity: 0.9;
          }
        }

        /* 分隔点 */
        .neon__separator {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.2em;
          height: var(--nt-cn-customFontSize);
          width: 0.3em;
          z-index: 3;

          &.neon__separator--small {
            height: calc(var(--nt-cn-customFontSize) * 0.58);
            gap: 0.15em;
          }

          .neon__dot {
            width: 0.11em;
            height: 0.11em;
            min-width: 4px;
            min-height: 4px;
            border-radius: 50%;
            transition:
              opacity 0.2s ease,
              box-shadow 0.2s ease;
            flex-shrink: 0;

            &.neon__dot--primary {
              background-color: var(--nt-cn-customFontColor);
              box-shadow:
                0 0 2px #fff,
                0 0 5px var(--nt-cn-customFontColor),
                0 0 10px var(--nt-cn-customPrimaryColor),
                0 0 18px var(--nt-cn-customPrimaryColor);
            }

            &.neon__dot--secondary {
              background-color: var(--nt-cn-customSecondaryColor);
              box-shadow:
                0 0 2px #fff,
                0 0 5px var(--nt-cn-customSecondaryColor),
                0 0 10px var(--nt-cn-customSecondaryColor),
                0 0 18px var(--nt-cn-customSecondaryColor);
            }

            &.neon__dot--small {
              width: 0.09em;
              height: 0.09em;
              min-width: 3px;
              min-height: 3px;
            }

            &.neon__dot--dim {
              opacity: 0.12;
              box-shadow: none;
            }
          }
        }
      }

      /* 底部装饰标签 */
      .neon__label {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;
        margin-top: 8px;
        z-index: 3;

        .neon__label-text {
          font-family: var(--nt-cn-customFontFamily), 'Orbitron', monospace;
          font-size: calc(var(--nt-cn-customFontSize) * 0.18);
          font-weight: 700;
          letter-spacing: 0.15em;
          color: var(--nt-cn-customFrameColor);
          opacity: 0.6;
          text-shadow:
            0 0 4px var(--nt-cn-customFrameColor),
            0 0 8px var(--nt-cn-customFrameColor);
        }

        .neon__label-dot {
          width: 3px;
          height: 3px;
          border-radius: 50%;
          background: var(--nt-cn-customFrameColor);
          opacity: 0.5;
          box-shadow: 0 0 4px var(--nt-cn-customFrameColor);
        }
      }
    }
  }
}

@keyframes neonFlicker {
  0%,
  100% {
    opacity: 1;
  }
  /* 偶发短闪 */
  88% {
    opacity: 1;
  }
  88.5% {
    opacity: 0.88;
  }
  89% {
    opacity: 1;
  }
  /* 偶发强闪 */
  95% {
    opacity: 1;
  }
  95.2% {
    opacity: 0.55;
  }
  95.5% {
    opacity: 1;
  }
  95.7% {
    opacity: 0.8;
  }
  96% {
    opacity: 1;
  }
}
</style>
