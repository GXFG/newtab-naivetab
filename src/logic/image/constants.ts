/**
 * @module image/constants
 * @description 背景图片来源来源常量：本地/网络/Bing/幻彩 四类来源枚举。
 * @consumers image/service.ts、image/gallery.ts、image/utils.ts、BackgroundImg.vue、BackgroundDrawer.vue
 * @see docs/architecture/background.md
 */
export const BACKGROUND_IMAGE_SOURCE = {
  LOCAL: 0,
  NETWORK: 1,
  BING_PHOTO: 2,
  SHIMMER: 3,
} as const
export type BackgroundImageSource =
  (typeof BACKGROUND_IMAGE_SOURCE)[keyof typeof BACKGROUND_IMAGE_SOURCE]

/** 图片网络来源类型 */
export const IMAGE_NETWORK_SOURCE = {
  BING: 1,
  PEXELS: 2,
} as const
export type ImageNetworkSource =
  (typeof IMAGE_NETWORK_SOURCE)[keyof typeof IMAGE_NETWORK_SOURCE]
