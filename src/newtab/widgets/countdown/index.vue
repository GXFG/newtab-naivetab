<script setup lang="ts">
import { Icon } from '@iconify/vue'
import { addTimerTask, removeTimerTask } from '@/logic/task'
import { localConfig } from '@/logic/config/state'
import { globalState } from '@/logic/store/state'
import { getIsWidgetRender, getStyleField } from '@/logic/store/style'
import {
  sendNotification,
  requestPermissionAsync,
} from '@/logic/utils/permission'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { ICONS } from '@/logic/constants/icons'
import { isDragMode } from '@/logic/moveable'
import WidgetWrap from '../WidgetWrap.vue'
import { WIDGET_CODE } from './config'

const customProgressColor = getStyleField(WIDGET_CODE, 'progressColor')
const customTrackColor = getStyleField(WIDGET_CODE, 'trackColor')
const customBackgroundColor = getStyleField(WIDGET_CODE, 'backgroundColor')
const customBackgroundBlur = getStyleField(WIDGET_CODE, 'backgroundBlur', 'px')
const customBorderColor = getStyleField(WIDGET_CODE, 'borderColor')
const customBorderWidth = getStyleField(WIDGET_CODE, 'borderWidth', 'px')
const customShadowColor = getStyleField(WIDGET_CODE, 'shadowColor')
const customSize = getStyleField(WIDGET_CODE, 'size', 'vmin')
const customClockFontFamily = getStyleField(WIDGET_CODE, 'clockFontFamily')
const customClockFontColor = getStyleField(WIDGET_CODE, 'clockFontColor')
const customClockFontSize = getStyleField(WIDGET_CODE, 'clockFontSize', 'vmin')
const customLabelFontFamily = getStyleField(WIDGET_CODE, 'labelFontFamily')
const customLabelFontSize = getStyleField(WIDGET_CODE, 'labelFontSize', 'px')
const customLabelFontColor = getStyleField(WIDGET_CODE, 'labelFontColor')

const countdownStyle = computed(() => ({
  '--nt-cd-clock-font-family': customClockFontFamily.value,
  '--nt-cd-clock-font-color': customClockFontColor.value,
  '--nt-cd-size': customSize.value,
  '--nt-cd-custom-background-color': customBackgroundColor.value,
  '--nt-cd-custom-background-blur': customBackgroundBlur.value,
  '--nt-cd-custom-border-color': customBorderColor.value,
  '--nt-cd-custom-border-width': customBorderWidth.value,
  '--nt-cd-custom-shadow-color': customShadowColor.value,
  '--nt-cd-custom-track-color': customTrackColor.value,
  '--nt-cd-custom-progress-color': customProgressColor.value,
  '--nt-cd-label-font-family': customLabelFontFamily.value,
  '--nt-cd-label-font-size': customLabelFontSize.value,
  '--nt-cd-label-font-color': customLabelFontColor.value,
  '--nt-cd-clock-font-size': customClockFontSize.value,
}))

const isRender = getIsWidgetRender(WIDGET_CODE)

// ─── 运行时持久化状态（与 localConfig 分离，不参与云同步）───
const countdownState = useStorageLocal('l-countdown-state', {
  initialRemaining: localConfig[WIDGET_CODE].defaultDuration,
  remainingSeconds: localConfig[WIDGET_CODE].defaultDuration,
  startedAt: 0,
  isRunning: false,
})

// ─── 时间分量计算 ───
const totalSeconds = computed(() =>
  Math.max(0, Math.floor(countdownState.value.remainingSeconds)),
)

const hh = computed(() =>
  String(Math.floor(totalSeconds.value / 3600)).padStart(2, '0'),
)
const mm = computed(() =>
  String(Math.floor((totalSeconds.value % 3600) / 60)).padStart(2, '0'),
)
const ss = computed(() => String(totalSeconds.value % 60).padStart(2, '0'))

