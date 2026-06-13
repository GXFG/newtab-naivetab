<script setup lang="ts">
/**
 * @module BackgroundShimmerSettings
 * @description 幻彩设置面板。包含预设选择、效果切换、色值编辑、随机配色。
 *   颜色通过 localConfig 直接写入 CSS 变量，实时生效，无需「应用」按钮。
 * @consumers BackgroundDrawer.vue
 */
import { ref, computed } from 'vue'
import { Icon } from '@iconify/vue'
import NTRadioGroup from '@/components/ui/NTRadioGroup.vue'
import NTRadio from '@/components/ui/NTRadio.vue'
import CustomColorPicker from '@/components/CustomColorPicker.vue'
import NTButton from '@/components/ui/NTButton.vue'
import NTPopover from '@/components/ui/NTPopover.vue'
import { ICONS } from '@/logic/constants/icons'
import { localConfig, localState } from '@/logic/config/state'
import { SHIMMER_BG_EFFECTS } from '@/logic/shimmer-bg/constants'
import { SHIMMER_BG_PRESETS } from '@/logic/shimmer-bg/presets'
import { SettingFormItem } from '@/setting/components'

/** 效果选项列表 */
const effectOptions = computed(() =>
  SHIMMER_BG_EFFECTS.map((e) => ({
    label: window.$t(`shimmerBackground.effects.${e}`),
    value: e,
  })),
)

/** 速度选项列表 */
const speedOptions = computed(() => [
  { value: 0.5, label: window.$t('shimmerBackground.speeds.slow') },
  { value: 1, label: window.$t('shimmerBackground.speeds.normal') },
  { value: 2, label: window.$t('shimmerBackground.speeds.fast') },
])

/** 预设 Popover 显隐 */
const presetPopoverOpen = ref(false)

/** 应用预设：写入颜色和推荐效果，颜色通过 CSS 变量实时生效 */
const applyPreset = (presetId: string) => {
  const preset = SHIMMER_BG_PRESETS.find((p) => p.id === presetId)
  if (!preset) return
  localConfig.general.shimmerBackgroundColors = [
    [...preset.lightColors],
    [...preset.darkColors],
  ] as any
  localConfig.general.shimmerBackgroundEffect = preset.recommendedEffect
  presetPopoverOpen.value = false
}

/** HSL → Hex 转换 */
const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100
  l /= 100
  const a = s * Math.min(l, 1 - l)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    return Math.round(255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))))
      .toString(16)
      .padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

/** 随机生成 6 个和谐色
 *
 *  配色策略（类比配色，避免高饱和彩虹效果）：
 *  - 色相集中在主色相附近 ~100° 范围，不再铺满全色环
 *  - 饱和度梯度下降 52→28，主次分明，避免刺眼
 *  - 亮度明暗交替，形成视觉层次 */
const randomizeColors = () => {
  const code = localState.value.currAppearanceCode
  const baseHue = Math.floor(Math.random() * 360)
  const colors = Array.from({ length: 6 }, (_, i) => {
    const hue = (baseHue + i * 18 + Math.floor(Math.random() * 8)) % 360
    const sat = Math.max(28, 52 - i * 4 + Math.floor(Math.random() * 8))
    const light =
      i % 2 === 0
        ? 42 + Math.floor(Math.random() * 12) // 较暗色（42-53）
        : 54 + Math.floor(Math.random() * 12) // 较亮色（54-65）
    return hslToHex(hue, sat, light)
  })
  localConfig.general.shimmerBackgroundColors[code] = colors as any
}
</script>

<template>
  <SettingFormItem :label="$t('shimmerBackground.preset')">
    <NTPopover
      :show="presetPopoverOpen"
      trigger="manual"
      placement="bottom"
      @update:show="presetPopoverOpen = $event"
    >
      <template #trigger>
        <NTButton
          type="primary"
          size="tiny"
          variant="secondary"
          round
          @click.stop="presetPopoverOpen = !presetPopoverOpen"
        >
          <Icon :icon="ICONS.chevronDown" />
          {{ $t('shimmerBackground.preset') }}
        </NTButton>
      </template>
      <div class="preset__popover">
        <button
          v-for="preset in SHIMMER_BG_PRESETS"
          :key="preset.id"
          type="button"
          class="preset__card"
          :aria-label="$t(preset.nameKey)"
          @click="applyPreset(preset.id)"
        >
          <span class="preset__card-dots">
            <span
              v-for="(color, ci) in preset.lightColors"
              :key="ci"
              class="preset__card-dot"
              :style="{ backgroundColor: color }"
            />
          </span>
          <span class="preset__card-name">{{ $t(preset.nameKey) }}</span>
        </button>
      </div>
    </NTPopover>
  </SettingFormItem>

  <SettingFormItem :label="$t('shimmerBackground.effect')">
    <NTRadioGroup
      v-model:value="localConfig.general.shimmerBackgroundEffect"
      class="shimmer__effects"
    >
      <NTRadio
        v-for="opt in effectOptions"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </NTRadio>
    </NTRadioGroup>
  </SettingFormItem>

  <SettingFormItem :label="$t('shimmerBackground.speed')">
    <NTRadioGroup
      v-model:value="localConfig.general.shimmerAnimationSpeed"
      class="shimmer__speeds"
    >
      <NTRadio
        v-for="opt in speedOptions"
        :key="opt.value"
        :value="opt.value"
      >
        {{ opt.label }}
      </NTRadio>
    </NTRadioGroup>
  </SettingFormItem>

  <!-- 当前外观的颜色：色点预览 + 点击弹出色板编辑 + 随机 -->
  <SettingFormItem :label="$t('shimmerBackground.colors')">
    <div class="shimmer__colors-preview">
      <span class="colors-preview__dots">
        <CustomColorPicker
          v-for="(color, ci) in localConfig.general.shimmerBackgroundColors[
            localState.currAppearanceCode
          ]"
          :key="ci"
          :value="color"
          @update:value="
            (val: string) => {
              localConfig.general.shimmerBackgroundColors[
                localState.currAppearanceCode
              ][ci] = val
            }
          "
        />
      </span>
      <NTButton
        type="primary"
        size="tiny"
        variant="secondary"
        round
        @click="randomizeColors"
      >
        <Icon :icon="ICONS.shuffle" />
        {{ $t('shimmerBackground.randomColors') }}
      </NTButton>
    </div>
  </SettingFormItem>
</template>

<style>
/* 颜色预览行 */
.shimmer__colors-preview {
  display: flex;
  align-items: center;
  gap: 10px;
}

.colors-preview__dots {
  display: flex;
  gap: 4px;
}

.shimmer__effects {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

/* 预设 Popover 内容（Portal 渲染到 body，必须全局作用域） */
.preset__popover {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 6px;
  padding: 4px;
}

.preset__card {
  all: unset;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 8px 4px;
  border-radius: 6px;
  border: 1px solid transparent;
  cursor: pointer;
  transition:
    border-color 150ms ease,
    background 150ms ease;
  min-width: 0;

  &:hover {
    border-color: var(--nt-primary-color);
    background: var(--nt-primary-minimal);
  }

  &:active {
    background: var(--nt-primary-subtle);
  }
}

.preset__card-dots {
  display: grid;
  gap: 3px;
  grid-template-columns: repeat(3, 1fr);
}

.preset__card-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

/* 深色模式：popover 卡片色点边框 */
:root[data-theme='dark'] .preset__card-dot,
.dark .preset__card-dot {
  border-color: rgba(255, 255, 255, 0.15);
}
</style>
