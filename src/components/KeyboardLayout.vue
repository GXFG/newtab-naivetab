<script setup lang="ts">
/**
 * KeyboardLayout
 *
 * 键盘布局容器，使用绝对定位渲染所有键位。
 * - 负责渲染 shell / plate / 键位结构，不关心每个键帽的具体内容
 * - 每个键帽内容通过具名 slot `keycap` 暴露，调用方自行决定渲染什么
 * - 布局尺寸样式通过 `useKeyboardStyle` composable 统一计算
 *
 * Props：
 *   unit        - 'vmin'（widget）或 'px'（popup），控制尺寸单位
 *   baseSize    - px 模式下的基准尺寸（默认 40），vmin 模式忽略此参数
 *   keys        - 键盘所有键的坐标定义数组
 *   extraClass  - 附加到容器的 class（可选）
 *
 * Slot `keycap`：
 *   slot props：{ code: string, rowIndex: number }
 */

import { useKeyboardStyle } from '@/composables/useKeyboardStyle'
import { localConfig } from '@/logic/store'

/** 将数值按单位转成 CSS 字符串 */
const toUnit = (value: number, unit: 'vmin' | 'px'): string =>
  unit === 'vmin' ? `${value * 0.1}vmin` : `${value}px`

const props = withDefaults(
  defineProps<{
    unit: 'vmin' | 'px'
    baseSize?: number
    keys: TKeyDefinition[]
    extraClass?: string | string[] | Record<string, boolean>
  }>(),
  {
    baseSize: 40,
    extraClass: undefined,
  },
)

// ── 样式 composable ──────────────────────────────────────────────────────────
const { getLayoutKeyStyle, layoutCssVars, base } = useKeyboardStyle(
  props.unit,
  props.baseSize,
)

// ── 显示开关 ─────────────────────────────────────────────────────────────────
const isShellVisible = computed(() => localConfig.keyboardCommon.isShellVisible)
const isShellShadowEnabled = computed(
  () => localConfig.keyboardCommon.isShellShadowEnabled,
)
const isPlateVisible = computed(() => localConfig.keyboardCommon.isPlateVisible)

// ── 容器总宽高（包含 shell padding + border，转成 CSS 字符串注入 :style） ──
// shell 有 1px 四边 border，box-sizing: border-box 下 border 吃掉 content-box，
// 需要在容器尺寸中补回 2px，确保键位在 padding-box 内精确居中。
// 加 2 对应 2 × 1px 边框，在 vmin 模式下 2 即 0.2vmin ≈ 2px（1000px 基准视口）。
const SHELL_BORDER_PX = 2
const containerWidthCss = computed(() => {
  const keyWidth =
    Math.max(...props.keys.map((k) => k.x + (k.w || 1))) * base.value
  const s = localConfig.keyboardCommon.keycapSize
  const pad =
    (localConfig.keyboardCommon.shellHorizontalPadding / s) * base.value
  return keyWidth + 2 * pad + SHELL_BORDER_PX
})
const containerHeightCss = computed(() => {
  const keyHeight =
    Math.max(...props.keys.map((k) => k.y + (k.h || 1))) * base.value
  const s = localConfig.keyboardCommon.keycapSize
  const pad = (localConfig.keyboardCommon.shellVerticalPadding / s) * base.value
  return keyHeight + 2 * pad + SHELL_BORDER_PX
})
</script>

