<script setup lang="ts">
/**
 * EmphasisKeySetting
 *
 * 强调键分组自定义：展示当前键盘的缩略键盘，用户点击某个键循环切换
 * 0（普通）→ 1（强调一）→ 2（强调二）→ 0（普通）
 *
 * 渲染复用 KeyboardLayout + KeyboardKeycapDisplay，固定 24px 基准。
 */
import { currKeyboardConfig } from '@/logic/keyboard/keyboard-layout'
import { localConfig } from '@/logic/config/state'
import { getStyleField } from '@/logic/store/style'
import { useKeyboardStyle } from '@/composables/useKeyboardStyle'
import KeyboardLayout from '@/components/KeyboardLayout.vue'
import KeyboardKeycapDisplay from '@/components/KeyboardKeycapDisplay.vue'

// 固定 24px 基准，纯展示用
const BASE = 24

const {
  getCustomLabel,
  getEmphasisGroup,
  getEmphasisStyle,
  keycapCssVars,
  getKeycapStageStyle,
  getKeycapTextStyle,
} = useKeyboardStyle('px', BASE)

// 键帽可见性配置（跟随 keyboardCommon 偏好，与其他设置面板保持一致）
const keycapVisualType = computed(() => localConfig.keyboardCommon.keycapType)
const isCapKeyVisible = computed(
  () => localConfig.keyboardCommon.isCapKeyVisible,
)
const isNameVisible = computed(() => localConfig.keyboardCommon.isNameVisible)

// 颜色（跟随外观模式，图例用）
const mainBgColor = getStyleField('keyboardCommon', 'mainBackgroundColor')
const mainFontColor = getStyleField('keyboardCommon', 'mainFontColor')
const emphasisOneBgColor = getStyleField(
  'keyboardCommon',
  'emphasisOneBackgroundColor',
)
const emphasisOneFontColor = getStyleField(
  'keyboardCommon',
  'emphasisOneFontColor',
)
const emphasisTwoBgColor = getStyleField(
  'keyboardCommon',
  'emphasisTwoBackgroundColor',
)
const emphasisTwoFontColor = getStyleField(
  'keyboardCommon',
  'emphasisTwoFontColor',
)

// ── 点击循环切换 ──────────────────────────────────────────────────────────────
const toggleGroup = (code: string) => {
  const cur = getEmphasisGroup(code)
  const next = ((cur + 1) % 3) as 0 | 1 | 2
  if (!localConfig.keyboardCommon.emphasisKeyOverrides) {
    localConfig.keyboardCommon.emphasisKeyOverrides = {}
  }
  localConfig.keyboardCommon.emphasisKeyOverrides[code] = next
}

// ── 重置 ──────────────────────────────────────────────────────────────────────
const handleReset = () => {
  localConfig.keyboardCommon.emphasisKeyOverrides = {}
}

// ── 是否有自定义覆盖 ──────────────────────────────────────────────────────────
const hasOverrides = computed(
  () =>
    Object.keys(localConfig.keyboardCommon.emphasisKeyOverrides ?? {}).length >
    0,
)
</script>

<template>
  <div class="emphasis-key-setting">
    <!-- 标题 + 重置按钮 -->
    <div class="emphasis-key-setting__header">
      <span class="emphasis-key-setting__tips">{{
        $t('keyboardCommon.emphasisKeyGroupTips')
      }}</span>
      <NButton
        v-if="hasOverrides"
        size="tiny"
        secondary
        @click="handleReset"
      >
        {{ $t('keyboardCommon.emphasisKeyGroupReset') }}
      </NButton>
    </div>

    <!-- 图例 -->
    <div class="emphasis-key-setting__legend">
      <span
        class="legend__item"
        :style="`background-color:${mainBgColor};color:${mainFontColor};`"
        >{{ $t('keyboardCommon.emphasisGroupNone') }}</span
      >
      <span
        class="legend__item"
        :style="`background-color:${emphasisOneBgColor};color:${emphasisOneFontColor};`"
        >{{ $t('keyboardCommon.emphasisGroupOne') }}</span
      >
      <span
        class="legend__item"
        :style="`background-color:${emphasisTwoBgColor};color:${emphasisTwoFontColor};`"
        >{{ $t('keyboardCommon.emphasisGroupTwo') }}</span
      >
    </div>

    <!-- 键盘缩略图（复用通用组件） -->
    <div
      class="emphasis-key-setting__keyboard"
      :style="keycapCssVars"
    >
      <KeyboardLayout
        unit="px"
        :base-size="BASE"
        :keys="currKeyboardConfig.keys"
      >
        <template #keycap="{ code }">
          <KeyboardKeycapDisplay
            :key-code="code"
            :label="getCustomLabel(code)"
            name=""
            :visual-type="keycapVisualType"
            :stage-style="getKeycapStageStyle(code)"
            :text-style="getKeycapTextStyle(code)"
            :show-cap-key="isCapKeyVisible"
            :show-name="isNameVisible"
            :show-favicon="false"
            :show-tactile-bumps="false"
            :style="[keycapCssVars, getEmphasisStyle(code)]"
            @click="toggleGroup(code)"
          />
        </template>
      </KeyboardLayout>
    </div>
  </div>
</template>

<style scoped>
.emphasis-key-setting {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  padding: 0 8px;
}

/* ── 标题行 ── */
.emphasis-key-setting__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 24px;
}

.emphasis-key-setting__tips {
  font-size: 12px;
  color: var(--n-text-color-3);
}

/* ── 图例 ── */
.emphasis-key-setting__legend {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.legend__item {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.15);
}

/* ── 键盘容器：宽度由内容决定，不撑满父级 ── */
.emphasis-key-setting__keyboard {
  display: flex;
  justify-content: center;
  overflow-x: auto;
  max-width: 100%;
  padding-bottom: 2px;
}
</style>
