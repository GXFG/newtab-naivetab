export const WIDGET_CODE = 'search'

export const SCALABLE_FIELDS = {
  width: { min: 150, max: 800 },
  height: { min: 20, max: 100 },
  padding: { min: 5, max: 60 },
  borderRadius: { min: 0, max: 100 },
  fontSize: { min: 8, max: 40 },
  dropdownFontSize: { min: 8, max: 30 },
  dropdownBorderRadius: { min: 0, max: 30 },
}

export const WIDGET_CONFIG = {
  enabled: true,
  isNewTabOpen: false,
  suggestionEnabled: true,
  iconEnabled: true,
  isSearchEngineIconVisible: false,
  searchEngineIconUrl: '',
  placeholder: '',
  urlName: 'Bing',
  urlValue: 'https://cn.bing.com/search?q={query}',
  layout: {
    xOffsetKey: 'left',
    xOffsetValue: 50,
    xTranslateValue: -50,
    yOffsetKey: 'bottom',
    yOffsetValue: 30,
    yTranslateValue: 0,
  },
  padding: 25,
  width: 450,
  height: 45,
  borderRadius: 50,
  fontFamily: 'system',
  fontSize: 18,
  fontColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
  isBorderEnabled: false,
  borderWidth: 1,
  borderColor: ['rgba(101, 101, 101, 0.28)', 'rgba(71,85,105, 1)'],
  backgroundColor: ['rgba(152, 152, 152, 0.2)', 'rgba(74, 74, 74, 0.1)'],
  backgroundBlur: 5,
  isShadowEnabled: true,
  shadowColor: ['rgba(31, 31, 31, 0.5)', 'rgba(31, 31, 31, 0.5)'],
  dropdownBorderRadius: 12,
  dropdownBackgroundColor: ['rgba(30, 30, 30, 0.72)', 'rgba(50, 50, 50, 0.72)'],
  dropdownMaxItems: 6,
  dropdownFontFamily: 'system',
  dropdownFontSize: 14,
  dropdownFontColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
}

export type TWidgetConfig = typeof WIDGET_CONFIG