const isFinished = computed(
  () =>
    countdownState.value.remainingSeconds <= 0 &&
    !countdownState.value.isRunning,
)
const isInitialState = computed(
  () =>
    Math.floor(countdownState.value.remainingSeconds) ===
      localConfig[WIDGET_CODE].defaultDuration &&
    !countdownState.value.isRunning,
)

// ─── 内联编辑状态 ───
const isEditing = ref(false)
const editH = ref(0)
const editM = ref(0)
const editS = ref(0)
const editContainerRef = ref<HTMLElement | null>(null)

const commitEdit = () => {
  if (!isEditing.value) return
  const h = Math.min(99, Math.max(0, editH.value || 0))
  const m = Math.min(59, Math.max(0, editM.value || 0))
  const s = Math.min(59, Math.max(0, editS.value || 0))
  const newTotal = Math.max(1, h * 3600 + m * 60 + s)
  localConfig[WIDGET_CODE].defaultDuration = newTotal
  countdownState.value.remainingSeconds = newTotal
  countdownState.value.initialRemaining = newTotal
  isEditing.value = false
  globalState.isInputFocused = false
}

const cancelEdit = () => {
  isEditing.value = false
  globalState.isInputFocused = false
}

const onDocumentMousedown = (e: MouseEvent) => {
  if (
    editContainerRef.value &&
    !editContainerRef.value.contains(e.target as Node)
  ) {
    commitEdit()
  }
}

const startEdit = () => {
  if (isDragMode.value || countdownState.value.isRunning) return
  editH.value = Number(hh.value)
  editM.value = Number(mm.value)
  editS.value = Number(ss.value)
  isEditing.value = true
  globalState.isInputFocused = true
  document.addEventListener('mousedown', onDocumentMousedown)
  nextTick(() => {
    const input = document.querySelector(
      '.countdown__edit-h',
    ) as HTMLInputElement
    input?.select()
  })
}

watch(isEditing, (val) => {
  if (!val) {
    document.removeEventListener('mousedown', onDocumentMousedown)
  }
})

// ─── 浏览器通知 ───
const sendFinishNotification = () => {
  sendNotification({
    title: window.$t('countdown.notifyTitle'),
    body: window.$t('countdown.notifyBody'),
  })
}

// ─── 计时 tick（时间戳差值保证精度）───
const tick = () => {
  if (!countdownState.value.isRunning) return
  const elapsed = (Date.now() - countdownState.value.startedAt) / 1000
  const remaining = countdownState.value.initialRemaining - elapsed
  if (remaining <= 0) {
    countdownState.value.remainingSeconds = 0
    countdownState.value.isRunning = false
    sendFinishNotification()
    // 闪烁 2 秒后自动重置
    setTimeout(() => {
      if (
        !countdownState.value.isRunning &&
        countdownState.value.remainingSeconds <= 0
      ) {
        handleReset()
      }
    }, 2000)
    return
  }
  countdownState.value.remainingSeconds = remaining
}

// ─── 控制操作 ───
const handleStart = () => {
  if (isDragMode.value || countdownState.value.remainingSeconds <= 0) return
  requestPermissionAsync('notifications')
  countdownState.value.startedAt = Date.now()
  countdownState.value.initialRemaining = countdownState.value.remainingSeconds
  countdownState.value.isRunning = true
}

const handlePause = () => {
  if (isDragMode.value || !countdownState.value.isRunning) return
  tick()
  countdownState.value.isRunning = false
}

const handleReset = () => {
  if (isDragMode.value) return
  countdownState.value.isRunning = false
  countdownState.value.remainingSeconds =
    localConfig[WIDGET_CODE].defaultDuration
  countdownState.value.initialRemaining =
    localConfig[WIDGET_CODE].defaultDuration
  countdownState.value.startedAt = 0
}

// defaultDuration 变化时，若未运行则同步剩余时间
watch(
  () => localConfig[WIDGET_CODE].defaultDuration,
  (newDuration) => {
    if (!countdownState.value.isRunning) {
      countdownState.value.remainingSeconds = newDuration
      countdownState.value.initialRemaining = newDuration
    }
  },
)

