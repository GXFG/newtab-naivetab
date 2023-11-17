import type { GlobalThemeOverrides } from 'naive-ui'
import { enUS, zhCN, darkTheme, useOsTheme, NButton } from 'naive-ui'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { isEdge } from '@/env'
import { styleConst } from '@/styles/const'
import { URL_CHROME_EXTENSIONS_SHORTCUTS, URL_EDGE_EXTENSIONS_SHORTCUTS, APPEARANCE_TO_CODE_MAP, DAYJS_LANG_MAP, FONT_LIST, KEYBOARD_OLD_TO_NEW_CODE_MAP } from '@/logic/const'
import { defaultConfig, defaultLocalState } from '@/logic/config'
import { log, createTab, compareLeftVersionLessThanRightVersions } from '@/logic/util'
import { updateSetting, getLocalVersion } from '@/logic/storage'
import { resetBookmarkPending } from '@/logic/bookmark'
import { newsState } from '@/logic/news'
import pkg from '../../package.json'

export const localConfig = reactive({
  general: useStorageLocal('c-general', defaultConfig.general),
  bookmark: useStorageLocal('c-bookmark', defaultConfig.bookmark),
  clockDigital: useStorageLocal('c-clockDigital', defaultConfig.clockDigital),
  clockAnalog: useStorageLocal('c-clockAnalog', defaultConfig.clockAnalog),
  date: useStorageLocal('c-date', defaultConfig.date),
  calendar: useStorageLocal('c-calendar', defaultConfig.calendar),
  search: useStorageLocal('c-search', defaultConfig.search),
  memo: useStorageLocal('c-memo', defaultConfig.memo),
  weather: useStorageLocal('c-weather', defaultConfig.weather),
  news: useStorageLocal('c-news', defaultConfig.news),
})

export const localState = useStorageLocal('l-state', defaultLocalState)

export const globalState = reactive({
  isSettingDrawerVisible: false,
  isGuideMode: false,
  isFullScreen: !!document.fullscreenElement,
  availableFontList: [] as string[],
  allCommandsMap: {},
  isUploadSettingLoading: false,
  isImportSettingLoading: false,
  isClearStorageLoading: false,
  isChangelogModalVisible: false,
  isSponsorModalVisible: false,
  isSearchFocused: false,
  isMemoFocused: false,
  currSettingTabValue: 'general',
  currNewsTabValue: localConfig.news.sourceList[0] || '',
})

document.addEventListener('fullscreenchange', () => {
  globalState.isFullScreen = !!document.fullscreenElement
})

export const toggleFullscreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen()
  } else if (document.exitFullscreen) {
    document.exitFullscreen()
  }
}

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
      localState.value.currAppearanceCode = APPEARANCE_TO_CODE_MAP[osTheme.value as keyof typeof APPEARANCE_TO_CODE_MAP] as 0 | 1
      localState.value.currAppearanceLabel = osTheme.value || 'light'
      currTheme.value = osTheme.value === 'dark' ? darkTheme : null
      return
    }
    localState.value.currAppearanceCode = APPEARANCE_TO_CODE_MAP[localConfig.general.appearance] as 0 | 1
    localState.value.currAppearanceLabel = localConfig.general.appearance as 'light' | 'dark'
    currTheme.value = localConfig.general.appearance === 'dark' ? darkTheme : null
  },
  {
    immediate: true,
  },
)

export const getAllCommandsConfig = () => {
  chrome.commands.getAll((commands) => {
    for (const { name, shortcut } of commands) {
      globalState.allCommandsMap[name as string] = shortcut
    }
  })
}

export const openConfigShortcutsPage = () => createTab(isEdge ? URL_EDGE_EXTENSIONS_SHORTCUTS : URL_CHROME_EXTENSIONS_SHORTCUTS)

