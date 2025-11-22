export const WIDGET_CODE = 'weather'

export const WIDGET_CONFIG = {
  enabled: false,
  apiKey: '72db57326f9f494ab04d1d431bc127e9',
  city: {
    id: '101010300',
    name: '中国-北京市-北京-朝阳',
  },
  temperatureUnit: 'c',
  speedUnit: 'kph',
  iconEnabled: true,
  forecastEnabled: false,
  layout: {
    xOffsetKey: 'left',
    xOffsetValue: 50,
    xTranslateValue: -50,
    yOffsetKey: 'bottom',
    yOffsetValue: 5,
    yTranslateValue: 0,
  },
  fontFamily: 'Arial Rounded MT Bold',
  fontSize: 14,
  fontColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
  iconSize: 50,
}

export type TWidgetConfig = typeof WIDGET_CONFIG