// ─── Widget 渲染生命周期 ───
watch(
  isRender,
  (value) => {
    if (!value) {
      removeTimerTask(WIDGET_CODE)
      return
    }
    if (countdownState.value.isRunning) {
      countdownState.value.startedAt = Date.now()
      countdownState.value.initialRemaining =
        countdownState.value.remainingSeconds
    }
    tick()
    addTimerTask(WIDGET_CODE, tick)
  },
  { immediate: true },
)

// ─── 进度环计算 ───
// SVG viewBox 100×100，圆心(50,50)，半径动态基于 strokeWidth
const svgRadius = computed(
  () => 50 - localConfig[WIDGET_CODE].strokeWidth / 2 - 1,
)
const circumference = computed(() => 2 * Math.PI * svgRadius.value)

const progressRatio = computed(() => {
  const total = countdownState.value.initialRemaining
  if (total <= 0) return 0
  return Math.max(0, Math.min(1, countdownState.value.remainingSeconds / total))
})

const strokeDashoffset = computed(
  () => circumference.value * (1 - progressRatio.value),
)
</script>

<template>
  <WidgetWrap :widget-code="WIDGET_CODE">
    <div
      class="countdown__container"
      :style="countdownStyle"
      :class="{
        'countdown__container--shadow': localConfig.countdown.isShadowEnabled,
        'countdown__container--finished': isFinished,
      }"
    >
      <!-- 玻璃背景圆 -->
      <div class="countdown__bg" />

      <!-- 进度环 SVG -->
      <svg
        class="countdown__ring"
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- 轨道 -->
        <circle
          cx="50"
          cy="50"
          :r="svgRadius"
          :stroke-width="localConfig.countdown.strokeWidth"
          :stroke="customTrackColor"
        />
        <!-- 进度弧 -->
        <circle
          class="ring__progress"
          cx="50"
          cy="50"
          :r="svgRadius"
          :stroke-width="localConfig.countdown.strokeWidth"
          stroke-linecap="round"
          :stroke="customProgressColor"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="strokeDashoffset"
        />
      </svg>

      <!-- 圆内内容 -->
      <div class="countdown__inner">
        <!-- 标签 -->
        <div
          v-if="localConfig.countdown.label"
          class="countdown__label"
        >
          {{ localConfig.countdown.label }}
        </div>

        <!-- 时间显示（未编辑时） -->
        <div
          v-if="!isEditing"
          class="countdown__time"
          :class="{
            'countdown__time--editable':
              !isDragMode && !countdownState.isRunning,
          }"
          @click="startEdit"
        >
          <template v-if="localConfig.countdown.showHours">
            <span class="time__digit">{{ hh }}</span>
            <span class="time__colon">:</span>
          </template>
          <span class="time__digit">{{ mm }}</span>
          <span class="time__colon">:</span>
          <span class="time__digit">{{ ss }}</span>
        </div>

        <!-- 编辑态：三字段同时显示，覆盖在圆内 -->
        <div
          v-else
          ref="editContainerRef"
          class="countdown__edit"
        >
          <template v-if="localConfig.countdown.showHours">
            <div class="edit__field">
              <button
                class="edit__spin"
                tabindex="-1"
                @mousedown.prevent="editH = Math.min(99, (editH || 0) + 1)"
              >
                <Icon :icon="ICONS.countdownSpinUp" />
              </button>
              <input
                v-model.number="editH"
                class="countdown__edit-h edit__input"
                type="number"
                min="0"
                max="99"
                @keydown.enter="commitEdit"
                @keydown.escape="cancelEdit"
              />
              <button
                class="edit__spin"
                tabindex="-1"
                @mousedown.prevent="editH = Math.max(0, (editH || 0) - 1)"
              >
                <Icon :icon="ICONS.countdownSpinDown" />
              </button>
            </div>
            <span class="edit__colon">:</span>
          </template>
          <div class="edit__field">
            <button
              class="edit__spin"
              tabindex="-1"
              @mousedown.prevent="editM = Math.min(59, (editM || 0) + 1)"
            >
              <Icon :icon="ICONS.countdownSpinUp" />
            </button>
            <input
              v-model.number="editM"
              class="edit__input"
              type="number"
              min="0"
              max="59"
              @keydown.enter="commitEdit"
              @keydown.escape="cancelEdit"
            />
            <button
              class="edit__spin"
              tabindex="-1"
              @mousedown.prevent="editM = Math.max(0, (editM || 0) - 1)"
            >
              <Icon :icon="ICONS.countdownSpinDown" />
            </button>
          </div>
          <span class="edit__colon">:</span>
          <div class="edit__field">
            <button
              class="edit__spin"
              tabindex="-1"
              @mousedown.prevent="editS = Math.min(59, (editS || 0) + 1)"
            >
              <Icon :icon="ICONS.countdownSpinUp" />
            </button>
            <input
              v-model.number="editS"
              class="edit__input"
              type="number"
              min="0"
              max="59"
              @keydown.enter="commitEdit"
              @keydown.escape="cancelEdit"
            />
            <button
              class="edit__spin"
              tabindex="-1"
              @mousedown.prevent="editS = Math.max(0, (editS || 0) - 1)"
            >
              <Icon :icon="ICONS.countdownSpinDown" />
            </button>
          </div>
        </div>

        <!-- 控制按钮 -->
        <div class="countdown__controls">
          <!-- 主按钮：开始 / 暂停，固定位置 -->
          <button
            v-if="!isFinished && !isEditing"
            class="control__btn control__btn--main"
            :disabled="isDragMode || countdownState.remainingSeconds <= 0"
            @click="countdownState.isRunning ? handlePause() : handleStart()"
          >
            <Icon
              :icon="
                countdownState.isRunning
                  ? ICONS.countdownPause
                  : ICONS.countdownPlay
              "
            />
          </button>
          <!-- 重置按钮：仅暂停时显示，小号，紧靠主按钮 -->
          <button
            v-if="
              !countdownState.isRunning &&
              !isInitialState &&
              !isEditing &&
              !isFinished
            "
            class="control__btn control__btn--reset"
            :disabled="isDragMode"
            @click="handleReset"
          >
            <Icon :icon="ICONS.countdownRestore" />
          </button>
        </div>
      </div>
    </div>
  </WidgetWrap>
