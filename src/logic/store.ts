import type { GlobalThemeOverrides } from 'naive-ui'
import { enUS, zhCN, darkTheme, useOsTheme } from 'naive-ui'
import { useStorageLocal } from '@/composables/useStorageLocal'
import { isEdge, isFirefox } from '@/env'
import {
  URL_CHROME_STORE,
  URL_EDGE_STORE,
  URL_FIREFOX_STORE,
} from '@/logic/constants/urls'
import { APPEARANCE_TO_CODE_MAP, DAYJS_LANG_MAP } from '@/logic/constants/app'
import { FONT_LIST } from '@/logic/constants/fonts'
import { defaultConfig, defaultLocalState } from '@/logic/config/defaults'
import type { WidgetConfigByCode } from '@/newtab/widgets/registry'
import { createTab } from '@/logic/util'
import { WIDGET_CODE_LIST } from '@/newtab/widgets/codes'
import { SETTING_KEYBOARD_BASE_SIZE } from '@/setting/registry'

type LocalConfigRefs = {
  general: ReturnType<typeof useStorageLocal<(typeof defaultConfig)['general']>>
  keyboardCommon: ReturnType<
    typeof useStorageLocal<(typeof defaultConfig)['keyboardCommon']>
  >
  keyboardCommand: ReturnType<
    typeof useStorageLocal<(typeof defaultConfig)['keyboardCommand']>
  >
} & {
  [K in keyof WidgetConfigByCode]: ReturnType<
    typeof useStorageLocal<WidgetConfigByCode[K]>
  >
}

const useWidgetStorageLocal = <K extends keyof WidgetConfigByCode>(key: K) => {
  return useStorageLocal(`c-${key}`, defaultConfig[key])
}

const createLocalConfig = (): LocalConfigRefs => {
  const res: any = {}
  res.general = useStorageLocal('c-general', defaultConfig.general)
  res.keyboardCommon = useStorageLocal(
    'c-keyboardCommon',
    defaultConfig.keyboardCommon,
  )
  res.keyboardCommand = useStorageLocal(
    'c-keyboardCommand',
    defaultConfig.keyboardCommand,
  )
  const widgetNames = WIDGET_CODE_LIST
  for (const key of widgetNames) {
    res[key] = useWidgetStorageLocal(key)
  }
  return res as LocalConfigRefs
}

export const localConfig: typeof defaultConfig = reactive(createLocalConfig())

export const localState = useStorageLocal('l-state', defaultLocalState)

export const globalState = reactive({
  settingMode: 'drawer' as 'drawer' | 'options',
  isSettingDrawerVisible: false,
  isGuideMode: false,
  isFullScreen: !!document.fullscreenElement,
  availableFontList: [] as string[],
  isUploadSettingLoading: false,
  isImportSettingLoading: false,
  isClearStorageLoading: false,
  isChangelogModalVisible: false,
  isSearchFocused: false,
  isInputFocused: false,
  currSettingTabCode: 'general',
  currSettingAnchor: '',
  isBackgroundDrawerAutoOpen: false,
})

/**
 * 设置面板中键盘组件的基准尺寸：options 页面更宽，放大 40%
 */
export const getSettingKeyboardSize = (): number => {
  return globalState.settingMode === 'options'
    ? Math.round(SETTING_KEYBOARD_BASE_SIZE * 1.4)
    : SETTING_KEYBOARD_BASE_SIZE
}

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

export const nativeUILang = ref(
  NATIVE_UI_LOCALE_MAP[localConfig.general.lang] || enUS,
)

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
      localState.value.currAppearanceCode = APPEARANCE_TO_CODE_MAP[
        osTheme.value as keyof typeof APPEARANCE_TO_CODE_MAP
      ] as 0 | 1
      localState.value.currAppearanceLabel = osTheme.value || 'light'
      currTheme.value = osTheme.value === 'dark' ? darkTheme : null
      return
    }
    localState.value.currAppearanceCode = APPEARANCE_TO_CODE_MAP[
      localConfig.general.appearance
    ] as 0 | 1
    localState.value.currAppearanceLabel = localConfig.general.appearance as
      | 'light'
      | 'dark'
    currTheme.value =
      localConfig.general.appearance === 'dark' ? darkTheme : null
  },
  {
    immediate: true,
  },
)

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
    // system 是特殊标识符，不是真实字体，直接加入
    if (font === 'system') {
      availableList.add(font)
      continue
    }
    // https://developer.mozilla.org/zh-CN/docs/Web/API/FontFaceSet/check
    if (document.fonts.check(`12px "${font}"`)) {
      availableList.add(font)
    }
  }
  globalState.availableFontList = [...availableList.values()]
}

