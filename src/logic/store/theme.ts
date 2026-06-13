/**
 * @module store/theme
 * @description 主题与语言 — 外观模式切换（auto/light/dark）、语言监听。
 *   深色模式通过 data-theme 属性（dom.ts 中设置）控制。
 *   watch localConfig.general.appearance → 更新 localState.currAppearanceCode。
 * @dependencies common/i18n.ts（setLocale）、config/state.ts
 * @consumers newtab/App.vue
 * @see docs/architecture/config.md#主题与颜色系统
 */
import { APPEARANCE_TO_CODE_MAP, DAYJS_LANG_MAP } from '@/logic/constants/app'
import { setLocale } from '@/common/i18n'
import { localConfig, localState } from '@/logic/config/state'

/** OS 主题检测（原生 matchMedia） */
const osDarkQuery = window.matchMedia('(prefers-color-scheme: dark)')
const osTheme = ref<'light' | 'dark'>(osDarkQuery.matches ? 'dark' : 'light')

osDarkQuery.addEventListener('change', (e) => {
  osTheme.value = e.matches ? 'dark' : 'light'
})

watch(
  [osTheme, () => localConfig.general.appearance],
  () => {
    if (localConfig.general.appearance === 'auto') {
      localState.value.currAppearanceCode = APPEARANCE_TO_CODE_MAP[
        osTheme.value as keyof typeof APPEARANCE_TO_CODE_MAP
      ] as 0 | 1
      localState.value.currAppearanceLabel = osTheme.value || 'light'
      return
    }
    localState.value.currAppearanceCode = APPEARANCE_TO_CODE_MAP[
      localConfig.general.appearance
    ] as 0 | 1
    localState.value.currAppearanceLabel = localConfig.general.appearance as
      | 'light'
      | 'dark'
  },
  {
    immediate: true,
  },
)

watch(
  () => localConfig.general.lang,
  (lang) => {
    setLocale(lang)
  },
)

export const currDayjsLang = computed(
  () =>
    DAYJS_LANG_MAP[
      localConfig.general.timeLang as keyof typeof DAYJS_LANG_MAP
    ] || 'en',
)
