export const WIDGET_CODE = 'keyboardBookmark'

import type { TShortcutModifier } from '@/logic/shortcut/utils'

/**
 * keyboardBookmark 的可缩放字段在 keyboardCommon 下，
 * 通过 configSection 指定跨 section 引用。
 * keycapSize 是主控尺寸，其他尺寸是其比例派生值。
 */
export const SCALABLE_FIELDS = {
  keycapSize: { min: 30, max: 150, configSection: 'keyboardCommon' },
  shellVerticalPadding: { min: 2, max: 60, configSection: 'keyboardCommon' },
  shellHorizontalPadding: { min: 2, max: 60, configSection: 'keyboardCommon' },
}
import {
  MAX_LAYERS,
  BookmarkSource,
  type TLayerConfig,
} from '@/common/widget-constants'

export const PRESERVE_FIELDS = [
  'source',
  'isEnabled',
  'isGlobalShortcutEnabled',
  'noModifierMode',
  'shortcutInInputElement',
  'globalShortcutModifiers',
  'urlBlacklist',
  'keymap',
  'layers',
]

export const WIDGET_CONFIG = {
  enabled: true,
  source: BookmarkSource.BROWSER,
  isEnabled: true,
  isGlobalShortcutEnabled: true,
  noModifierMode: false,
  shortcutInInputElement: true,
  globalShortcutModifiers: ['alt'] as TShortcutModifier[],
  urlBlacklist: [] as string[],
  isNewTabOpen: false,
  /**
   * 书签层配置，固定 MAX_LAYERS 层。
   * 如需扩展层数量，只需修改 MAX_LAYERS 常量。
   */
  layers: Array.from({ length: MAX_LAYERS }, (_, i) => ({
    sourceFolderPath: '',
  })) as TLayerConfig[],
  keymap: {
    Digit1: {
      url: 'www.baidu.com',
    },
    Digit2: {
      url: 'www.google.com',
    },
    Digit3: {
      url: 'www.bing.com',
    },
  } as Record<string, TBookmarkEntry>,
  layout: {
    xOffsetKey: 'left',
    xOffsetValue: 50,
    xTranslateValue: -50,
    yOffsetKey: 'top',
    yOffsetValue: 1,
    yTranslateValue: 0,
  },
}

export type TWidgetConfig = typeof WIDGET_CONFIG
