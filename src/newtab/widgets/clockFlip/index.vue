<script setup lang="ts">
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { localConfig } from '@/logic/config/state'
import { getIsWidgetRender, getStyleField } from '@/logic/store/style'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const customWidth = getStyleField(WIDGET_CODE, 'width', 'vmin')
const customHeight = getStyleField(WIDGET_CODE, 'height', 'vmin')
const customFontFamily = getStyleField(WIDGET_CODE, 'fontFamily')
const customFontSize = getStyleField(WIDGET_CODE, 'fontSize', 'vmin')
const customFontColor = getStyleField(WIDGET_CODE, 'fontColor')
const customCardColor = getStyleField(WIDGET_CODE, 'cardColor')
const customCardDividerColor = getStyleField(WIDGET_CODE, 'cardDividerColor')
const customBorderRadius = getStyleField(WIDGET_CODE, 'borderRadius', 'px')
const customCardGap = getStyleField(WIDGET_CODE, 'cardGap', 'px')
const customShadowColor = getStyleField(WIDGET_CODE, 'shadowColor')

const clockFlipStyle = computed(() => ({
  '--nt-cf-customWidth': customWidth.value,
  '--nt-cf-customHeight': customHeight.value,
  '--nt-cf-customFontFamily': customFontFamily.value,
  '--nt-cf-customFontSize': customFontSize.value,
  '--nt-cf-customFontColor': customFontColor.value,
  '--nt-cf-customCardColor': customCardColor.value,
  '--nt-cf-customCardDividerColor': customCardDividerColor.value,
  '--nt-cf-customBorderRadius': customBorderRadius.value,
  '--nt-cf-customCardGap': customCardGap.value,
  '--nt-cf-customShadowColor': customShadowColor.value,
}))

const isRender = getIsWidgetRender(WIDGET_CODE)

interface FlipCardData {
  current: string
  previous: string
  isFlipping: boolean
}

const getInitialTimeDigits = () => {
  const now = new Date()
  let hours = now.getHours()
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()
  if (!localConfig.clockFlip.is24Hour) {
    hours = hours % 12 || 12
  }
  const h = hours.toString().padStart(2, '0')
  const m = minutes.toString().padStart(2, '0')
  const s = seconds.toString().padStart(2, '0')
  return { h, m, s }
}

const { h: ih, m: im, s: is } = getInitialTimeDigits()

const state = reactive({
  hours: [
    { current: ih[0], previous: ih[0], isFlipping: false },
    { current: ih[1], previous: ih[1], isFlipping: false },
  ] as FlipCardData[],
  minutes: [
    { current: im[0], previous: im[0], isFlipping: false },
    { current: im[1], previous: im[1], isFlipping: false },
  ] as FlipCardData[],
  seconds: [
    { current: is[0], previous: is[0], isFlipping: false },
    { current: is[1], previous: is[1], isFlipping: false },
  ] as FlipCardData[],
  colonVisible: true,
})

// 统一追踪所有翻牌动画 timer，在 Widget 停用/卸载时一并清除，防止泄漏
const flipTimers: ReturnType<typeof setTimeout>[] = []

const clearFlipTimers = () => {
  while (flipTimers.length > 0) {
    clearTimeout(flipTimers.pop())
  }
}

const flipCard = (cards: FlipCardData[], index: number, newValue: string) => {
  const card = cards[index]
  if (card.current === newValue) return

  card.previous = card.current
  card.isFlipping = true

  // flipTop 动画: 0~350ms，flipBottom 动画: delay 400ms + duration 370ms = 770ms
  // 在 350ms 时更新 current（flipTop 结束时静态上半牌已显示新值）
  flipTimers.push(
    setTimeout(() => {
      card.current = newValue
    }, 350),
  )

  // 770ms 后全部动画结束，移除动画状态
  // 同时将 previous 同步为 current，以防止 flip--top 因 forwards 失效
  // 瞬间跳回 rotateX(0deg) 时显示旧值导致上半部分闪烁
  flipTimers.push(
    setTimeout(() => {
      card.previous = card.current
      card.isFlipping = false
    }, 770),
  )
}

