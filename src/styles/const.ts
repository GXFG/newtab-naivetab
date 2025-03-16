/**
 * styleKey: ['lightColor', 'darkColor']
 * 其中darkColor未定义时默认取lightColor的值
 */
export const styleConst = ref({
  // moveable
  auxiliaryLineMain: ['#40a9ff', ''],
  auxiliaryLineBound: ['#ff7875', ''],
  auxiliaryLineElement: ['#69c0ff', ''],
  bgMoveableComponentMain: ['rgba(100,181,246, 0.5)', ''],
  bgMoveableComponentActive: ['rgba(100,181,246, 0.7)', ''],
  bgMoveableComponentDelete: ['rgba(250,82,82, 1)', ''],
  moveableToolDeleteBtnColor: ['#ffa39e', ''],
  borderMoveableToolItem: ['#95a5a6', ''],
  bgMoveableToolDrawer: ['rgba(32, 32, 32, 0.7)', ''],
  // popup
  popupKeyboardBorder: ['rgb(224, 224, 230)', 'rgba(73, 73, 77, 1)'],
  popupKeyboardHoverBg: ['rgba(209, 213, 219, 1)', 'rgba(73, 73, 77, 1)'],
  popupKeyboardActiveBg: ['rgba(209, 213, 219, 0.85)', 'rgba(73, 73, 77, 0.8)'],
})
