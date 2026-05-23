<script setup lang="ts">
import { NConfigProvider, NDialogProvider } from 'naive-ui'
import { log } from '@/logic/utils/common'
import { gaProxy } from '@/logic/utils/gtag'
import {
  registerGlobalErrorHandler,
  registerVueErrorHandler,
} from '@/logic/utils/errorHandler'
import { FOCUS_ELEMENT_SELECTOR_MAP } from '@/logic/constants/app'
import { WIDGET_CODE_LIST } from '@/common/widget-constants'
import { SYSTEM_FONT_STACK } from '@/logic/constants/fonts'
import {
  startKeydown,
  startTimer,
  stopTimer,
  onPageFocus,
  stopKeydown,
} from '@/logic/task'
import {
  setupNewtabCommandShortcut,
  cleanupNewtabCommandShortcut,
} from '@/logic/shortcut/shortcut-executor'
import { setupPageConfigSync } from '@/logic/config/sync/loader'
import { setupLocalStorageSyncListener } from '@/logic/config/sync/state'
import { handleFirstOpen } from '@/logic/guide'
import { localConfig } from '@/logic/config/state'
import {
  initFullscreenSync,
  initDomStyleWatchers,
  cleanupFullscreenSync,
  cleanupDomStyleWatchers,
} from '@/logic/store/dom'
import { getStyleField } from '@/logic/store/style'
import { nativeUILang, currTheme, themeOverrides } from '@/logic/store/theme'
import { handleAppUpdate } from '@/logic/config/update'
import { initBackgroundImage } from '@/logic/image/service'
import { cleanupEvents, cleanupResizeObserver } from '@/logic/moveable'
import { initKeyboardData } from '@/logic/keyboard/bookmark-state'
import { updatePoetry } from '@/logic/poetry'
import Content from '@/newtab/Content.vue'

// 样式通过 :style 注入，避免 v-bind() TDZ 错误
const WIDGET_CODE = 'general'
const appStyle = computed(() => {
  const fontFamilyValue = getStyleField(WIDGET_CODE, 'fontFamily').value
  return {
    '--nt-app-font-family':
      fontFamilyValue === 'system' ? SYSTEM_FONT_STACK : fontFamilyValue,
    '--nt-app-font-size': getStyleField(WIDGET_CODE, 'fontSize', 'px').value,
  }
})

/**
 * 焦点元素重载守卫
 * 当用户配置了非默认的页面焦点元素时，通过 ?focus 参数触发页面重载。
 * 新标签页打开时浏览器会先聚焦地址栏，直接调用 focus() 会被浏览器拦截或覆盖。
 * 设置 location.search 后浏览器自动重载，页面以 ?focus 参数重新初始化，
 * 此时 handleFocusPage 通过 setTimeout 延迟执行，确保浏览器完成地址栏聚焦后再转移焦点。
 * 用 v-if 静默中断渲染，替代旧版 throw new Error 避免控制台报错。
 */
const shouldReloadForFocus =
  localConfig.general.openPageFocusElement !== 'default' &&
  location.search !== '?focus'
if (shouldReloadForFocus) {
  location.search = '?focus'
}

const handleFocusPage = () => {
  // 推迟到宏任务队列，让浏览器完成新标签页的初始聚焦（地址栏）后，再将焦点转移到页面元素。
  setTimeout(() => {
    if (localConfig.general.openPageFocusElement === 'default') {
      return
    }
    const selector =
      FOCUS_ELEMENT_SELECTOR_MAP[localConfig.general.openPageFocusElement]
    const focusEle = document.querySelector(selector) as HTMLElement | null
    if (focusEle && focusEle.focus) {
      focusEle.focus()
    }
  }, 0)
}

