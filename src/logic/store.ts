import type { GlobalThemeOverrides } from 'naive-ui'
import { enUS, zhCN, darkTheme, useOsTheme, NButton } from 'naive-ui'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { isEdge, isFirefox } from '@/env'
import { styleConst } from '@/styles/const'
import { URL_CHROME_STORE, URL_EDGE_STORE, URL_FIREFOX_STORE, URL_CHROME_EXTENSIONS_SHORTCUTS, URL_EDGE_EXTENSIONS_SHORTCUTS, URL_FIREFOX_EXTENSIONS_SHORTCUTS, APPEARANCE_TO_CODE_MAP, DAYJS_LANG_MAP, FONT_LIST } from '@/logic/constants/index'
import { defaultConfig, defaultLocalState, defaultFocusVisibleWidgetMap } from '@/logic/config'
import type { WidgetConfigByCode } from '@/newtab/widgets/registry'
import { log, createTab, compareLeftVersionLessThanRightVersions } from '@/logic/util'
import { WIDGET_CODE_LIST } from '@/newtab/widgets/codes'

type LocalConfigRefs = {
  general: ReturnType<typeof useStorageLocal<typeof defaultConfig['general']>>
} & {
  [K in keyof WidgetConfigByCode]: ReturnType<typeof useStorageLocal<WidgetConfigByCode[K]>>
}

const useWidgetStorageLocal = <K extends keyof WidgetConfigByCode>(key: K) => {
  return useStorageLocal(`c-${key}`, defaultConfig[key])
}

const createLocalConfig = (): LocalConfigRefs => {
  const res: any = {}
  res.general = useStorageLocal('c-general', defaultConfig.general)
  const widgetNames = WIDGET_CODE_LIST as (keyof WidgetConfigByCode)[]
  for (const key of widgetNames) {
    res[key] = useWidgetStorageLocal(key)
  }
  return res as LocalConfigRefs
}

export const localConfig: typeof defaultConfig = reactive(createLocalConfig())

export const localState = useStorageLocal('l-state', defaultLocalState)

