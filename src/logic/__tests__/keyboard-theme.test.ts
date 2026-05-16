import { describe, it, expect } from 'vitest'
import type { KeycapTheme } from '@/logic/keyboard/themes/interface'
import {
  KEYCAP_CLASSIC_MAP,
  KEYCAP_ATMOSPHERE_MAP,
  KEYCAP_STUDIO_MAP,
  KEYCAP_PREMIUM_MAP,
  KEYCAP_PREINSTALL_GROUPS,
} from '@/logic/keyboard/themes'

const THEME_REQUIRED_KEYS: (keyof KeycapTheme)[] = [
  'label',
  'shellColor',
  'mainFontColor',
  'mainBackgroundColor',
  'emphasisOneFontColor',
  'emphasisOneBackgroundColor',
  'emphasisTwoFontColor',
  'emphasisTwoBackgroundColor',
]

/**
 * 校验主题数据结构是否完整（防止新增主题时漏字段）
 */
const validateTheme = (theme: KeycapTheme) => {
  for (const key of THEME_REQUIRED_KEYS) {
    expect(theme[key]).toBeDefined()
    expect(typeof theme[key]).toBe('string')
    expect(theme[key]).not.toBe('')
  }
}

const themeMaps = [
  { name: 'classic', map: KEYCAP_CLASSIC_MAP },
  { name: 'atmosphere', map: KEYCAP_ATMOSPHERE_MAP },
  { name: 'studio', map: KEYCAP_STUDIO_MAP },
  { name: 'premium', map: KEYCAP_PREMIUM_MAP },
]

describe.each(themeMaps)('$name 主题数据校验', ({ map }) => {
  it('所有主题包含必填字段且非空字符串', () => {
    for (const [themeKey, theme] of Object.entries(map)) {
      expect(() => validateTheme(theme)).not.toThrow()
    }
  })

  it('至少包含一个主题', () => {
    expect(Object.keys(map).length).toBeGreaterThan(0)
  })
})

describe('键盘主题分组', () => {
  it('分组数量正确（4 个系列）', () => {
    expect(KEYCAP_PREINSTALL_GROUPS).toHaveLength(4)
  })

  it('每个分组包含必需字段', () => {
    for (const group of KEYCAP_PREINSTALL_GROUPS) {
      expect(group.key).toBeDefined()
      expect(group.labelKey).toBeDefined()
      expect(group.themes).toBeDefined()
      expect(Object.keys(group.themes).length).toBeGreaterThan(0)
    }
  })

  it('分组内的主题与对应 map 一致', () => {
    const expectedMaps = [
      KEYCAP_CLASSIC_MAP,
      KEYCAP_ATMOSPHERE_MAP,
      KEYCAP_STUDIO_MAP,
      KEYCAP_PREMIUM_MAP,
    ]
    for (let i = 0; i < expectedMaps.length; i++) {
      expect(KEYCAP_PREINSTALL_GROUPS[i].themes).toBe(expectedMaps[i])
    }
  })
})