const onDot = () => {
  const browserPlatform =
    navigator.userAgentData?.platform || navigator.platform || 'unknown'
  let browserBrand = 'unknown'
  let browserVersion = 'unknown'
  if (navigator.userAgentData?.brands?.length) {
    const [brand] = navigator.userAgentData.brands.slice(-1)
    browserBrand = brand.brand
    browserVersion = brand.version
  } else {
    const ua = navigator.userAgent
    const firefoxMatch = ua.match(/Firefox\/(\d+\.\d+)/)
    if (firefoxMatch) {
      browserBrand = 'Firefox'
      browserVersion = firefoxMatch[1]
    } else {
      const chromeMatch = ua.match(/(Chrome|Edg)\/(\d+\.\d+)/)
      if (chromeMatch) {
        browserBrand = chromeMatch[1].replace('Edg', 'Microsoft Edge')
        browserVersion = chromeMatch[2]
      }
    }
  }

  gaProxy('view', ['newtab'], {
    version: window.appVersion,
    userAgent: navigator.userAgent,
    platform: browserPlatform,
    browser: `${browserBrand}_${browserVersion}`,
  })

  const enabledWidgets = WIDGET_CODE_LIST.filter(
    (code) => localConfig[code].enabled,
  )
  for (const code of enabledWidgets) {
    gaProxy('view', ['widget_active', code])
  }

  log('platform', `${browserPlatform}_${browserBrand}_${browserVersion}`)
}

// ── 初始化 ─────────────────────────────────────────────────────────────

onMounted(async () => {
  // 注册全局错误监听
  registerGlobalErrorHandler('newtab')
  registerVueErrorHandler(getCurrentInstance()!.appContext.app, 'newtab')

  // 阶段 0：DOM 副作用初始化（必须在同步阶段，确保渲染前生效）
  initFullscreenSync()
  initDomStyleWatchers()

  // 阶段 1：基础初始化（同步操作，无依赖）
  initBackgroundImage()
  startTimer()
  // 命令快捷键 keydown 注册 + Port 监听（priority 0 保证命令优先于书签）
  setupNewtabCommandShortcut()
  startKeydown()

  // 阶段 2：配置同步（按顺序，有依赖关系）
  await setupPageConfigSync()
  setupLocalStorageSyncListener()

  // 阶段 3：版本升级（配置修改同步生效，updateSetting 异步执行）
  // handleAppUpdate 内的配置修改会立即生效（Vue 响应式）
  // updateSetting 在后台异步执行，不阻塞首屏渲染
  handleAppUpdate()

  // 阶段 4：应用初始化（使用最新配置）
  initKeyboardData()
  await nextTick()
  handleFirstOpen()
  handleFocusPage()
  updatePoetry()
  onDot()
})

onUnmounted(() => {
  // 注意：浏览器新标签页关闭时不会触发 onUnmounted，整个 JS 环境直接销毁。
  // 以下清理代码仅在开发 HMR / 扩展热重载时生效，属于防御性清理。
  cleanupFullscreenSync()
  cleanupDomStyleWatchers()
  stopTimer()
  stopKeydown()
  cleanupNewtabCommandShortcut()
  cleanupEvents()
  cleanupResizeObserver()
})

/**
 * 页面入场动画控制：动画播放完毕后通过 animationend 事件移除 class。
 *
 * 根因：animation: ... forwards 会在动画结束后保留最终样式（如 transform: scale(1)）。
 * 在 Chrome 扩展新标签页环境中，反复刷新页面时浏览器可能复用底层 DOM 树，
 * 旧的 transform 残存状态与新的动画叠加，导致视觉上不断缩小。
 *
 * 修复：动画完成后移除动画 class，让元素回归无 transform 的自然状态，
 * 避免 forwards 残存值与下一次动画叠加。
 */
const animationApplied = ref(false)
const pageAnimationClass = computed(() => {
  if (!localConfig.general.isLoadPageAnimationEnabled) {
    return ''
  }
  if (animationApplied.value) {
    return ''
  }
  return `animation--${localConfig.general.loadPageAnimationType}`
})

const onAnimationEnd = () => {
  animationApplied.value = true
}
</script>

<template>
  <NConfigProvider
    v-if="!shouldReloadForFocus"
    id="container"
    :class="pageAnimationClass"
    :locale="nativeUILang"
    :theme="currTheme"
    :theme-overrides="themeOverrides"
    :style="appStyle"
    @animationend="onAnimationEnd"
  >
    <NDialogProvider>
      <div
        id="container__main"
        tabindex="100"
        @focus="onPageFocus"
      >
        <Content />
      </div>
    </NDialogProvider>
  </NConfigProvider>
</template>

<style>
#container {
  width: 100vw;
  height: 100vh;
  font-size: var(--nt-app-font-size);
  font-family: var(--nt-app-font-family);
  #container__main {
    width: 100vw;
    height: 100vh;
  }
}
</style>
