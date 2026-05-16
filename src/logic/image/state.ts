/**
 * @module image/state
 * @description 图片系统响应式状态：Bing/Pexels 图库数据（持久化到 localStorage）、
 *   当前背景图渲染状态（previewImageUrl/fullImageUrl）、加载标记。
 *   注意：imageState 使用 reactive() 包裹，禁止解构，必须 imageState.xxx 访问。
 * @dependencies composables/useStorageLocal.ts
 * @consumers image/service.ts、image/gallery.ts、newtab/layers/BackgroundImg.vue
 * @see docs/architecture/background.md
 */
import { useStorageLocal } from '@/composables/useStorageLocal'

export const imageLocalState = useStorageLocal('data-images', {
  bing: {
    syncTime: 0,
    list: [] as TImage.BaseImageItem[],
  },
  pexels: {
    syncTime: 0,
    list: [] as TImage.BaseImageItem[],
    currentPage: 1,
  },
})

const firstScreenPreviewImageUrl = localStorage.getItem('l-firstScreen') || ''

// 注意：imageState 使用 reactive() 包裹，禁止在任何地方解构（如 const { fullImageUrl } = imageState），
// 否则响应性断裂。应始终通过 imageState.xxx 的方式访问属性。
export const imageState = reactive({
  currBackgroundImageFileName: '',
  previewImageUrl: firstScreenPreviewImageUrl,
  fullImageUrl: '',
})

export const isImageGalleryLoading = ref(false)

export const isImageLoading = ref(false)