export const availableFontOptions = computed(() => {
  const otherFonts = globalState.availableFontList.filter(
    (font) => font !== 'system',
  )
  return [
    { label: 'System Default', value: 'system' },
    ...otherFonts.map((font: string) => ({
      label: font,
      value: font,
    })),
  ]
})

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
        h(
          'span',
          {
            style: {
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
            },
          },
          option.label,
        ),
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
}

export const openChangelogModal = () => {
  globalState.isChangelogModalVisible = true
}

export const currDayjsLang = computed(
  () => DAYJS_LANG_MAP[localConfig.general.timeLang] || 'en',
)

export const getIsWidgetRender = (widgetCode: WidgetCodes) =>
  computed(() => localConfig[widgetCode].enabled)

/**
 * e.g. getStyleField('date', 'unit.fontSize', 'px', 1.2)
 * 当unit为vmin时会自动将 ratio * 0.1
 */
export const getStyleField = (
  configCode: ConfigField,
  field: string,
  unit?: string,
  ratio?: number,
) => {
  return computed(() => {
    const fieldList = field.split('.')
    let targetValue: any = fieldList.reduce(
      (r, c) => r[c],
      localConfig[configCode],
    )

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
        // 配置值以 px 量级存储（如 fontSize: 14 ≈ 14px），×0.1 转为 vmin
        // 依赖约定：1vmin ≈ 10px（基准视口宽度 1000px 下）
        targetValue *= 0.1
      }
      targetValue = `${targetValue}${unit}`
    }
    return targetValue
  })
}

/**
 * 生成 color-mix 半透明颜色表达式。
 * colorMixWithAlpha('rgba(255,0,0,1)', 0.12) → 'color-mix(in srgb, rgba(255,0,0,1) 12%, transparent)'
 */
export const colorMixWithAlpha = (color: string, alpha: number): string =>
  `color-mix(in srgb, ${color} ${Math.round(alpha * 100)}%, transparent)`

export const customPrimaryColor = getStyleField('general', 'primaryColor')

export const themeOverrides = shallowRef<GlobalThemeOverrides>({
  common: {
    primaryColor: customPrimaryColor.value,
    primaryColorSuppl: customPrimaryColor.value,
    primaryColorHover: '',
    primaryColorPressed: '',
  },
})

/**
 * 基于 primaryColor 派生 hover / pressed 颜色，跟随主题切换实时更新。
 * 必须替换整个对象引用，NConfigProvider 只对 theme-overrides 做浅层监听。
 */
watch(
  customPrimaryColor,
  (color) => {
    themeOverrides.value = {
      common: {
        primaryColor: color,
        primaryColorSuppl: color,
        primaryColorHover: `color-mix(in srgb, ${color}, white 20%)`,
        primaryColorPressed: `color-mix(in srgb, ${color}, black 20%)`,
      },
    }
  },
  { immediate: true },
)

watch(
  () => localConfig.general.pageTitle,
  () => {
    document.title = localConfig.general.pageTitle
  },
  { immediate: true },
)

watch(
  [
    () => localConfig.general.backgroundColor,
    () => localConfig.general.fontColor,
    () => localState.value.currAppearanceCode,
  ],
  () => {
    document.body.style.setProperty(
      '--nt-bg-main',
      getStyleField('general', 'backgroundColor').value,
    )
    document.body.style.setProperty(
      '--nt-text-color-main',
      getStyleField('general', 'fontColor').value,
    )
  },
  {
    immediate: true,
    deep: true, // color is array
  },
)
