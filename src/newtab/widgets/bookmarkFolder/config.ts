export const WIDGET_CODE = 'bookmarkFolder'

export const SCALABLE_FIELDS = {
  width: { min: 150, max: 600 },
  height: { min: 100, max: 400 },
  padding: { min: 10, max: 200 },
  borderRadius: { min: 0, max: 30 },
  itemHeight: { min: 24, max: 120 },
  itemBorderRadius: { min: 0, max: 30 },
  iconSize: { min: 8, max: 40 },
}

export const WIDGET_CONFIG = {
  enabled: false,
  isNewTabOpen: true,
  gridColumns: 5,
  itemGap: 5,
  isIconVisible: true,
  isNameVisible: true,
  itemHeight: 50,
  itemBorderRadius: 10,
  iconSize: 15,
  selectedFolderTitles: [] as string[],
  layout: {
    xOffsetKey: 'left',
    xOffsetValue: 2,
    xTranslateValue: 0,
    yOffsetKey: 'top',
    yOffsetValue: 50,
    yTranslateValue: -50,
  },
  padding: 78,
  width: 300,
  height: 175,
  borderRadius: 10,
  fontFamily: 'system',
  fontSize: 10,
  fontColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
  isBorderEnabled: false,
  borderWidth: 1,
  borderColor: ['rgba(101, 101, 101, 0.28)', 'rgba(71,85,105, 1)'],
  backgroundColor: ['rgba(152, 152, 152, 0.15)', 'rgba(74, 74, 74, 0.15)'],
  backgroundBlur: 10,
  isShadowEnabled: true,
  shadowColor: ['rgba(20, 20, 30, 0.45)', 'rgba(20, 20, 30, 0.45)'],
}

export type TWidgetConfig = typeof WIDGET_CONFIG