const initTime = () => {
  const now = new Date()
  let hours = now.getHours()
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()

  if (!localConfig.clockFlip.is24Hour) {
    hours = hours % 12 || 12
  }

  const h = hours.toString().padStart(2, '0')
  const m = minutes.toString().padStart(2, '0')
  const s = seconds.toString().padStart(2, '0')

  // 直接设置值，不触发翻牌动画
  ;[h[0], h[1]].forEach((v, i) => {
    state.hours[i].current = v
    state.hours[i].previous = v
  })
  ;[m[0], m[1]].forEach((v, i) => {
    state.minutes[i].current = v
    state.minutes[i].previous = v
  })
  ;[s[0], s[1]].forEach((v, i) => {
    state.seconds[i].current = v
    state.seconds[i].previous = v
  })
}

const updateTime = () => {
  const now = new Date()
  let hours = now.getHours()
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()

  if (!localConfig.clockFlip.is24Hour) {
    hours = hours % 12 || 12
  }

  const h = hours.toString().padStart(2, '0')
  const m = minutes.toString().padStart(2, '0')
  const s = seconds.toString().padStart(2, '0')

  flipCard(state.hours, 0, h[0])
  flipCard(state.hours, 1, h[1])
  flipCard(state.minutes, 0, m[0])
  flipCard(state.minutes, 1, m[1])
  flipCard(state.seconds, 0, s[0])
  flipCard(state.seconds, 1, s[1])
  // 每秒切换冒号可见性，与系统时钟同步
  state.colonVisible = !state.colonVisible
}

watch(
  isRender,
  (value) => {
    if (!value) {
      removeTimerTask(WIDGET_CODE)
      // Widget 停用时清除所有进行中的翻牌 timer，防止回调修改已停用的状态
      clearFlipTimers()
      return
    }
    // 直接同步设值，不走 flipCard 动画，以避免首次渲染/重新启用时闪动
    initTime()
    addTimerTask(WIDGET_CODE, updateTime)
  },
  { immediate: true },
)

onUnmounted(() => {
  clearFlipTimers()
})

const isShadowEnabled = computed(() => localConfig.clockFlip.isShadowEnabled)
const showSeconds = computed(() => localConfig.clockFlip.showSeconds)
const showColon = computed(() => localConfig.clockFlip.showColon)
const colonBlinkEnabled = computed(
  () => localConfig.clockFlip.colonBlinkEnabled,
)
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="clockFlip__container"
      :class="{ 'clockFlip__container--shadow': isShadowEnabled }"
      :style="clockFlipStyle"
    >
      <div class="clock__cards">
        <!-- Hours -->
        <div class="cards__group">
          <div
            v-for="(card, idx) in state.hours"
            :key="`hour-${idx}`"
            class="flip-card"
          >
            <div class="flip-card__top">
              <span>{{ card.current }}</span>
            </div>
            <div class="flip-card__bottom">
              <span>{{ card.current }}</span>
            </div>
            <div
              class="flip-card__flip flip-card__flip--top"
              :class="{ 'flip-card__flip--animate': card.isFlipping }"
            >
              <span>{{ card.previous }}</span>
            </div>
            <div
              class="flip-card__flip flip-card__flip--bottom"
              :class="{ 'flip-card__flip--animate': card.isFlipping }"
            >
              <span>{{ card.current }}</span>
            </div>
          </div>
        </div>

        <span
          v-if="showColon"
          class="cards__divider"
          :class="{
            'cards__divider--dim': colonBlinkEnabled && !state.colonVisible,
          }"
          >:</span
        >

        <!-- Minutes -->
        <div class="cards__group">
          <div
            v-for="(card, idx) in state.minutes"
            :key="`minute-${idx}`"
            class="flip-card"
          >
            <div class="flip-card__top">
              <span>{{ card.current }}</span>
            </div>
            <div class="flip-card__bottom">
              <span>{{ card.current }}</span>
            </div>
            <div
              class="flip-card__flip flip-card__flip--top"
              :class="{ 'flip-card__flip--animate': card.isFlipping }"
            >
              <span>{{ card.previous }}</span>
            </div>
            <div
              class="flip-card__flip flip-card__flip--bottom"
              :class="{ 'flip-card__flip--animate': card.isFlipping }"
            >
              <span>{{ card.current }}</span>
            </div>
          </div>
        </div>

        <template v-if="showSeconds">
          <span
            v-if="showColon"
            class="cards__divider"
            :class="{
              'cards__divider--dim': colonBlinkEnabled && !state.colonVisible,
            }"
            >:</span
          >

          <!-- Seconds -->
          <div class="cards__group">
            <div
              v-for="(card, idx) in state.seconds"
              :key="`second-${idx}`"
              class="flip-card"
            >
              <div class="flip-card__top">
                <span>{{ card.current }}</span>
              </div>
              <div class="flip-card__bottom">
                <span>{{ card.current }}</span>
              </div>
              <div
                class="flip-card__flip flip-card__flip--top"
                :class="{ 'flip-card__flip--animate': card.isFlipping }"
              >
                <span>{{ card.previous }}</span>
              </div>
              <div
                class="flip-card__flip flip-card__flip--bottom"
                :class="{ 'flip-card__flip--animate': card.isFlipping }"
              >
                <span>{{ card.current }}</span>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </WidgetWrap>
