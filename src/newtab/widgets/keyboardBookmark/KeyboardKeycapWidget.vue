<script setup lang="ts">
import { isDragMode } from '@/logic/moveable'
import { getFaviconFromUrl } from '@/logic/bookmark/api'
import { state as keyboardState } from '@/logic/keyboard/bookmark-state'
import {
  openPage,
  getKeycapName,
  getKeycapUrl,
} from '@/newtab/widgets/keyboardBookmark/logic'
import { localConfig } from '@/logic/config/state'
import { useKeyboardStyle } from '@/composables/useKeyboardStyle'
import KeyboardKeycapDisplay from '@/components/KeyboardKeycapDisplay.vue'

const props = defineProps({
  keyCode: {
    type: String,
    required: true,
  },
})

// 首次加载禁用动画，后续 layer 切换时启用
const enableTransition = ref(false)
onMounted(() => {
  setTimeout(() => {
    enableTransition.value = true
  }, 300)
})

const {
  getCustomLabel,
  getKeycapStageStyle,
  getKeycapTextStyle,
  getKeycapIconStyle,
  getEmphasisStyle,
  keycapCssVars,
} = useKeyboardStyle('vmin')

// 标签优先读取自定义配置，未配置时回退到键位默认标签
const keycapLabel = computed(() => getCustomLabel(props.keyCode))

const keycapName = computed(() => getKeycapName(props.keyCode))
const keycapBookmarkUrl = computed(() => getKeycapUrl(props.keyCode))
const keycapVisualType = computed(() => localConfig.keyboardCommon.keycapType)

// title 用于鼠标悬浮提示，名称为空时不展示 tooltip，避免空提示框
const keycapTitle = computed(() => {
  if (keycapName.value.length === 0) {
    return ''
  }
  if (keycapBookmarkUrl.value.length === 0) {
    return keycapName.value
  }
  return `${keycapName.value} · ${keycapBookmarkUrl.value}`
})

// 统一处理键帽点击逻辑
const onMouseDownKey = (event: MouseEvent, keyCode: string) => {
  if (isDragMode.value) {
    return
  }
  const { button, shiftKey, altKey } = event
  // 忽略鼠标右键
  if (button === 2) {
    return
  }
  // 侧键（前进/后退）留给键盘外壳的 layer 切换处理，不拦截
  if (button === 3 || button === 4) {
    return
  }
  // 阻止默认行为（例如浏览器中键的滚轮模式切换）
  event.preventDefault()
  // 阻止左键/中键事件冒泡，避免触发拖拽等其他行为
  event.stopPropagation()
  const url = keycapBookmarkUrl.value
  if (url.length === 0) {
    return
  }
  if (button === 0) {
    // 按下鼠标左键
    keyboardState.currSelectKeyCode = keyCode
    // shift + 点击key后台打开书签，alt + key 新标签页打开
    openPage(url, shiftKey, altKey, keyCode)
  } else if (button === 1) {
    // 按下鼠标中键
    openPage(url, true, false, keyCode)
  }
}

// 展示组件内部已经携带基础类型类名，这里只补充 widget 专属交互状态类
const rowKeycapClassName = computed(() => {
  const className: string[] = []
  className.push(isDragMode.value ? 'row__keycap--move' : 'row__keycap--hover')
  if (keyboardState.currSelectKeyCode === props.keyCode) {
    className.push('row__keycap--active')
  }
  return className
})

const keycapStageStyle = computed(() => getKeycapStageStyle(props.keyCode))
const keycapTextStyle = computed(() => getKeycapTextStyle(props.keyCode))
const keycapIconStyle = computed(() => getKeycapIconStyle(props.keyCode))
const keycapStyle = computed(() => getEmphasisStyle(props.keyCode))
</script>

<template>
  <KeyboardKeycapDisplay
    :key-code="keyCode"
    :label="keycapLabel"
    :name="keycapName"
    :visual-type="keycapVisualType"
    :icon-src="getFaviconFromUrl(keycapBookmarkUrl)"
    :stage-style="keycapStageStyle"
    :text-style="keycapTextStyle"
    :icon-style="keycapIconStyle"
    :img-draggable="false"
    :is-loading="
      keyboardState.isLoadPageLoading &&
      keyboardState.currSelectKeyCode === keyCode
    "
    :is-border-enabled="localConfig.keyboardCommon.isKeycapBorderEnabled"
    :show-cap-key="localConfig.keyboardCommon.isCapKeyVisible"
    :show-name="localConfig.keyboardCommon.isNameVisible"
    :show-favicon="localConfig.keyboardCommon.isFaviconVisible"
    :show-tactile-bumps="localConfig.keyboardCommon.isTactileBumpsVisible"
    :render-mode="'full'"
    :enable-transition="enableTransition"
    :class="rowKeycapClassName"
    :style="[keycapCssVars, keycapStyle]"
    :title="keycapTitle"
    :data-code="keyCode"
    @mousedown="onMouseDownKey($event, keyCode)"
  />
</template>
