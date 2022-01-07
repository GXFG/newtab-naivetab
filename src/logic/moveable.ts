import { useToggle } from '@vueuse/core'
import { changeElementEnabledStatus } from '@/logic'

export const [isDragMode, toggleIsDragMode] = useToggle(false)
export const [isElementDrawerVisible, toggleIsElementDrawerVisible] = useToggle(true)

export const moveState = reactive({
  MouseDownTaskMap: new Map() as any,
  MouseMoveTaskMap: new Map() as any,
  MouseUpTaskMap: new Map() as any,
  isComponentDraging: false,
  isDeleteHover: false,
  isXAxisCenterVisible: false,
  isYAxisCenterVisible: false,
  isTopVisible: false,
  isBottomVisible: false,
  isLeftVisible: false,
  isRightVisible: false,
  dragTempEnabledMap: {
    settingIcon: false,
    bookmark: false,
    clockDigital: false,
    clockAnalog: false,
    date: false,
    calendar: false,
    search: false,
    weather: false,
  },
  isDragingMap: {
    settingIcon: false,
    bookmark: false,
    clockDigital: false,
    clockAnalog: false,
    date: false,
    calendar: false,
    search: false,
    weather: false,
  },
  currDragTarget: {
    type: -1,
    name: '',
  },
})

let lastIsElementDrawerVisible: null | boolean = null

const onResetState = () => {
  moveState.currDragTarget.type = -1
  moveState.currDragTarget.name = ''
  lastIsElementDrawerVisible = null
}

export const handleToggleIsElementDrawerVisible = () => {
  toggleIsElementDrawerVisible()
  lastIsElementDrawerVisible = null
}

/**
 * data-target-type: -1:'' |  1:componentName | 2:elementName
 */
export const getTargetDataFromEvent = (e: MouseEvent): {
  type: -1 | 1 | 2
  name: '' | TComponents
} => {
  let target: any = e.target
  try {
    while (!target.getAttribute('data-target-type')) {
      target = target.parentNode
    }
  } catch (e) { }
  if (!target.getAttribute) {
    return {
      type: -1,
      name: '',
    }
  }
  const type = (+target.getAttribute('data-target-type') as 1 | 2) || -1
  const name: TComponents = target.getAttribute('data-target-name') || ''
  return { type, name }
}

const getMouseTaskKeyList = () => {
  if (moveState.currDragTarget.type === 2) {
    return 'element'
  }
  return moveState.currDragTarget.name
}

const handleMousedown = (e: MouseEvent) => {
  if (!isDragMode.value) {
    return
  }
  const targetData = getTargetDataFromEvent(e)
  moveState.currDragTarget.type = targetData.type
  moveState.currDragTarget.name = targetData.name
  if (moveState.currDragTarget.type === -1) {
    return
  }
  const mouseTask = getMouseTaskKeyList()
  moveState.MouseDownTaskMap.get(mouseTask)(e)
}

const handleMousemove = (e: MouseEvent) => {
  if (!isDragMode.value || e.buttons === 0 || moveState.currDragTarget.type === -1) {
    return
  }
  for (const task of moveState.MouseMoveTaskMap.values()) {
    task(e)
  }
  // 移动时隐藏物料抽屉
  if (lastIsElementDrawerVisible === null) {
    lastIsElementDrawerVisible = isElementDrawerVisible.value
    if (lastIsElementDrawerVisible) {
      toggleIsElementDrawerVisible(false)
    }
  }
}

const handleMouseup = (e: MouseEvent) => {
  if (!isDragMode.value || moveState.currDragTarget.type === -1) {
    return
  }
  const mouseTask = getMouseTaskKeyList()
  moveState.MouseUpTaskMap.get(mouseTask)(e)
  if (lastIsElementDrawerVisible) {
    toggleIsElementDrawerVisible(true)
    lastIsElementDrawerVisible = null
  }
}

// const handleDragEnter = (e: any) => {
//   // console.log('handleDragEnter')
// }

// 当被拖动对象在另一对象容器范围内拖动时触发此事件（每隔 350 毫秒会触发一次）
// const handleDragOver = (e: any) => {
//   e.preventDefault()
//   // console.log('handleDragOver')
// }

// const handleDragLeave = (e: any) => {
//   // console.log('handleDragLeave')
// }

// const handleDrop = (e: any) => {
//   // 阻止默认动作（如打开一些元素的链接）
//   // e.preventDefault()
//   if (currDragElementComponentName.value.length === 0) {
//     return
//   }
//   changeElementEnabledStatus(currDragElementComponentName.value as TComponents, true)
// }

const bodyEle = ref()

const initListener = () => {
  bodyEle.value = document.querySelector('body')
  bodyEle.value.addEventListener('mousedown', handleMousedown)
  bodyEle.value.addEventListener('mousemove', handleMousemove)
  bodyEle.value.addEventListener('mouseup', handleMouseup)
  bodyEle.value.addEventListener('mouseleave', handleMouseup)
  // bodyEle.value.addEventListener('dragenter', handleDragEnter)
  // bodyEle.value.addEventListener('dragover', handleDragOver)
  // bodyEle.value.addEventListener('dragleave', handleDragLeave)
  // bodyEle.value.addEventListener('drop', handleDrop)
}

const removeListener = () => {
  bodyEle.value = document.querySelector('body')
  bodyEle.value.removeEventListener('mousedown', handleMousedown)
  bodyEle.value.removeEventListener('mousemove', handleMousemove)
  bodyEle.value.removeEventListener('mouseup', handleMouseup)
  bodyEle.value.removeEventListener('mouseleave', handleMouseup)
  // bodyEle.value.addEventListener('dragenter', handleDragEnter)
  // bodyEle.value.addEventListener('dragover', handleDragOver)
  // bodyEle.value.addEventListener('dragleave', handleDragLeave)
  // bodyEle.value.addEventListener('drop', handleDrop)
}

watch(isDragMode, (value) => {
  if (!value) {
    removeListener()
    onResetState()
    return
  }
  nextTick(() => {
    initListener()
  })
}, { immediate: true })
