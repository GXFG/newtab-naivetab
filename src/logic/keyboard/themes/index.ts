import { KEYCAP_CLASSIC_MAP } from './classic'
import { KEYCAP_ATMOSPHERE_MAP } from './atmosphere'
import { KEYCAP_STUDIO_MAP } from './studio'
import { KEYCAP_PREMIUM_MAP } from './premium'

export type { KeycapTheme, KeycapThemeGroup } from './interface'
export { KEYCAP_CLASSIC_MAP } from './classic'
export { KEYCAP_ATMOSPHERE_MAP } from './atmosphere'
export { KEYCAP_STUDIO_MAP } from './studio'
export { KEYCAP_PREMIUM_MAP } from './premium'

const KEYCAP_PREINSTALL_MAP = {
  ...KEYCAP_CLASSIC_MAP,
  ...KEYCAP_ATMOSPHERE_MAP,
  ...KEYCAP_STUDIO_MAP,
  ...KEYCAP_PREMIUM_MAP,
} satisfies Record<string, import('./interface').KeycapTheme>

export type KeycapThemeKey = keyof typeof KEYCAP_PREINSTALL_MAP

export const KEYCAP_PREINSTALL_GROUPS: import('./interface').KeycapThemeGroup[] =
  [
    {
      key: 'classic',
      labelKey: 'keyboardCommon.themeGroup.classic',
      themes: KEYCAP_CLASSIC_MAP,
    },
    {
      key: 'atmosphere',
      labelKey: 'keyboardCommon.themeGroup.atmosphere',
      themes: KEYCAP_ATMOSPHERE_MAP,
    },
    {
      key: 'studio',
      labelKey: 'keyboardCommon.themeGroup.studio',
      themes: KEYCAP_STUDIO_MAP,
    },
    {
      key: 'premium',
      labelKey: 'keyboardCommon.themeGroup.premium',
      themes: KEYCAP_PREMIUM_MAP,
    },
  ]

export { KEYCAP_PREINSTALL_MAP }
