export interface KeycapTheme {
  label: string
  shellColor: string
  mainFontColor: string
  mainBackgroundColor: string
  emphasisOneFontColor: string
  emphasisOneBackgroundColor: string
  emphasisTwoFontColor: string
  emphasisTwoBackgroundColor: string
}

export interface KeycapThemeGroup {
  key: string
  /** i18n 路径，如 'keyboardCommon.themeGroup.classic' */
  labelKey: string
  themes: Record<string, KeycapTheme>
}