</template>

<style>
#clockFlip {
  user-select: none;

  .clockFlip__container {
    z-index: var(--nt-z-index);
    position: absolute;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: var(--nt-cf-customFontFamily);

    .clock__cards {
      display: flex;
      align-items: center;
      gap: var(--nt-cf-customCardGap);

      .cards__group {
        display: flex;
        gap: var(--nt-cf-customCardGap);
      }

      .cards__divider {
        font-size: var(--nt-cf-customFontSize);
        color: var(--nt-cf-customFontColor);
        line-height: 1;
        font-weight: 700;
        letter-spacing: 0;
        opacity: 1;
        transition: opacity 0.15s ease;

        &.cards__divider--dim {
          opacity: 0;
        }
      }
    }
  }

  .clockFlip__container--shadow {
    .flip-card {
      box-shadow:
        0 2px 4px var(--nt-cf-customShadowColor),
        0 8px 24px var(--nt-cf-customShadowColor);
    }
  }

  .flip-card {
    position: relative;
    width: var(--nt-cf-customWidth);
    height: var(--nt-cf-customHeight);
    background: var(--nt-cf-customCardColor);
    border-radius: var(--nt-cf-customBorderRadius);

    /* 卡片边缘厚度：模拟纸板侧边 */
    box-shadow:
      0 1px 0 rgba(0, 0, 0, 0.15),
      0 -1px 0 rgba(0, 0, 0, 0.1),
      1px 0 0 rgba(0, 0, 0, 0.05),
      -1px 0 0 rgba(0, 0, 0, 0.05);

    /* 中间分割缝隙：加深折痕阴影 */
    &::before {
      content: '';
      position: absolute;
      top: calc(50% - 1px);
      left: 0;
      right: 0;
      height: 2px;
      background: var(--nt-cf-customCardDividerColor);
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      z-index: 20;
    }

    /* 卡片顶部高光线 */
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 1px;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.08),
        transparent
      );
      border-radius: var(--nt-cf-customBorderRadius)
        var(--nt-cf-customBorderRadius) 0 0;
      z-index: 20;
    }
  }

  .flip-card__top,
  .flip-card__bottom,
  .flip-card__flip {
    position: absolute;
    width: 100%;
    height: 50%;
    overflow: hidden;
  }

  /* 静态上半牌：显示数字上半段 */
  .flip-card__top {
    top: 0;
    border-radius: var(--nt-cf-customBorderRadius)
      var(--nt-cf-customBorderRadius) 0 0;
    background: var(--nt-cf-customCardColor);
    z-index: 1;

    span {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 200%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--nt-cf-customFontColor);
      font-size: var(--nt-cf-customFontSize);
      font-weight: 700;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }
  }

  /* 静态下半牌：显示数字下半段，略暗增加立体感 */
  .flip-card__bottom {
    bottom: 0;
    border-radius: 0 0 var(--nt-cf-customBorderRadius)
      var(--nt-cf-customBorderRadius);
    background: var(--nt-cf-customCardColor);
    z-index: 1;

    /* 下半部分渐变暗色遮罩，模拟真实翻页时钟的阴影质感 */
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.14),
        rgba(0, 0, 0, 0.06)
      );
      border-radius: 0 0 var(--nt-cf-customBorderRadius)
        var(--nt-cf-customBorderRadius);
      pointer-events: none;
    }

    span {
      position: absolute;
      bottom: 0;
      left: 0;
      width: 100%;
      height: 200%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--nt-cf-customFontColor);
      font-size: var(--nt-cf-customFontSize);
      font-weight: 700;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }
  }

  /* 翻转牌（覆盖在静态牌上方） */
  .flip-card__flip {
    background: var(--nt-cf-customCardColor);
    z-index: 5;

    span {
      position: absolute;
      left: 0;
      width: 100%;
      height: 200%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--nt-cf-customFontColor);
      font-size: var(--nt-cf-customFontSize);
      font-weight: 700;
      letter-spacing: -0.02em;
      font-variant-numeric: tabular-nums;
    }
  }

  /* 翻转牌上半：初始与静态上半牌重叠，翻转后折叠到中线 */
  .flip-card__flip--top {
    top: 0;
    transform-origin: bottom center;
    border-radius: var(--nt-cf-customBorderRadius)
      var(--nt-cf-customBorderRadius) 0 0;

    /* 翻转时的阴影遮罩（随翻转角度渐深） */
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0));
      border-radius: var(--nt-cf-customBorderRadius)
        var(--nt-cf-customBorderRadius) 0 0;
      pointer-events: none;
      opacity: 0;
    }

    span {
      top: 0;
    }
  }

  /* 翻转牌下半：初始折叠在中线处（90deg），翻转展开后覆盖静态下半牌显示新值 */
  .flip-card__flip--bottom {
    top: 50%;
    transform-origin: top center;
    transform: perspective(400px) rotateX(90deg);
    border-radius: 0 0 var(--nt-cf-customBorderRadius)
      var(--nt-cf-customBorderRadius);

    /* 下半翻牌的渐变阴影遮罩 */
    &::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        rgba(0, 0, 0, 0.22),
        rgba(0, 0, 0, 0.06)
      );
      border-radius: 0 0 var(--nt-cf-customBorderRadius)
        var(--nt-cf-customBorderRadius);
      pointer-events: none;
    }

    span {
      bottom: 0;
    }
  }

  .flip-card__flip--animate.flip-card__flip--top {
    animation: flipTop 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
    will-change: transform;

    &::after {
      animation: flipTopShadow 0.35s cubic-bezier(0.4, 0, 0.2, 1) forwards;
      will-change: opacity;
    }
  }

  .flip-card__flip--animate.flip-card__flip--bottom {
    animation: flipBottom 0.37s cubic-bezier(0.1, 0.8, 0.3, 1) 0.4s forwards;
    will-change: transform;
  }
}

@keyframes flipTop {
  0% {
    transform: perspective(400px) rotateX(0deg);
  }
  100% {
    transform: perspective(400px) rotateX(-90deg);
  }
}

@keyframes flipTopShadow {
  0% {
    opacity: 0;
    background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0));
  }
  100% {
    opacity: 1;
    background: linear-gradient(to bottom, transparent, rgba(0, 0, 0, 0.35));
  }
}

@keyframes flipBottom {
  0% {
    transform: perspective(400px) rotateX(90deg);
  }
  60% {
    transform: perspective(400px) rotateX(-2deg);
  }
  80% {
    transform: perspective(400px) rotateX(1deg);
  }
  100% {
    transform: perspective(400px) rotateX(0deg);
  }
}
</style>
