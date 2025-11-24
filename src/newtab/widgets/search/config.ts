export const WIDGET_CODE = 'search'

export const WIDGET_CONFIG = {
  enabled: true,
  isNewTabOpen: false,
  iconEnabled: true,
  suggestionEnabled: true,
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
  width: 400,
  height: 45,
  borderRadius: 5.5,
  fontFamily: 'Arial',
  fontSize: 18,
  fontColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
  isBorderEnabled: false,
  borderWidth: 1,
  borderColor: ['rgba(101, 101, 101, 0.28)', 'rgba(71,85,105, 1)'],
  backgroundColor: ['rgba(152, 152, 152, 0.2)', 'rgba(74, 74, 74, 0.1)'],
  backgroundBlur: 5,
  isShadowEnabled: true,
  shadowColor: ['rgba(31, 31, 31, 0.5)', 'rgba(31, 31, 31, 0.5)'],
}

export type TWidgetConfig = typeof WIDGET_CONFIG