</template>

<style>
#countdown {
  user-select: none;

  .countdown__container {
    z-index: var(--nt-z-index);
    position: absolute;
    width: var(--nt-cd-size);
    height: var(--nt-cd-size);
    font-family: var(--nt-cd-clock-font-family);
    color: var(--nt-cd-clock-font-color);

    /* 玻璃背景圆 */
    .countdown__bg {
      position: absolute;
      inset: 0;
      border-radius: 50%;
      background: var(--nt-cd-custom-background-color);
      backdrop-filter: blur(var(--nt-cd-custom-background-blur));
      border: var(--nt-cd-custom-border-width) solid
        var(--nt-cd-custom-border-color);
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }

    &.countdown__container--shadow .countdown__bg {
      box-shadow:
        0 2px 4px var(--nt-cd-custom-shadow-color),
        0 6px 16px var(--nt-cd-custom-shadow-color),
        inset 0 1px 0 rgba(255, 255, 255, 0.08);
    }

    /* SVG 进度环 */
    .countdown__ring {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      transform: rotate(-90deg);

      .ring__progress {
        transition: stroke-dashoffset 0.6s cubic-bezier(0.4, 0, 0.2, 1);
        filter: drop-shadow(0 0 3px var(--nt-cd-custom-progress-color));
      }
    }

    /* 圆内内容 */
    .countdown__inner {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;

      .countdown__label {
        position: absolute;
        top: 20%;
        left: 50%;
        transform: translateX(-50%);
        white-space: nowrap;
        font-family: var(--nt-cd-label-font-family);
        font-size: var(--nt-cd-label-font-size);
        color: var(--nt-cd-label-font-color);
        line-height: 1;
        pointer-events: none;
      }

      .countdown__time,
      .countdown__edit {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      }

      .countdown__time {
        font-size: var(--nt-cd-clock-font-size);
        letter-spacing: 0.02em;
        line-height: 1;
        display: flex;
        align-items: center;
        border-radius: 0.4vmin;
        transition: background 0.15s ease;

        &.countdown__time--editable {
          cursor: text;
          &:hover {
            background: rgba(255, 255, 255, 0.08);
          }
        }

        .time__digit {
          display: inline-block;
          text-align: center;
        }

        .time__colon {
          display: inline-block;
          padding: 0 0.04em;
          opacity: 0.4;
        }
      }

      /* 编辑态：与时间完全重叠，切换无跳动 */
      .countdown__edit {
        display: flex;
        align-items: center;
        gap: 0.3vmin;

        .edit__field {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.2vmin;
        }

        .edit__spin {
          display: flex;
          align-items: center;
          justify-content: center;
          background: transparent;
          border: none;
          color: inherit;
          font-size: 2vmin;
          width: 2ch;
          padding: 0.1vmin 0;
          cursor: pointer;
          opacity: 0.5;
          transition:
            background 0.15s ease,
            opacity 0.15s ease,
            transform 0.1s ease,
            border-color 0.15s ease;

          &:hover {
            transform: scale(1.3);
            opacity: 1;
          }
        }

        .edit__input {
          width: 2ch;
          height: 1em;
          box-sizing: content-box;
          background: transparent;
          border: none;
          border-bottom: 1px solid rgba(255, 255, 255, 0.4);
          color: inherit;
          font-size: var(--nt-cd-clock-font-size);
          font-family: var(--nt-cd-clock-font-family);
          text-align: center;
          line-height: 1;
          outline: none;
          padding: 0;
          display: block;

          &::-webkit-inner-spin-button,
          &::-webkit-outer-spin-button {
            -webkit-appearance: none;
          }
        }

        .edit__colon {
          opacity: 0.4;
          font-size: var(--nt-cd-clock-font-size);
          line-height: 1;
        }
      }

      /* 按钮区域：固定在底部 */
      .countdown__controls {
        position: absolute;
        bottom: 18%;
        display: flex;
        align-items: center;
        justify-content: center;

        .control__btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.15);
          color: inherit;
          cursor: pointer;
          opacity: 0.85;
          transition:
            background 0.15s ease,
            opacity 0.15s ease,
            transform 0.1s ease,
            border-color 0.15s ease;
          backdrop-filter: blur(4px);

          &:hover {
            background: rgba(255, 255, 255, 0.28);
            border-color: rgba(255, 255, 255, 0.4);
            opacity: 1;
            transform: scale(1.12);
          }

          &:active {
            transform: scale(0.92);
          }

          &:disabled {
            opacity: 0.15;
            cursor: not-allowed;
            transform: none;
          }
        }

        /* 主按钮：开始 / 暂停 */
        .control__btn--main {
          width: 3vmin;
          height: 3vmin;
          font-size: 1.5vmin;
        }

        /* 重置按钮：小号，绝对定位在主按钮右侧 */
        .control__btn--reset {
          position: absolute;
          left: calc(100% + 0.8vmin);
          width: 2vmin;
          height: 2vmin;
          font-size: 1vmin;
          opacity: 0.6;
        }
      }
    }
  }
}

/* 结束闪烁 */
@keyframes countdown-blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.2;
  }
}

#countdown {
  .countdown__container--finished .countdown__time {
    animation: countdown-blink 1.2s ease-in-out infinite;
  }
}
</style>
