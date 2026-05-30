/**
 * @module store/theme
 * @description 主题与语言 — Naive UI locale、外观模式切换（auto/light/dark）、themeOverrides 派生。
 *   watch localConfig.general.appearance → 更新 localState.currAppearanceCode。
 * @dependencies common/i18n.ts（setLocale）、config/state.ts、style.ts（customPrimaryColor）
 * @consumers newtab/App.vue、setting/SettingDrawer.vue
 * @see docs/architecture/config.md#主题与颜色系统
 */
import type { GlobalThemeOverrides } from 'naive-ui'
import { enUS, zhCN, darkTheme, useOsTheme } from 'naive-ui'
import { APPEARANCE_TO_CODE_MAP, DAYJS_LANG_MAP } from '@/logic/constants/app'
import { setLocale } from '@/common/i18n'
import { localConfig, localState } from '@/logic/config/state'
import { customPrimaryColor } from './style'

const NATIVE_UI_LOCALE_MAP: Record<string, typeof zhCN> = {
  'zh-CN': zhCN,
  'en-US': enUS,
}

export const nativeUILang = ref(
  NATIVE_UI_LOCALE_MAP[localConfig.general.lang] || enUS,
)

watch(
  () => localConfig.general.lang,
  (lang) => {
    nativeUILang.value = NATIVE_UI_LOCALE_MAP[lang] || enUS
    setLocale(lang)
  },
)

export const currTheme = ref()

const osTheme = useOsTheme()

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

export const themeOverrides = shallowRef<GlobalThemeOverrides>({
  common: {
    primaryColor: customPrimaryColor.value,
    primaryColorSuppl: customPrimaryColor.value,
    primaryColorHover: '',
    primaryColorPressed: '',
  },
})

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

export const currDayjsLang = computed(
  () =>
    DAYJS_LANG_MAP[
      localConfig.general.timeLang as keyof typeof DAYJS_LANG_MAP
    ] || 'en',
)