const initAvailableFontList = async () => {
  const fontCheck = new Set(FONT_LIST.sort())
  // 在所有字体加载完成后进行操作
  await document.fonts.ready
  const availableList: Set<string> = new Set()
  for (const font of fontCheck.values()) {
    // https://developer.mozilla.org/zh-CN/docs/Web/API/FontFaceSet/check
    if (document.fonts.check(`12px "${font}"`)) {
      availableList.add(font)
    }
  }
  globalState.availableFontList = [...availableList.values()]
}

export const availableFontOptions = computed(() =>
  globalState.availableFontList.map((font: string) => ({
    label: font,
    value: font,
  })),
)

export const fontSelectRenderLabel = (option: SelectStringItem) => {
  return [
    h(
      'div',
      {
        style: {
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        },
      },
      [
        h('span', {}, option.label),
        h(
          'span',
          {
            style: {
              fontFamily: option.label,
            },
          },
          'abc-ABC-0123',
        ),
      ],
    ),
  ]
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

export const openChangelogModal = () => {
  globalState.isChangelogModalVisible = true
}

export const openSponsorModal = () => {
  globalState.isSponsorModalVisible = true
}

export const handleStateResetAndUpdate = () => {
  resetBookmarkPending()
  // handle old version
  if (!localState.value.isUploadConfigStatusMap) {
    localState.value.isUploadConfigStatusMap = defaultLocalState.isUploadConfigStatusMap
  }
}

const updateSuccess = () => {
  window.$notification.success({
    duration: 5000,
    title: `${window.$t('common.update')}${window.$t('common.success')}`,
    content: `${window.$t('common.version')} ${pkg.version}`,
    action: () =>
      h(
        NButton,
        {
          text: true,
          type: 'primary',
          onClick: () => {
            openChangelogModal()
          },
        },
        {
          default: () => window.$t('rightMenu.changelog'),
        },
      ),
  })
}

export const handleAppUpdate = async () => {
  const version = getLocalVersion()
  log('Version', version)
  if (!compareLeftVersionLessThanRightVersions(version, pkg.version)) {
    return
  }
  log('Get new version', pkg.version)
  // TODO 每次更新均需要手动处理新版本变更的本地数据结构
  if (compareLeftVersionLessThanRightVersions(version, '1.6.3')) {
    let newLocalState = {}
    const lState = localStorage.getItem('l-state')
    if (lState) {
      newLocalState = {
        ...defaultLocalState,
        ...JSON.parse(lState),
      }
    }
    localStorage.setItem('l-state', JSON.stringify(newLocalState))
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.7.5')) {
    newsState.value.toutiao = {
      syncTime: 0,
      list: [],
    }
    newsState.value.kr36 = {
      syncTime: 0,
      list: [],
    }
    newsState.value.bilibili = {
      syncTime: 0,
      list: [],
    }
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.9.0')) {
    localConfig.bookmark.keyboardType = 'key61'
    localConfig.bookmark.keycapType = 'gmk'
    localConfig.bookmark.keycapPadding = 1.5
    localConfig.bookmark.keycapSize = 60
    localConfig.bookmark.keycapKeyFontFamily = 'Arial Rounded MT Bold'
    localConfig.bookmark.keycapKeyFontSize = 12
    localConfig.bookmark.keycapBookmarkFontFamily = 'Arial'
    localConfig.bookmark.keycapBookmarkFontSize = 12
    localConfig.bookmark.mainFontColor = ['rgba(82,85,84,1.0)', 'rgba(228,222,221,1.0)']
    localConfig.bookmark.mainBackgroundColor = ['rgba(230,232,227,1.0)', 'rgba(95,92,82,1.0)']
    localConfig.bookmark.emphasisOneFontColor = ['rgba(34,34,34,1.0)', 'rgba(228,222,221,1.0)']
    localConfig.bookmark.emphasisOneBackgroundColor = ['rgba(160,164,167,1.0)', 'rgba(51,52,48,1.0)']
    localConfig.bookmark.emphasisTwoFontColor = ['rgba(34,34,34,1.0)', 'rgba(228,222,221,1.0)']
    localConfig.bookmark.emphasisTwoBackgroundColor = ['rgba(160,164,167,1.0)', 'rgba(51,52,48,1.0)']
    delete (localConfig.bookmark as any).margin
    delete (localConfig.bookmark as any).width
    delete (localConfig.bookmark as any).fontFamily
    delete (localConfig.bookmark as any).fontSize
    delete (localConfig.bookmark as any).backgroundColor
    delete (localConfig.bookmark as any).BackgroundActiveColor
    delete (localConfig.bookmark as any).isShadowEnabled
    delete (localConfig.bookmark as any).shadowColor
    for (const keyLabel of Object.keys(localConfig.bookmark.keymap)) {
      const newKeycode = KEYBOARD_OLD_TO_NEW_CODE_MAP[keyLabel]
      if (newKeycode) {
        localConfig.bookmark.keymap[newKeycode] = localConfig.bookmark.keymap[keyLabel]
        delete localConfig.bookmark.keymap[keyLabel]
      }
    }
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.12.0')) {
    localState.value.isUploadConfigStatusMap.general.syncId = ''
    localState.value.isUploadConfigStatusMap.bookmark.syncId = ''
    localState.value.isUploadConfigStatusMap.clockDigital.syncId = ''
    localState.value.isUploadConfigStatusMap.clockAnalog.syncId = ''
    localState.value.isUploadConfigStatusMap.date.syncId = ''
    localState.value.isUploadConfigStatusMap.calendar.syncId = ''
    localState.value.isUploadConfigStatusMap.search.syncId = ''
    localState.value.isUploadConfigStatusMap.weather.syncId = ''
    localState.value.isUploadConfigStatusMap.memo.syncId = ''
    localState.value.isUploadConfigStatusMap.news.syncId = ''
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.13.0')) {
    const biliIndex = localConfig.news.sourceList.indexOf('bilibili')
    if (biliIndex !== -1) {
      localConfig.news.sourceList.splice(biliIndex, 1)
    }
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.16.0')) {
    localConfig.news.margin /= 2
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.17.0')) {
    localConfig.general.isFirstOpen = false
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.17.1')) {
    localConfig.general.openPageFocusElement = 'root'
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.17.3')) {
    localConfig.calendar.width = 50
    localConfig.calendar.isBorderEnabled = false
    localConfig.calendar.restDayFontColor = ['rgba(44, 62, 80, 1)', 'rgba(53, 54, 58, 1)']
    localConfig.calendar.restItemBackgroundColor = ['rgba(213, 255, 203, 0.8)', 'rgba(169, 180, 156, 1)']
    localConfig.calendar.restLabelFontColor = ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)']
    localConfig.calendar.restLabelBackgroundColor = ['rgba(32, 146, 0, 1)', 'rgba(32, 146, 0, 1)']
    localConfig.calendar.workDayFontColor = ['rgba(44, 62, 80, 1)', 'rgba(53, 54, 58, 1)']
    localConfig.calendar.workItemBackgroundColor = ['rgba(255, 221, 221, 1)', 'rgba(218, 181, 181, 1)']
    localConfig.calendar.workLabelFontColor = ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)']
    localConfig.calendar.workLabelBackgroundColor = ['rgba(250, 82, 82, 1)', 'rgba(250, 82, 82, 1)']
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.17.12')) {
    localConfig.bookmark.keycapBookmarkFontSize = 11
    localConfig.calendar.dayFontFamily = 'Arial'
    localConfig.calendar.dayFontSize = 14
    localConfig.calendar.dayFontColor = ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)']
    localConfig.calendar.descFontFamily = 'Arial'
    localConfig.calendar.descFontSize = 10
    localConfig.calendar.descFontColor = ['rgba(44, 62, 80, 1)', 'rgba(255, 255, 255, 1)']
    localConfig.calendar.todayDayFontColor = ['rgba(44, 62, 80, 1)', 'rgba(53, 54, 58, 1)']
    localConfig.calendar.todayDescFontColor = ['rgba(44, 62, 80, 1)', 'rgba(53, 54, 58, 1)']
    localConfig.calendar.todayLabelFontColor = ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)']
    localConfig.calendar.todayLabelBackgroundColor = ['rgba(22, 144, 231, 1)', 'rgba(22, 144, 231, 1)']
    localConfig.calendar.todayItemBackgroundColor = ['rgba(159, 214, 255, 1)', 'rgba(106, 173, 224, 1)']
    localConfig.calendar.restDayFontColor = ['rgba(44, 62, 80, 1)', 'rgba(53, 54, 58, 1)']
    localConfig.calendar.restDescFontColor = ['rgba(44, 62, 80, 1)', 'rgba(53, 54, 58, 1)']
    localConfig.calendar.workDayFontColor = ['rgba(44, 62, 80, 1)', 'rgba(53, 54, 58, 1)']
    localConfig.calendar.workDescFontColor = ['rgba(44, 62, 80, 1)', 'rgba(53, 54, 58, 1)']
    delete (localConfig.calendar as any).backgroundActiveColor
    localConfig.news.urlActiveColor = ['rgba(36, 64, 179, 1)', 'rgba(155, 177, 254, 1)']
    localConfig.news.tabActiveBackgroundColor = ['rgba(239, 239, 245, 1)', 'rgba(73, 73, 77, 1)']
    delete (localConfig.news as any).fontActiveColor
    delete (localConfig.news as any).backgroundActiveColor
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.18.0')) {
    localConfig.bookmark.isCapKeyVisible = true
    localConfig.bookmark.isFaviconVisible = true
    localConfig.bookmark.faviconSize = 1
    localConfig.bookmark.keycapBorderRadius = (localConfig.bookmark as any).borderRadius
    localConfig.bookmark.isKeycapBorderEnabled = (localConfig.bookmark as any).isBorderEnabled
    localConfig.bookmark.keycapBorderWidth = (localConfig.bookmark as any).borderWidth
    localConfig.bookmark.keycapBorderColor = (localConfig.bookmark as any).borderColor
    delete (localConfig.bookmark as any).borderRadius
    delete (localConfig.bookmark as any).isBorderEnabled
    delete (localConfig.bookmark as any).borderWidth
    delete (localConfig.bookmark as any).borderColor
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.18.1')) {
    localConfig.bookmark.keyboardType = typeof localConfig.bookmark.keyboardType === 'number' ? `key${localConfig.bookmark.keyboardType}` : localConfig.bookmark.keyboardType
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.18.2')) {
    localConfig.bookmark.splitSpace = 'space1'
  }
  // 更新local版本号
  localConfig.general.version = pkg.version
  // updateSuccess()
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
 * 当unit为vmin时会自动将 ratio * 0.1
 */
export const getStyleField = (component: ConfigField, field: string, unit?: string, ratio?: number) => {
  return computed(() => {
    let style = field.split('.').reduce((r: any, c: string) => r[c], localConfig[component])
    if (Array.isArray(style)) {
      return style[localState.value.currAppearanceCode]
    }
    if (ratio) {
      style *= ratio
    }
    if (unit) {
      if (unit === 'vmin') {
        style *= 0.1
      }
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

watch(
  () => localConfig.general.pageTitle,
  () => {
    document.title = localConfig.general.pageTitle
  },
  { immediate: true },
)

watch(
  [() => localConfig.general.backgroundColor, () => localConfig.general.fontColor, () => localState.value.currAppearanceCode],
  () => {
    document.body.style.setProperty('--bg-main', getStyleField('general', 'backgroundColor').value)
    document.body.style.setProperty('--text-color-main', getStyleField('general', 'fontColor').value)
  },
  {
    immediate: true,
    deep: true, // color is array
  },
)
