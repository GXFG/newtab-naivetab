import pkg from '../../package.json'
import { isChrome } from '@/env'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { styleConst } from '@/styles/index'
import { DAYJS_LANG_MAP, FONT_LIST, toggleIsDragMode, moveState, updateSetting, log } from '@/logic'

export const defaultConfig = {
  general: {
    version: pkg.version,
    appearance: 'auto', // light | dark | auto
    pageTitle: 'NewTab',
    lang: chrome.i18n.getUILanguage() || 'en-US',
    drawerPlacement: 'right' as any,
    isBackgroundImageEnabled: true,
    isLoadPageAnimationEnabled: true,
    backgroundImageSource: 1, // 0:localFile, 1:network
    backgroundImageHighQuality: false,
    backgroundImageName: 'YurisNight_ZH-CN5738817931',
    backgroundImageDesc: '宇航员杰夫·威廉姆斯在国际空间站拍摄到的地球 (© Jeff Williams/NASA)',
    isBackgroundImageCustomUrlEnabled: false,
    backgroundImageCustomUrl: '',
    favoriteImageList: [
      {
        name: 'ChurchillBears_ZH-CN1430090934',
        desc: '好奇地看着相机的北极熊，加拿大丘吉尔镇 (© Matthias Breiter/Minden Pictures)',
      },
      {
        name: 'DarwinsArch_ZH-CN9740478501',
        desc: '达尔文岛的达尔文拱门，厄瓜多尔加拉帕戈斯 (© miralex/Getty Images)',
      },
      {
        name: 'WinterHalo_ZH-CN0666553211',
        desc: '厄尔士山脉上的光晕，德国萨克森州 (© Martin Ruegner/Getty Images)',
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
        name: 'YurisNight_ZH-CN5738817931',
        desc: '宇航员杰夫·威廉姆斯在国际空间站拍摄到的地球 (© Jeff Williams/NASA)',
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
    primaryColor: ['rgba(34, 117, 213, 1)', 'rgba(34, 117, 213, 1)'],
    backgroundColor: ['rgba(53, 54, 58, 1)', 'rgba(53, 54, 58, 1)'],
    bgOpacity: 1,
    bgBlur: 0,
  },
  bookmark: {
    enabled: false,
    isSymbolEnabled: true,
    isNumberEnabled: false,
    isNewTabOpen: true,
    isDblclickOpen: true,
    isNameVisible: true,
    dblclickIntervalTime: 200, // ms
    keymap: {},
    layout: {
      xOffsetKey: 'left',
      xOffsetValue: 50,
      xTranslateValue: -50,
      yOffsetKey: 'top',
      yOffsetValue: 1,
      yTranslateValue: 0,
    },
    margin: 3,
    width: 50,
    borderRadius: 4,
    fontFamily: 'Arial',
    fontSize: 12,
    fontColor: ['rgba(15, 23, 42, 1)', 'rgba(15, 23, 42, 1)'],
    backgroundColor: ['rgba(209, 213, 219, 1)', 'rgba(212, 212, 216, 1)'],
    backgroundActiveColor: ['rgba(255, 255, 255, 1)', 'rgba(71,85,105, 1)'],
    isBorderEnabled: true,
    borderWidth: 1,
    borderColor: ['rgba(71,85,105, 1)', 'rgba(71,85,105, 1)'],
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
    letterSpacing: 2,
    fontColor: ['rgba(228, 228, 231, 1)', 'rgba(228, 228, 231, 1)'],
    isShadowEnabled: true,
    shadowColor: ['rgba(33, 33, 33, 1)', 'rgba(33, 33, 33, 1)'],
    unit: {
      fontSize: 30,
    },
  },
  clockAnalog: {
    enabled: true,
    theme: 0, // themeList的索引
    layout: {
      xOffsetKey: 'left',
      xOffsetValue: 50,
      xTranslateValue: -50,
      yOffsetKey: 'top',
      yOffsetValue: 25,
      yTranslateValue: 0,
    },
    width: 150,
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
    backgroundColor: ['rgba(255, 255, 255, 1)', 'rgba(30, 30, 30, 1)'],
    backgroundActiveColor: ['rgba(209, 213, 219, 1)', 'rgba(113, 113, 113, 1)'],
    isBorderEnabled: true,
    borderWidth: 1,
    borderColor: ['rgba(71,85,105, 1)', 'rgba(71,85,105, 1)'],
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
    iconEnabled: false,
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
    width: 380,
    borderRadius: 4,
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
    backgroundColor: ['rgba(152, 152, 152, 0.2)', 'rgba(74, 74, 74, 0.1)'],
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
    fontActiveColor: ['rgba(36, 64, 179, 1)', 'rgba(75, 94, 104, 1)'],
    backgroundColor: ['rgba(255, 255, 255, 1)', 'rgba(30, 30, 30, 1)'],
    backgroundActiveColor: ['rgba(239, 239, 245, 1)', 'rgba(54, 54, 54, 1)'],
    isBorderEnabled: true,
    borderWidth: 1,
    borderColor: ['rgba(239, 239, 245, 1)', 'rgba(71,85,105, 1)'],
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

export const localState = useStorageLocal('l-state', {
  currAppearanceCode: 0, // 0:light | 1:dark
  syncTimeMap: {
    general: 0,
    bookmark: 0,
    clockDigital: 0,
    clockAnalog: 0,
    date: 0,
    calendar: 0,
    search: 0,
    weather: 0,
    memo: 0,
    news: 0,
  },
})

export const globalState = reactive({
  isSettingDrawerVisible: false,
  availableFontList: [] as any[],
  isUploadConfigLoadingMap: {
    general: false,
    bookmark: false,
    clockDigital: false,
    clockAnalog: false,
    date: false,
    calendar: false,
    search: false,
    weather: false,
    memo: false,
    news: false,
  },
  isUploadSettingLoading: false,
  isImportSettingLoading: false,
  isClearStorageLoading: false,
  isHelpModalVisible: false,
  isWhatsNewModalVisible: false,
  isSponsorModalVisible: false,
  isSearchFocused: false,
  isMemoFocused: false,
  currSettingTabValue: 'general',
  currNewsTabValue: localConfig.news.sourceList[0] || '',
})

const initAvailableFontList = async() => {
  const fontCheck = new Set(FONT_LIST.sort())
  await document.fonts.ready
  const availableList = new Set()
  for (const font of fontCheck.values()) {
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
}

export const currDayjsLang = computed(() => DAYJS_LANG_MAP[localConfig.general.lang] || 'en')

export const isFirstOpen = useStorageLocal('data-first', true)

export const initFirstOpen = () => {
  if (!isFirstOpen.value) {
    return
  }
  // 首次打开扩展时，打开画布模式 & 帮助弹窗
  toggleIsDragMode(true)
  isFirstOpen.value = false
}

export const openWhatsNewModal = () => {
  globalState.isWhatsNewModalVisible = true
}
export const closeWhatsNewModal = () => {
  globalState.isWhatsNewModalVisible = false
}

export const openHelpModal = () => {
  globalState.isHelpModalVisible = true
}

export const openSponsorModal = () => {
  globalState.isSponsorModalVisible = true
}

export const getLocalVersion = () => {
  let version = localConfig.general.version
  // handle old version 兼容小于0.9版本的旧数据结构
  const settingGeneral = localStorage.getItem('setting-general')
  if (settingGeneral) {
    version = JSON.parse(settingGeneral).version || 0
  }
  return version
}

export const handleUpdate = async() => {
  const version = getLocalVersion()
  log('Version', version)
  const localVersion = +version.split('.').join('')
  const currPkgVersion = +pkg.version.split('.').join('')
  if (localVersion >= currPkgVersion) {
    return
  }
  log('Get new version', pkg.version)
  localConfig.general.version = pkg.version
  // 更新成功提示
  window.$notification.success({
    title: `${window.$t('common.update')}${window.$t('common.success')}`,
    content: `${window.$t('common.version')} ${pkg.version}`,
    duration: 5000,
  })
  // 刷新配置设置
  await updateSetting()
}

export const createTab = (url: string, active = true) => {
  if (url.length === 0) {
    return
  }
  chrome.tabs.create({ url, active })
}

export const getDomainIcon = (url: string) => {
  if (isChrome) {
    return `chrome://favicon/size/32@2x/${url}`
  }
  return `${url}/favicon.ico`
}

export const getIsComponentRender = (componentName: Components) => computed(() => localConfig[componentName].enabled || moveState.dragTempEnabledMap[componentName])

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
    if (style instanceof Array) {
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
