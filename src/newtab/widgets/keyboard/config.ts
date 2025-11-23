export const WIDGET_CODE = 'keyboard'

export const WIDGET_CONFIG = {
  enabled: true,
  source: 2,
  isListenBackgroundKeystrokes: true,
  isDblclickOpen: false,
  dblclickIntervalTime: 200,
  isNewTabOpen: false,
  defaultExpandFolder: null as null | string,
  keymap: {
    KeyQ: {
      url: 'www.baidu.com',
      name: '',
    },
    KeyW: {
      url: 'www.google.com',
      name: '',
    },
    KeyE: {
      url: 'www.bing.com',
      name: '',
    },
    KeyA: {
      url: 'https://gxfg.github.io/naivetab-doc/',
      name: 'welcome',
    },
  },
  layout: {
    xOffsetKey: 'left',
    xOffsetValue: 50,
    xTranslateValue: -50,
    yOffsetKey: 'top',
    yOffsetValue: 1,
    yTranslateValue: 0,
  },
  keyboardType: 'key61',
  splitSpace: 'space1' as 'space1' | 'space2' | 'space3',
  // keycap
  keycapType: 'gmk',
  keycapPadding: 1.5,
  keycapSize: 62,
  keycapBorderRadius: 5,
  isKeycapBorderEnabled: false,
  keycapBorderWidth: 1,
  keycapBorderColor: ['rgba(71, 85, 105, 1)', 'rgba(73, 73, 77, 1)'],
  keycapBackgroundBlur: 0,
  // shell
  isShellVisible: true,
  shellVerticalPadding: 15,
  shellHorizontalPadding: 15,
  shellBorderRadius: 10,
  shellColor: ['rgba(255, 255, 255, 1.0)', 'rgba(66, 66, 70, 1.0)'],
  isShellShadowEnabled: true,
  shellShadowColor: ['rgba(0, 0, 0, 0.4)', 'rgba(0, 0, 0, 0.4)'],
  shellBackgroundBlur: 5,
  // plate
  isPlateVisible: true,
  platePadding: 3,
  plateBorderRadius: 5,
  plateColor: ['rgba(119, 119, 119,1.0)', 'rgba(119, 119, 119,1.0)'],
  plateBackgroundBlur: 0,
  // keycap key
  isCapKeyVisible: true,
  keycapKeyFontFamily: 'OpenCherry',
  keycapKeyFontSize: 12,
  // url name
  isNameVisible: true,
  keycapBookmarkFontFamily: 'Arial',
  keycapBookmarkFontSize: 11,
  // icon
  isFaviconVisible: true,
  faviconSize: 0.85,
  isTactileBumpsVisible: true,
  // color
  mainFontColor: ['rgba(34,34,34,1.0)', 'rgba(228,222,221,1.0)'],
  mainBackgroundColor: ['rgba(255, 255, 255, 1)', 'rgba(95,92,82,1.0)'],
  emphasisOneFontColor: ['rgba(255, 255, 255, 0.9)', 'rgba(228,222,221,1.0)'],
  emphasisOneBackgroundColor: ['rgba(55,54,52,1.0)', 'rgba(51,52,48,1.0)'],
  emphasisTwoFontColor: ['rgba(255, 255, 255, 0.9)', 'rgba(228,222,221,1.0)'],
  emphasisTwoBackgroundColor: ['rgba(34, 34, 34, 1)', 'rgba(51,52,48,1.0)'],
}

export type TWidgetConfig = typeof WIDGET_CONFIG
