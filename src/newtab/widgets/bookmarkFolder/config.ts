export const WIDGET_CODE = 'bookmarkFolder'

export const WIDGET_CONFIG = {
  enabled: true,
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
  padding: 7,
  width: 300,
  height: 200,
  borderRadius: 10,
  fontFamily: 'Arial',
  fontSize: 10,
  fontColor: ['rgba(255, 255, 255, 1)', 'rgba(255, 255, 255, 1)'],
  isBorderEnabled: false,
  borderWidth: 1,
  borderColor: ['rgba(101, 101, 101, 0.28)', 'rgba(71,85,105, 1)'],
  backgroundColor: ['rgba(152, 152, 152, 0.15)', 'rgba(74, 74, 74, 0.15)'],
  backgroundBlur: 10,
  isShadowEnabled: true,
  shadowColor: ['rgba(31, 31, 31, 0.4)', 'rgba(31, 31, 31, 0.4)'],
}

export type TWidgetConfig = typeof WIDGET_CONFIG
