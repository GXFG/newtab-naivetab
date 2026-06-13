/**
 * 应用常量 — 防抖延迟、拖拽阈值、外观/时间/焦点映射表、Pexels API。
 */
export const MERGE_CONFIG_DELAY = 2000
export const MERGE_CONFIG_MAX_DELAY = 5000

export const DRAG_TRIGGER_DISTANCE = 20

export const FAVORITE_IMAGE_MAX_COUNT = 30
export const FAVORITE_SWATCHE_MAX_COUNT = 24

export const LOCAL_BACKGROUND_IMAGE_MAX_SIZE_M = 15

/** 二级 Drawer 宽度，应小于父级 NTDrawer */
export const SECOND_MODAL_WIDTH = 590

export const TEXT_ALIGN_TO_JUSTIFY_CONTENT_MAP = {
  left: 'flex-start',
  center: 'center',
  right: 'flex-end',
}

export const APPEARANCE_TO_CODE_MAP = {
  light: 0,
  dark: 1,
}

export const DAYJS_LANG_MAP = {
  'zh-CN': 'zh-cn',
  'en-US': 'en',
}

// 焦点元素选择器映射
export const FOCUS_ELEMENT_SELECTOR_MAP = {
  root: '#app',
  search: '#search .search__input',
  memo: '#memo .memo__input',
  keyboardBookmark: '#keyboardBookmark',
}

export const PEXELS_API =
  'Ao3fG3suWGpoXTKYLycwrSLHSITran9E3MoHxxsTVT5z1aHjCDxZcr3m'
