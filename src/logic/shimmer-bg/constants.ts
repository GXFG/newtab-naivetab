/**
 * @module shimmer-bg/constants
 * @description 幻彩效果类型常量。纯 CSS 动画实现，通过 .shimmer--{name} class 切换。
 * @consumers BackgroundShimmer.vue、presets.ts、BackgroundDrawer.vue
 */
/** 所有可用的幻彩效果类型 */
export const SHIMMER_BG_EFFECTS = [
  'aurora',
  'fluid',
  'waves',
  'drift',
  'blobs',
  'mesh',
  'noise',
  'ripple',
  'nebula',
  'veil',
  'prism',
  'stardust',
  'lava',
  'mist',
] as const

export type TShimmerEffect = (typeof SHIMMER_BG_EFFECTS)[number]
