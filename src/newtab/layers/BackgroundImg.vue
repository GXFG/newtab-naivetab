<script setup lang="ts">
/**
 * 背景图渲染组件 - 双层渲染架构
 *
 * 背景色由 body 的 --nt-bg-main 变量提供（用户配置），#background 容器本身透明。
 * 第一层 #background__container：显示 previewImageUrl（base64 小图）
 *   → 立即渲染，避免首屏白屏
 * 第二层 #background__blob：显示 fullImageUrl（高清大图 blob URL）
 *   → 初始 opacity: 0，decode 完成后 opacity: 1 触发 CSS 0.6s 淡入过渡
 *   → 覆盖在小图之上，实现无闪烁的图片替换效果
 *
 * 附加功能：
 * - 鼠标视差效果（parallax）：mousemove 时背景轻微偏移，容器扩展 parallaxIntensity * 2 px
 * - Loading 指示器：大图加载超过 500ms 时显示三个脉冲圆点
 */
import { localConfig } from '@/logic/config/state'
import { imageState, isImageLoading } from '@/logic/image/state'

// 视差效果：鼠标移动时背景轻微偏移
const parallaxX = ref(0)
const parallaxY = ref(0)

// 视差容器动态扩展幅度
const parallaxExpansion = computed(() => {
  return localConfig.general.parallaxIntensity * 2
})

// 构建视差相关的 CSS 变量
const buildParallaxVars = () => ({
  '--nt-parallax-x': `${parallaxX.value}px`,
  '--nt-parallax-y': `${parallaxY.value}px`,
  '--nt-parallax-expansion': `${parallaxExpansion.value}px`,
})

const containerStyle = computed(() => {
  const style: Record<string, string> = {}
  if (localConfig.general.isBackgroundImageEnabled) {
    style.backgroundImage = `url(${imageState.previewImageUrl})`
    style.filter = `blur(${localConfig.general.bgBlur}px)`
    style.opacity = `${localConfig.general.bgOpacity}`
    Object.assign(style, buildParallaxVars())
  }
  return style
})

const blobContainerStyle = computed(() => {
  const style: Record<string, string> = {}
  if (localConfig.general.isBackgroundImageEnabled && imageState.fullImageUrl) {
    style.backgroundImage = `url(${imageState.fullImageUrl})`
    style.filter = `blur(${localConfig.general.bgBlur}px)`
    style.opacity = `${localConfig.general.bgOpacity}`
    Object.assign(style, buildParallaxVars())
  }
  return style
})

const blobContainerClass = computed(() => ({
  'background__container--parallax': localConfig.general.isParallaxEnabled,
  'background__container--blob': !!imageState.fullImageUrl,
}))

let rafId: number | null = null

const handleMouseMove = (e: MouseEvent) => {
  if (
    !localConfig.general.isParallaxEnabled ||
    !localConfig.general.isBackgroundImageEnabled
  ) {
    return
  }

  if (rafId) {
    cancelAnimationFrame(rafId)
  }

  rafId = requestAnimationFrame(() => {
    const x =
      (e.clientX / window.innerWidth - 0.5) *
      2 *
      localConfig.general.parallaxIntensity
    const y =
      (e.clientY / window.innerHeight - 0.5) *
      2 *
      localConfig.general.parallaxIntensity
    parallaxX.value = x
    parallaxY.value = y
  })
}

const handleMouseLeave = () => {
  if (
    !localConfig.general.isParallaxEnabled ||
    !localConfig.general.isBackgroundImageEnabled
  ) {
    return
  }
  parallaxX.value = 0
  parallaxY.value = 0
}

const updateEventListeners = (enable: boolean) => {
  if (enable) {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseleave', handleMouseLeave)
  } else {
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseleave', handleMouseLeave)
    parallaxX.value = 0
    parallaxY.value = 0
    if (rafId) {
      cancelAnimationFrame(rafId)
    }
  }
}

watch(
  () =>
    localConfig.general.isParallaxEnabled &&
    localConfig.general.isBackgroundImageEnabled,
  (enabled) => {
    updateEventListeners(enabled)
  },
)

onMounted(() => {
  updateEventListeners(
    localConfig.general.isParallaxEnabled &&
      localConfig.general.isBackgroundImageEnabled,
  )
})