<template>
  <!-- 键盘容器：shell 可见时附加对应 modifier class -->
  <div
    class="keyboard-layout"
    :class="[
      {
        'keyboard-layout--shell': isShellVisible,
        'keyboard-layout--shell-shadow': isShellVisible && isShellShadowEnabled,
      },
      extraClass,
    ]"
    :style="[
      layoutCssVars,
      {
        width: toUnit(containerWidthCss, props.unit),
        height: toUnit(containerHeightCss, props.unit),
      },
    ]"
  >
    <!-- 每个键位独立绝对定位 -->
    <div
      v-for="key of keys"
      :key="key.code"
      class="keyboard-layout__keycap-wrap"
      :style="getLayoutKeyStyle(key)"
    >
      <!-- 定位板层（shell + plate 均开启时渲染，z-index: -1 置于键帽后方） -->
      <div
        v-if="isShellVisible && isPlateVisible"
        class="keyboard-layout__keycap-plate"
      />
      <!-- 键帽内容由调用方通过 slot 注入 -->
      <slot
        name="keycap"
        :code="key.code"
        :row-index="key.y"
      />
    </div>
  </div>
</template>

<style scoped>
/* ── 键盘容器基础 ──────────────────────────────────────────────────────────── */
.keyboard-layout {
  position: relative;
  font-family: var(--nt-kb-bookmark-font-family);

  /* ── 单键帽 wrap ── */
  .keyboard-layout__keycap-wrap {
    position: absolute;
    padding: var(--nt-kb-keycap-padding);
    height: var(--nt-kb-keycap-height);

    /* ── 定位板（绝对定位，向外扩展 platePadding，置于键帽层之下） ── */
    .keyboard-layout__keycap-plate {
      z-index: -1;
      position: absolute;
      top: calc(-1 * var(--nt-kb-plate-padding));
      left: calc(-1 * var(--nt-kb-plate-padding));
      width: calc(100% + var(--nt-kb-plate-padding) * 2);
      height: calc(100% + var(--nt-kb-plate-padding) * 2);
      background: var(--nt-kb-plate-color);
      border-radius: var(--nt-kb-plate-radius);
      /* 顶部内发光，模拟哑光金属/PCB 定位板的物理质感 */
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
    }
  }
}

/* ── Shell 外壳（isShellVisible = true） ─────────────────────────────────── */
.keyboard-layout--shell {
  position: relative;
  padding: var(--nt-kb-shell-v-padding) var(--nt-kb-shell-h-padding);
  border-radius: var(--nt-kb-shell-radius);
  background-color: var(--nt-kb-shell-color) !important;
  backdrop-filter: blur(var(--nt-kb-shell-blur));
  /* 模拟玻璃质感的四边高光/阴影 */
  border-top: 1px solid rgba(255, 255, 255, 0.18);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  border-right: 1px solid rgba(0, 0, 0, 0.1);
  border-bottom: 1px solid rgba(0, 0, 0, 0.18);

  /* 顶部内高光渐变（集中在中段1/3區域，模拟玻璃光泽自然的中心聚光） */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 25%;
    right: 25%;
    height: 1px;
    background: linear-gradient(
      90deg,
      transparent,
      rgba(255, 255, 255, 0.55),
      transparent
    );
    border-radius: 1px;
    pointer-events: none;
  }

  /* 表面光泽（径向渐变模拟环境光反射） */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: radial-gradient(
      ellipse at 50% 0%,
      rgba(255, 255, 255, 0.06) 0%,
      transparent 60%
    );
    pointer-events: none;
  }
}

/* ── Shell 立体阴影（isShellShadowEnabled = true，叠加在 --shell 上） ─────── */
.keyboard-layout--shell-shadow {
  background:
    linear-gradient(
      145deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.03) 35%,
      rgba(0, 0, 0, 0.06) 65%,
      rgba(0, 0, 0, 0.12) 100%
    ),
    var(--nt-kb-shell-color) !important;
  box-shadow:
    0px 8px 24px var(--nt-kb-shell-shadow),
    0px 3px 8px var(--nt-kb-shell-shadow),
    inset 0 1px 0 rgba(255, 255, 255, 0.22),
    inset 0 -2px 4px rgba(0, 0, 0, 0.15),
    0 0 28px color-mix(in srgb, var(--nt-kb-primary-color) 25%, transparent),
    0 0 56px color-mix(in srgb, var(--nt-kb-primary-color) 12%, transparent);
}
</style>