export const globalState = reactive({
  isSettingDrawerVisible: false,
  isGuideMode: false,
  isFullScreen: !!document.fullscreenElement,
  availableFontList: [] as string[],
  allCommandsMap: {} as Record<string, string | undefined>,
  isUploadSettingLoading: false,
  isImportSettingLoading: false,
  isClearStorageLoading: false,
  isChangelogModalVisible: false,
  isSearchFocused: false,
  isMemoFocused: false,
  currSettingTabCode: 'general',
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

export const openConfigShortcutsPage = () => {
  let shortcutUrl = URL_CHROME_EXTENSIONS_SHORTCUTS
  if (isEdge) {
    shortcutUrl = URL_EDGE_EXTENSIONS_SHORTCUTS
  } else if (isFirefox) {
    shortcutUrl = URL_FIREFOX_EXTENSIONS_SHORTCUTS
  }
  createTab(shortcutUrl)
}

export const openExtensionsStorePage = () => {
  let storeUrl = URL_CHROME_STORE
  if (isEdge) {
    storeUrl = URL_EDGE_STORE
  } else if (isFirefox) {
    storeUrl = URL_FIREFOX_STORE
  }
  createTab(storeUrl)
}

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
        title: option.label,
        style: {
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
        },
      },
      [
        h('span', {
          style: {
            maxWidth: '110px',
            'overflow': 'hidden',
            'whiteSpace': 'nowrap',
            'textOverflow': 'ellipsis',
          },
        }, option.label),
        h(
          'span',
          {
            style: {
              fontFamily: option.label,
            },
          },
          'abc-ABC-123',
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

export const currDayjsLang = computed(() => DAYJS_LANG_MAP[localConfig.general.timeLang] || 'en')

export const openChangelogModal = () => {
  globalState.isChangelogModalVisible = true
}

export const handleStateResetAndUpdate = () => {
  if (Object.keys(defaultLocalState.isUploadConfigStatusMap).length !== Object.keys(localState.value.isUploadConfigStatusMap).length) {
    localState.value.isUploadConfigStatusMap = defaultLocalState.isUploadConfigStatusMap
    log('isUploadConfigStatusMap update')
  }
}

const updateSuccess = () => {
  window.$notification.success({
    duration: 5000,
    title: `${window.$t('common.update')}${window.$t('common.success')}`,
    content: `${window.$t('common.version')} ${window.appVersion}`,
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
          default: () => window.$t('about.changelog'),
        },
      ),
  })
}

export const getIsWidgetRender = (widgetName: WidgetCodes) => computed(() => localConfig[widgetName].enabled)

export const getLayoutStyle = (name: ConfigField) => {
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
    const fieldList = field.split('.')
    let targetValue: any = fieldList.reduce((r, c) => r[c], localConfig[component])

    if (Array.isArray(targetValue)) {
      // color
      return targetValue[localState.value.currAppearanceCode]
    }

    if (typeof targetValue !== 'number') {
      return targetValue
    }

    if (ratio) {
      targetValue *= ratio
    }
    if (unit) {
      if (unit === 'vmin') {
        targetValue *= 0.1
      }
      targetValue = `${targetValue}${unit}`
    }
    return targetValue
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

/**
 * 针对Edge 设置为黑白色favicon，避免展示为纯色方块
 */
export const setEdgeFavicon = () => {
  if (!isEdge) {
    return
  }
  const link = document.createElement('link')
  link.setAttribute('rel', 'icon')
  link.setAttribute('href', '/assets/favicon-edge.svg')
  document.getElementsByTagName('head')[0].appendChild(link)
}

export const getLocalVersion = () => {
  let version = localConfig.general.version
  const settingGeneral = localStorage.getItem('c-general')
  if (settingGeneral) {
    version = JSON.parse(settingGeneral).version
  }
  return version || '0'
}

const mergeState = (state: unknown, acceptState: unknown) => {
  if (acceptState === undefined || acceptState === null) {
    return state
  }
  // 二者类型不同时，直接返回state，为处理新增state的情况
  if (Object.prototype.toString.call(state) !== Object.prototype.toString.call(acceptState)) {
    return state
  }
  if (typeof acceptState === 'string' || typeof acceptState === 'number' || typeof acceptState === 'boolean') {
    return acceptState
  }
  // 只处理纯Object类型，其余如Array等对象类型均直接返回acceptState
  if (Object.prototype.toString.call(acceptState) !== '[object Object]') {
    return acceptState
  }
  // 二者均为Object，且state为空Object时，返回acceptState
  if (Object.keys(state as object).length === 0) {
    return acceptState
  }
  // 特殊处理 keyboard.keymap 数据，直接返回acceptState
  if (
    Object.prototype.hasOwnProperty.call(state, 'KeyQ')
    || Object.prototype.hasOwnProperty.call(state, 'KeyA')
    || Object.prototype.hasOwnProperty.call(state, 'KeyZ')
    || Object.prototype.hasOwnProperty.call(state, 'Digit1')
  ) {
    return acceptState
  }
  const filterState = {} as { [propName: string]: unknown }
  const fieldList = Object.keys(acceptState)
  for (const field of fieldList) {
    // 递归合并，只合并state内存在的字段
    if (Object.prototype.hasOwnProperty.call(state, field)) {
      filterState[field] = mergeState((state as object)[field], acceptState[field])
    }
  }
  return { ...(state as object), ...filterState }
}

/**
 * 处理新增配置，并删除无用旧配置。默认acceptState不传递时为刷新配置数据结构
 * 以 defaultConfig 为模板与 acceptState 进行去重合并
 */
export const updateSetting = (acceptRawState = localConfig): Promise<boolean> => {
  const acceptState = acceptRawState
  return new Promise((resolve) => {
    try {
      // 只处理存在于acceptState中的配置字段，减少不必要的处理
      const configFields = Object.keys(defaultConfig).filter((field) =>
        Object.prototype.hasOwnProperty.call(acceptState, field),
      ) as ConfigField[]

      for (const configField of configFields) {
        // 获取需要更新的子字段
        const subFields = Object.keys(defaultConfig[configField])

        // 批量处理子字段，减少循环内的操作
        for (const subField of subFields) {
          if (acceptState[configField][subField] !== undefined) {
            localConfig[configField][subField] = mergeState(
              defaultConfig[configField][subField],
              acceptState[configField][subField],
            )
            // console.log(`${configField}-${subField}`, localConfig[configField][subField], '=', defaultConfig[configField][subField], '<-', acceptState[configField][subField])
          }
        }
      }

      log('UpdateSetting', localConfig)
      resolve(true)
    } catch (e) {
      log('updateSetting error', e)
      resolve(false)
    }
  })
}

export const handleAppUpdate = async () => {
  const version = getLocalVersion()
  log('Version', version)
  if (!compareLeftVersionLessThanRightVersions(version, window.appVersion)) {
    return
  }
  log('Get new version', window.appVersion)
  // @@@@ 每次更新localConfig后均需要手动处理新版本变更的本地数据结构
  if (compareLeftVersionLessThanRightVersions(version, '1.19.4')) {
    if (['key43', 'key57'].includes(localConfig.keyboard.keyboardType)) {
      localConfig.keyboard.keyboardType = 'key61'
    }
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.20.0')) {
    const keymapLength = Object.keys(localConfig.keyboard.keymap).length
    localConfig.keyboard.source = keymapLength === 0 ? 1 : 2
    localConfig.keyboard.defaultExpandFolder = null
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.21.0')) {
    localConfig.search.isNewTabOpen = false
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.23.1')) {
    localConfig.clockDigital.width = localConfig.clockDigital.fontSize / 2 + 8
    const clockDigitalConfig = localConfig.clockDigital as typeof localConfig.clockDigital & {
      letterSpacing?: number
    }
    delete clockDigitalConfig.letterSpacing
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.24.0')) {
    localConfig.general.timeLang = localConfig.general.lang
    localConfig.yearProgress = defaultConfig.yearProgress
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.24.3')) {
    localConfig.general.backgroundColor = structuredClone(defaultConfig.general.backgroundColor)
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.25.9')) {
    localConfig.calendar.festivalCountdown = true
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.27.0')) {
    localConfig.general.isFocusMode = false
    localConfig.general.focusVisibleWidgetMap = defaultFocusVisibleWidgetMap
    if ((localConfig.general.openPageFocusElement as any) === 'bookmarkKeyboard') {
      localConfig.general.openPageFocusElement = 'keyboard'
    }
    const oldBookmark = useStorageLocal('c-bookmark', defaultConfig.keyboard)
    for (const key of Object.keys(defaultConfig.keyboard)) {
      if (oldBookmark.value[key]) {
        localConfig.keyboard[key] = oldBookmark.value[key]
      }
    }
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.27.0')) {
    localConfig.keyboard.shellBackgroundBlur = defaultConfig.keyboard.shellBackgroundBlur
    localConfig.keyboard.plateBackgroundBlur = defaultConfig.keyboard.plateBackgroundBlur
    localConfig.keyboard.keycapBackgroundBlur = defaultConfig.keyboard.keycapBackgroundBlur
    localConfig.bookmarkFolder.backgroundBlur = defaultConfig.bookmarkFolder.backgroundBlur
    localConfig.calendar.backgroundBlur = defaultConfig.calendar.backgroundBlur
    localConfig.memo.backgroundBlur = defaultConfig.memo.backgroundBlur
    localConfig.news.backgroundBlur = defaultConfig.news.backgroundBlur
    localConfig.search.backgroundBlur = defaultConfig.search.backgroundBlur
    localConfig.yearProgress.backgroundBlur = defaultConfig.yearProgress.backgroundBlur
  }
  // 更新local版本号
  localConfig.general.version = window.appVersion
  // updateSuccess()
  // 刷新配置设置
  await updateSetting()
}
