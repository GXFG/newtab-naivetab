import { useToggle } from '@vueuse/core'

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
  dragTempEnabledMap: { // 临时开启组件，只有鼠标放下时才进行真正的开启
    settingIcon: false,
    bookmark: false,
    clockDigital: false,
    clockAnalog: false,
    date: false,
    calendar: false,
    search: false,
    weather: false,
  },
  isDragingMap: { // 是否正在拖动中
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
    type: -1 as TTargetType | -1,
    name: '' as TComponents | '',
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
  let taskKey = ''
  if (moveState.currDragTarget.type === 1) {
    taskKey = moveState.currDragTarget.name
  } else if (moveState.currDragTarget.type === 2) {
    taskKey = 'element'
  }
  return taskKey
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
  // 鼠标移动时隐藏Element抽屉
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

const mouseTaskMap = {
  mousedown: handleMousedown,
  mousemove: handleMousemove,
  mouseup: handleMouseup,
  mouseleave: handleMouseup,
}

const onHandleListener = (isInit: boolean) => {
  const bodyEle = document.querySelector('body') as HTMLElement
  const listenerFunc = isInit ? bodyEle.addEventListener : bodyEle.removeEventListener
  for (const eventName of Object.keys(mouseTaskMap)) {
    listenerFunc(eventName, mouseTaskMap[eventName])
  }
}

watch(isDragMode, (value) => {
  if (!value) {
    onHandleListener(false)
    onResetState()
    return
  }
  toggleIsElementDrawerVisible(true) // 开启画布模式时默认打开Element抽屉
  nextTick(() => {
    onHandleListener(true)
  })
}, { immediate: true })
