import type { GlobalThemeOverrides } from 'naive-ui'
import { enUS, zhCN, darkTheme, useOsTheme, NButton } from 'naive-ui'
import pkg from '../../package.json'
import { isEdge } from '@/env'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { styleConst } from '@/styles/const'
import { APPEARANCE_TO_CODE_MAP, KEYBOARD_CODE_TO_LABEL_MAP, DAYJS_LANG_MAP, FONT_LIST, toggleIsDragMode, updateSetting, getLocalVersion, log, compareLeftVersionLessThanRightVersions, resetBookmarkPending } from '@/logic'

export const defaultConfig = {
  general: {
    version: pkg.version,
    appearance: 'auto' as 'light' | 'dark' | 'auto',
    pageTitle: chrome.i18n.getUILanguage() === 'en-US' ? 'NewTab' : '新标签页',
    lang: chrome.i18n.getUILanguage() || 'en-US',
    drawerPlacement: 'right' as 'left' | 'right',
    isBackgroundImageEnabled: true,
    isLoadPageAnimationEnabled: true,
    backgroundImageSource: 1 as 0 | 1 | 2, // 0:localFile, 1:network, 2:Photo of the Day
    backgroundImageHighQuality: false,
    backgroundImageNames: ['YurisNight_ZH-CN5738817931', 'MoonPhases_ZH-CN3779272016'],
    backgroundImageDescs: ['宇航员杰夫·威廉姆斯在国际空间站拍摄到的地球 (© Jeff Williams/NASA)', '一组月相照片 (© Delpixart/Getty Images)'],
    isBackgroundImageCustomUrlEnabled: false,
    backgroundImageCustomUrls: ['http://cn.bing.com/th?id=OHR.YurisNight_ZH-CN5738817931_1920x1080.jpg', 'http://cn.bing.com/th?id=OHR.MoonPhases_ZH-CN3779272016_1920x1080.jpg'],
    favoriteImageList: [
      {
        name: 'YurisNight_ZH-CN5738817931',
        desc: '宇航员杰夫·威廉姆斯在国际空间站拍摄到的地球 (© Jeff Williams/NASA)',
      },
      {
        name: 'MoonPhases_ZH-CN3779272016',
        desc: '一组月相照片 (© Delpixart/Getty Images)',
      },
      {
        name: 'ChurchillBears_ZH-CN1430090934',
        desc: '好奇地看着相机的北极熊，加拿大丘吉尔镇 (© Matthias Breiter/Minden Pictures)',
      },
      {
        name: 'WinterHalo_ZH-CN0666553211',
        desc: '厄尔士山脉上的光晕，德国萨克森州 (© Martin Ruegner/Getty Images)',
      },
      {
        name: 'DarwinsArch_ZH-CN9740478501',
        desc: '达尔文岛的达尔文拱门，厄瓜多尔加拉帕戈斯 (© miralex/Getty Images)',
      },
      {
        name: 'PoetrysCave_ZH-CN3196193909',
        desc: '鸟瞰罗卡附近的Grotta della Poesia，意大利莱切 (© Amazing Aerial Agency/Offset by Shutterstock)',
      },
      {
        name: 'PrathameshJaju_ZH-CN2207606082',
        desc: '月球的高清合成影像 (© Prathamesh Jaju)',
      },
      {
        name: 'MoonlightRainier_ZH-CN6263832605',
        desc: '雷尼尔山上空的银河星系，美国华盛顿州 (© Brad Goldpaint/Cavan)',
      },
      {
        name: 'Balsamroot_ZH-CN9456182640',
        desc: '山下盛开的箭叶脂根菊，美国大提顿国家公园 (© Mike Cavaroc/Tandem Stills + Motion)',
      },
    ],
    layout: {
      xOffsetKey: 'right',
      xOffsetValue: 1,
      xTranslateValue: 0,
      yOffsetKey: 'top',
      yOffsetValue: 50,
      yTranslateValue: -50,
    },
    fontFamily: 'Arial',
    fontSize: 14,
    fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
    primaryColor: ['rgba(16, 152, 173, 1)', 'rgba(16, 152, 173, 1)'],
    backgroundColor: ['rgba(53, 54, 58, 1)', 'rgba(53, 54, 58, 1)'],
    bgOpacity: 1,
    bgBlur: 0,
  },
  bookmark: {
    enabled: false,
    isListenBackgroundKeystrokes: true,
    isDblclickOpen: false,
    dblclickIntervalTime: 200, // ms
    isNewTabOpen: false,
    isSymbolEnabled: true,
    isNumberEnabled: false,
    isNameVisible: true,
    keymap: {
      q: {
        url: 'www.baidu.com',
        name: '',
      },
      w: {
        url: 'www.weibo.com',
        name: 'weibo',
      },
      t: {
        url: 'www.draw.io',
        name: '',
      },
      d: {
        url: 'www.douban.com',
        name: '',
      },
      g: {
        url: 'www.google.com',
        name: '',
      },
      z: {
        url: 'www.zhihu.com',
        name: '',
      },
      v: {
        url: 'www.v2ex.com',
        name: '',
      },
      b: {
        url: 'www.bilibili.com',
        name: '',
      },
      n: {
        url: 'www.youku.com',
        name: '',
      },
      m: {
        url: 'v.qq.com',
        name: 'tencent',
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
    margin: 2,
    width: 53,
    borderRadius: 3,
    fontFamily: 'Arial',
    fontSize: 12,
    fontColor: ['rgba(15, 23, 42, 1)', 'rgba(255, 255, 255, 1)'],
    backgroundColor: ['rgba(255, 255, 255, 1)', 'rgba(52, 52, 57, 1)'],
    backgroundActiveColor: ['rgba(209, 213, 219, 1)', 'rgba(73, 73, 77, 1)'],
    isBorderEnabled: true,
    borderWidth: 1,
    borderColor: ['rgba(71,85,105, 1)', 'rgba(73, 73, 77, 1)'],
    isShadowEnabled: true,
    shadowColor: ['rgba(44, 62, 80, 0.1)', 'rgba(0, 0, 0, 0.15)'],
  },
  clockDigital: {
    enabled: true,
    format: 'hh:mm:ss',
    unitEnabled: true,
    layout: {
      xOffsetKey: 'left',
      xOffsetValue: 50,
      xTranslateValue: -50,
      yOffsetKey: 'top',
      yOffsetValue: 50,
      yTranslateValue: -50,
    },
    fontFamily: 'Arial Rounded MT Bold',
    fontSize: 80,
    letterSpacing: 1.5,
    fontColor: ['rgba(228, 228, 231, 1)', 'rgba(228, 228, 231, 1)'],
    isShadowEnabled: true,
    shadowColor: ['rgba(33, 33, 33, 1)', 'rgba(33, 33, 33, 1)'],
    unit: {
      fontSize: 30,
    },
  },
  clockAnalog: {
    enabled: true,
    layout: {
      xOffsetKey: 'left',
      xOffsetValue: 50,
      xTranslateValue: -50,
      yOffsetKey: 'top',
      yOffsetValue: 25,
      yTranslateValue: 0,
    },
    width: 145,
  },
  date: {
    enabled: true,
    format: 'YYYY-MM-DD dddd',
    layout: {
      xOffsetKey: 'left',
      xOffsetValue: 50,
      xTranslateValue: -50,
      yOffsetKey: 'top',
      yOffsetValue: 58,
      yTranslateValue: 0,
    },
    fontFamily: 'Arial Rounded MT Bold',
    fontSize: 26,
    letterSpacing: 1,
    fontColor: ['rgba(228, 228, 231, 1)', 'rgba(228, 228, 231, 1)'],
    isShadowEnabled: true,
    shadowColor: ['rgba(33, 33, 33, 1)', 'rgba(33, 33, 33, 1)'],
  },
  calendar: {
    enabled: true,
    layout: {
      xOffsetKey: 'right',
      xOffsetValue: 0,
      xTranslateValue: 0,
      yOffsetKey: 'bottom',
      yOffsetValue: 0,
      yTranslateValue: 0,
    },
    width: 45,
    borderRadius: 4,
    fontFamily: 'Arial',
    fontSize: 14,
    fontColor: ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)'],
    backgroundColor: ['rgba(255, 255, 255, 1)', 'rgba(52, 52, 57, 1)'],
    backgroundActiveColor: ['rgba(209, 213, 219, 1)', 'rgba(73, 73, 77, 1)'],
    isBorderEnabled: true,
    borderWidth: 1,
    borderColor: ['rgba(239, 239, 245, 1)', 'rgba(73, 73, 77, 1)'],
    isShadowEnabled: true,
    shadowColor: ['rgba(14, 30, 37, 0.12)', 'rgba(14, 30, 37, 0.12)'],
  },
  weather: {
    enabled: false,
    apiKey: '72db57326f9f494ab04d1d431bc127e9',
    city: {
      id: '101010300', // 101010300
      name: '中国-北京市-北京-朝阳', // "中国-北京市-北京-朝阳"
    },
    temperatureUnit: 'c', // 'c' | 'f'
    speedUnit: 'kph', // 'kph' | 'mph'
    iconEnabled: true,
    forecastEnabled: false,
    layout: {
      xOffsetKey: 'left',
      xOffsetValue: 50,
      xTranslateValue: -50,
      yOffsetKey: 'bottom',
      yOffsetValue: 5,
      yTranslateValue: 0,
    },
    fontFamily: 'Arial Rounded MT Bold',
    fontSize: 14,
    fontColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
    iconSize: 50,
  },
  search: {
    enabled: true,
    iconEnabled: true,
    suggestionEnabled: true,
    placeholder: '',
    urlName: 'baidu',
    urlValue: 'https://www.baidu.com/s?word={query}',
    layout: {
      xOffsetKey: 'left',
      xOffsetValue: 50,
      xTranslateValue: -50,
      yOffsetKey: 'bottom',
      yOffsetValue: 30,
      yTranslateValue: 0,
    },
    padding: 25,
    width: 400,
    height: 45,
    borderRadius: 27.5,
    fontFamily: 'Arial',
    fontSize: 18,
    fontColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
    isBorderEnabled: true,
    borderWidth: 1,
    borderColor: ['rgba(167, 176, 188, 1)', 'rgba(71,85,105, 1)'],
    backgroundColor: ['rgba(152, 152, 152, 0.2)', 'rgba(74, 74, 74, 0.1)'],
    isShadowEnabled: true,
    shadowColor: ['rgba(31, 31, 31, 0.5)', 'rgba(31, 31, 31, 0.5)'],
  },
  memo: {
    enabled: false,
    countEnabled: true,
    content: '',
    layout: {
      xOffsetKey: 'right',
      xOffsetValue: 20,
      xTranslateValue: 0,
      yOffsetKey: 'top',
      yOffsetValue: 20,
      yTranslateValue: 0,
    },
    width: 200,
    height: 200,
    borderRadius: 4,
    fontFamily: 'Arial',
    fontSize: 14,
    fontColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
    isBorderEnabled: true,
    borderWidth: 1,
    borderColor: ['rgba(167, 176, 188, 1)', 'rgba(71,85,105, 1)'],
    backgroundColor: ['rgba(152, 152, 152, 0.2)', 'rgba(24, 24, 24, 0.3)'],
    isShadowEnabled: true,
    shadowColor: ['rgba(31, 31, 31, 0.5)', 'rgba(31, 31, 31, 0.5)'],
  },
  news: {
    enabled: false,
    sourceList: ['zhihu', 'weibo'] as NewsSources[],
    layout: {
      xOffsetKey: 'left',
      xOffsetValue: 0,
      xTranslateValue: 0,
      yOffsetKey: 'bottom',
      yOffsetValue: 0,
      yTranslateValue: 0,
    },
    margin: 12,
    width: 350,
    height: 310,
    borderRadius: 4,
    fontFamily: 'Arial',
    fontSize: 13,
    fontColor: ['rgba(15, 23, 42, 1)', 'rgba(255, 255, 255, 1)'],
    fontActiveColor: ['rgba(36, 64, 179, 1)', 'rgba(155, 177, 254, 1)'],
    backgroundColor: ['rgba(255, 255, 255, 1)', 'rgba(52, 52, 57, 1)'],
    backgroundActiveColor: ['rgba(239, 239, 245, 1)', 'rgba(73, 73, 77, 1)'],
    isBorderEnabled: true,
    borderWidth: 1,
    borderColor: ['rgba(239, 239, 245, 1)', 'rgba(73, 73, 77, 1)'],
    isShadowEnabled: true,
    shadowColor: ['rgba(14, 30, 37, 0.12)', 'rgba(14, 30, 37, 0.12)'],
  },
}

export const localConfig = reactive({
  general: useStorageLocal('c-general', defaultConfig.general),
  bookmark: useStorageLocal('c-bookmark', defaultConfig.bookmark),
  clockDigital: useStorageLocal('c-clockDigital', defaultConfig.clockDigital),
  clockAnalog: useStorageLocal('c-clockAnalog', defaultConfig.clockAnalog),
  date: useStorageLocal('c-date', defaultConfig.date),
  calendar: useStorageLocal('c-calendar', defaultConfig.calendar),
  search: useStorageLocal('c-search', defaultConfig.search),
  weather: useStorageLocal('c-weather', defaultConfig.weather),
  memo: useStorageLocal('c-memo', defaultConfig.memo),
  news: useStorageLocal('c-news', defaultConfig.news),
})

const defaultLocalState = {
  currAppearanceLabel: 'light' as 'light' | 'dark',
  currAppearanceCode: 0 as 0 | 1, // 0:light | 1:dark
  isUploadConfigStatusMap: {
    general: {
      loading: false,
      syncTime: 0,
    },
    bookmark: {
      loading: false,
      syncTime: 0,
    },
    clockDigital: {
      loading: false,
      syncTime: 0,
    },
    clockAnalog: {
      loading: false,
      syncTime: 0,
    },
    date: {
      loading: false,
      syncTime: 0,
    },
    calendar: {
      loading: false,
      syncTime: 0,
    },
    search: {
      loading: false,
      syncTime: 0,
    },
    weather: {
      loading: false,
      syncTime: 0,
    },
    memo: {
      loading: false,
      syncTime: 0,
    },
    news: {
      loading: false,
      syncTime: 0,
    },
  },
}

export const localState = useStorageLocal('l-state', defaultLocalState)

export const globalState = reactive({
  isSettingDrawerVisible: false,
  availableFontList: [] as any[],
  allCommandsMap: {},
  isUploadSettingLoading: false,
  isImportSettingLoading: false,
  isClearStorageLoading: false,
  isUserGuideModalVisible: false,
  isWhatsNewModalVisible: false,
  isSponsorModalVisible: false,
  isSearchFocused: false,
  isMemoFocused: false,
  currSettingTabValue: 'general',
  currNewsTabValue: localConfig.news.sourceList[0] || '',
})

// UI language
const NATIVE_UI_LOCALE_MAP = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

export const nativeUILang = ref(NATIVE_UI_LOCALE_MAP[localConfig.general.lang] || enUS)

watch(
  () => localConfig.general.lang,
  () => {
    nativeUILang.value = NATIVE_UI_LOCALE_MAP[localConfig.general.lang] || enUS
  },
)

// Theme
export const currTheme = ref()

const osTheme = useOsTheme() // light | dark | null

watch(
  [() => osTheme.value, () => localConfig.general.appearance],
  () => {
    if (localConfig.general.appearance === 'auto') {
      localState.value.currAppearanceCode = APPEARANCE_TO_CODE_MAP[osTheme.value as any]
      localState.value.currAppearanceLabel = osTheme.value || 'light'
      currTheme.value = osTheme.value === 'dark' ? darkTheme : null
      return
    }
    localState.value.currAppearanceCode = APPEARANCE_TO_CODE_MAP[localConfig.general.appearance] as 0 | 1
    localState.value.currAppearanceLabel = localConfig.general.appearance as 'light' | 'dark'
    currTheme.value = localConfig.general.appearance === 'dark' ? darkTheme : null
  },
  { immediate: true },
)

export const getAllCommandsConfig = () => {
  chrome.commands.getAll((commands) => {
    for (const { name, shortcut } of commands) {
      const labelKey = KEYBOARD_CODE_TO_LABEL_MAP[(name as string)] || name
      globalState.allCommandsMap[labelKey] = shortcut
    }
  })
}

const initAvailableFontList = async () => {
  const fontCheck = new Set(FONT_LIST.sort())
  // 在所有字体加载完成后进行操作
  await document.fonts.ready
  const availableList = new Set()
  for (const font of fontCheck.values()) {
    // https://developer.mozilla.org/zh-CN/docs/Web/API/FontFaceSet/check
    if (document.fonts.check(`12px "${font}"`)) {
      availableList.add(font)
    }
  }
  globalState.availableFontList = [...availableList.values()]
}

export const switchSettingDrawerVisible = (status: boolean) => {
  globalState.isSettingDrawerVisible = status
  if (status && globalState.availableFontList.length === 0) {
    initAvailableFontList()
  }
  if (Object.keys(globalState.allCommandsMap).length === 0) {
    getAllCommandsConfig()
  }
}

export const currDayjsLang = computed(() => DAYJS_LANG_MAP[localConfig.general.lang] || 'en')

export const openWhatsNewModal = () => {
  globalState.isWhatsNewModalVisible = true
}

export const openUserGuideModal = () => {
  globalState.isUserGuideModalVisible = true
}

export const openSponsorModal = () => {
  globalState.isSponsorModalVisible = true
}

export const isFirstOpen = useStorageLocal('data-first', true)

export const handleFirstOpen = () => {
  if (!isFirstOpen.value) {
    return
  }
  // 首次打开扩展时，打开画布模式 & 帮助弹窗
  toggleIsDragMode(true)
  openUserGuideModal()
}

export const handleStateResetAndUpdate = () => {
  resetBookmarkPending()
  const version = getLocalVersion()
  // handle old version
  if (compareLeftVersionLessThanRightVersions(version, '1.6.3')) {
    localState.value.isUploadConfigStatusMap = defaultLocalState.isUploadConfigStatusMap
  }
}

export const handleAppUpdate = async () => {
  const version = getLocalVersion()
  log('Version', version)
  if (!compareLeftVersionLessThanRightVersions(version, pkg.version)) {
    return
  }
  log('Get new version', pkg.version)
  localConfig.general.version = pkg.version
  // 更新成功提示
  window.$notification.success({
    duration: 8000,
    title: `${window.$t('common.update')}${window.$t('common.success')}`,
    content: `${window.$t('common.version')} ${pkg.version}`,
    action: () =>
      h(
        NButton,
        {
          text: true,
          type: 'primary',
          onClick: () => {
            openWhatsNewModal()
          },
        },
        {
          default: () => window.$t('common.whatsNew'),
        },
      ),
  })
  // 刷新配置设置
  await updateSetting()
}

export const getIsComponentRender = (componentName: Components) => computed(() => localConfig[componentName].enabled)

export const getLayoutStyle = (name: string) => {
  return computed(() => {
    let style = `${localConfig[name].layout.xOffsetKey}:${localConfig[name].layout.xOffsetValue}vw;`
    style += `${localConfig[name].layout.yOffsetKey}:${localConfig[name].layout.yOffsetValue}vh;`
    style += `transform:translate(${localConfig[name].layout.xTranslateValue}%, ${localConfig[name].layout.yTranslateValue}%);`
    return style
  })
}

export const getStyleConst = (field: string) => {
  return computed(() => {
    return styleConst.value[field][localState.value.currAppearanceCode] || styleConst.value[field][0]
  })
}

/**
 * e.g. getStyleField('date', 'unit.fontSize', 'px', 1.2)
 */
export const getStyleField = (component: ConfigField, field: string, unit?: string, ratio?: number) => {
  return computed(() => {
    let style = field.split('.').reduce((r: any, c: string) => r[c], localConfig[component])
    if (Array.isArray(style)) {
      return style[localState.value.currAppearanceCode]
    }
    if (ratio) {
      style = style * ratio
    }
    if (unit) {
      style = `${style}${unit}`
    }
    return style
  })
}

export const customPrimaryColor = getStyleField('general', 'primaryColor')

export const themeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: customPrimaryColor.value,
    primaryColorSuppl: customPrimaryColor.value,
    primaryColorHover: '#7f8c8d',
    primaryColorPressed: '#57606f',
  },
}

/**
 * 针对Edge 设置为其他favicon 避免展示黑色方块
 * 等价于 <link rel="shortcut icon" type="image/x-icon" href="/assets/favicon.ico">
 */
export const setEdgeFavicon = () => {
  if (!isEdge) {
    return
  }
  const link = document.createElement('link')
  link.setAttribute('rel', 'shortcut icon')
  link.setAttribute('type', 'image/x-icon')
  link.setAttribute('href', '/assets/favicon.ico')
  document.getElementsByTagName('head')[0].appendChild(link)
}

watch(() => localConfig.general.pageTitle, () => {
  document.title = localConfig.general.pageTitle
}, { immediate: true })

watch([
  () => localConfig.general.backgroundColor,
  () => localConfig.general.fontColor,
  () => localState.value.currAppearanceCode,
], () => {
  document.body.style.setProperty('--bg-main', getStyleField('general', 'backgroundColor').value)
  document.body.style.setProperty('--text-color-main', getStyleField('general', 'fontColor').value)
}, {
  immediate: true,
  deep: true, // color is array
})
