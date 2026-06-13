<script setup lang="ts">
/**
 * @module BackgroundShimmer
 * @description 幻彩背景渲染组件。纯 CSS 动画实现，通过 :class 切换 .shimmer--{effect} 切换效果，
 *   通过 :style 注入 --shimmer-c1～--shimmer-c6（颜色）和 --shimmer-speed（速度，在父容器上供子元素继承）。
 *   通过 template ref 控制 animation-play-state，切到后台时 paused、回来时 running。
 *   onMounted 时检查初始可见性，后台标签页中打开时立即暂停避免空跑动画。
 * @consumers BackgroundImg.vue
 * @see src/styles/shimmer.css
 */
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { localConfig, localState } from '@/logic/config/state'
import '@/styles/shimmer.css'

const colors = computed(
  () =>
    localConfig.general.shimmerBackgroundColors[
      localState.value.currAppearanceCode
    ],
)

const effectClass = computed(
  () => `shimmer--${localConfig.general.shimmerBackgroundEffect}`,
)

/** 动画速度变量：提升到父容器，使 .shimmer 和 .shimmer__texture 均能继承 */
const speedCssVar = computed(() => ({
  '--shimmer-speed': String(localConfig.general.shimmerAnimationSpeed ?? 1),
}))

/** 颜色变量：仅 .shimmer 主效果层需要，放在该元素上避免污染纹理层 */
const colorCssVars = computed(() => {
  const vars: Record<string, string> = {}
  const cols = colors.value
  for (let i = 0; i < cols.length; i++) {
    vars[`--shimmer-c${i + 1}`] = cols[i]
  }
  return vars
})

/** 模板引用：主效果层和纹理层 DOM 元素 */
const effectEl = ref<HTMLElement | null>(null)
const textureEl = ref<HTMLElement | null>(null)

/** 设置两层的 animation-play-state */
const setAnimPlayState = (paused: boolean) => {
  const state = paused ? 'paused' : ''
  if (effectEl.value) effectEl.value.style.animationPlayState = state
  if (textureEl.value) textureEl.value.style.animationPlayState = state
}

/** 页面不可见时暂停动画，回来时恢复 */
const handleVisibilityChange = () => {
  setAnimPlayState(document.hidden)
}

onMounted(() => {
  // 初始检查：后台标签页中打开时立即暂停，避免空跑动画
  if (document.hidden) {
    setAnimPlayState(true)
  }
  document.addEventListener('visibilitychange', handleVisibilityChange)
})

onUnmounted(() => {
  document.removeEventListener('visibilitychange', handleVisibilityChange)
})
</script>

<template>
  <div
    id="background__shimmer"
    :style="speedCssVar"
  >
    <div
      ref="effectEl"
      class="shimmer"
      :class="[effectClass]"
      :style="colorCssVars"
    />
    <!-- 纹理叠加层（颗粒感 + 暗角）：全局应用于所有幻彩效果，提升质感 -->
    <div
      ref="textureEl"
      class="shimmer__texture"
    />
  </div>
</template>
