export const WIDGET_CODE = 'keyboardBookmark'

import type { TShortcutModifier } from '@/logic/globalShortcut/shortcut-utils'

export const PRESERVE_FIELDS = [
  'source',
  'globalShortcutModifiers',
  'noModifierMode',
  'keymap',
]

export const WIDGET_CONFIG = {
  enabled: true,
  source: 2,
  isGlobalShortcutEnabled: true,
  noModifierMode: false,
  shortcutInInputElement: true,
  globalShortcutModifiers: ['alt'] as TShortcutModifier[],
  urlBlacklist: [] as string[],
  isNewTabOpen: false,
  defaultExpandFolder: null as null | string,
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
    KeyR: {
      url: 'www.reddit.com',
    },
    KeyT: {
      url: 'tieba.baidu.com',
    },
    KeyY: {
      url: 'www.youtube.com',
    },
    KeyI: {
      url: 'mail.google.com',
    },
    KeyO: {
      url: 'outlook.live.com',
    },
    KeyA: {
      url: 'www.apple.com.cn',
    },
    KeyS: {
      url: 'sspai.com',
    },
    KeyD: {
      url: 'douban.com',
    },
    KeyF: {
      url: 'www.figma.com',
    },
    KeyG: {
      url: 'github.com',
    },
    Enter: {
      url: 'gxfg.github.io/newtab-naivetab/',
      name: 'NaiveTab',
    },
    KeyZ: {
      url: 'www.zhihu.com/hot',
    },
    KeyX: {
      url: 'x.com',
    },
    KeyC: {
      url: 'xiaohongshu.com',
    },
    KeyV: {
      url: 'www.douyin.com',
    },
    KeyB: {
      url: 'www.bilibili.com',
    },
    MetaLeft: {
      url: 'gemini.google.com',
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