onUnmounted(() => {
  updateEventListeners(false)
  if (loadingTimer) {
    clearTimeout(loadingTimer)
  }
})

// 大图 blob URL，等预加载完成后再赋值，避免替换时闪烁
const isShowLoadingSpinner = ref(false)

let loadingTimer: ReturnType<typeof setTimeout> | null = null

watch(
  isImageLoading,
  (value) => {
    if (value) {
      // 开始加载大图
      loadingTimer = setTimeout(() => {
        isShowLoadingSpinner.value = true
      }, 500)
    } else {
      // 大图 decode 完成，由 CSS opacity 过渡实现淡入（imageState.fullImageUrl 已在 image.ts 中赋值）

      if (loadingTimer) {
        clearTimeout(loadingTimer)
        loadingTimer = null
      }
      isShowLoadingSpinner.value = false
    }
  },
  { immediate: true },
)
</script>

<template>
  <!-- 存储 css 变量 -->
  <div id="background">
    <!-- 视差效果容器：base64 小图 -->
    <div
      id="background__container"
      :style="containerStyle"
      :class="{
        'background__container--parallax':
          localConfig.general.isParallaxEnabled,
      }"
    />
    <!-- 视差效果容器：大图 blob，通过 opacity 淡入覆盖 -->
    <div
      v-if="localConfig.general.isBackgroundImageEnabled"
      id="background__blob"
      :style="blobContainerStyle"
      :class="blobContainerClass"
    />
    <!-- loading 指示器 -->
    <div
      v-if="localConfig.general.isBackgroundImageEnabled"
      class="background__loading"
      :class="{ 'background__loading--visible': isShowLoadingSpinner }"
    >
      <div class="loading__dots">
        <span class="loading__dot" />
        <span class="loading__dot loading__dot--delay-1" />
        <span class="loading__dot loading__dot--delay-2" />
      </div>
    </div>
  </div>
</template>

<style>
#background {
  #background__container {
    z-index: 1;
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    will-change: filter, opacity, transform;

    &.background__container--parallax {
      top: calc(-1 * var(--nt-parallax-expansion, 40px));
      left: calc(-1 * var(--nt-parallax-expansion, 40px));
      width: calc(100vw + calc(2 * var(--nt-parallax-expansion, 40px)));
      height: calc(100vh + calc(2 * var(--nt-parallax-expansion, 40px)));
      transform: translate(var(--nt-parallax-x, 0), var(--nt-parallax-y, 0));
      transition: transform 100ms ease-out;
    }
  }

  #background__blob {
    z-index: 2;
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-size: cover;
    background-repeat: no-repeat;
    background-position: center;
    opacity: 0;
    transition: opacity 0.6s ease-in;
    will-change: opacity, transform;
    pointer-events: none;

    &.background__container--parallax {
      top: calc(-1 * var(--nt-parallax-expansion, 40px));
      left: calc(-1 * var(--nt-parallax-expansion, 40px));
      width: calc(100vw + calc(2 * var(--nt-parallax-expansion, 40px)));
      height: calc(100vh + calc(2 * var(--nt-parallax-expansion, 40px)));
      transform: translate(var(--nt-parallax-x, 0), var(--nt-parallax-y, 0));
      transition:
        opacity 0.6s ease-in,
        transform 100ms ease-out;
    }

    &.background__container--blob {
      opacity: 1;
    }
  }

  .background__loading {
    z-index: 15;
    position: absolute;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    opacity: 0;
    transition: opacity 0.4s ease;
    pointer-events: none;

    &.background__loading--visible {
      opacity: 1;
    }
  }

  .loading__dots {
    display: flex;
    gap: 20px;
  }

  .loading__dot {
    display: block;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background-color: rgba(255, 255, 255, 0.8);
    box-shadow:
      0 0 8px 2px rgba(255, 255, 255, 0.7),
      0 0 24px 6px rgba(255, 255, 255, 0.35),
      0 0 48px 12px rgba(255, 255, 255, 0.15);
    animation: loading-pulse 1.2s ease-in-out infinite;

    &.loading__dot--delay-1 {
      animation-delay: 0.15s;
    }

    &.loading__dot--delay-2 {
      animation-delay: 0.3s;
    }
  }
}

@keyframes loading-pulse {
  0%,
  80%,
  100% {
    transform: scale(0.5);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.1);
    opacity: 1;
  }
}
</style>
