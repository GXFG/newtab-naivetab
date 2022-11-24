import { useToggle } from '@vueuse/core'

export const [isDragMode, toggleIsDragMode] = useToggle(false)
export const [isElementDrawerVisible, toggleIsElementDrawerVisible] = useToggle(true)

export const moveState = reactive({
  MouseDownTaskMap: new Map() as Map<string, (e: MouseEvent, resite?: boolean) => unknown>,
  MouseMoveTaskMap: new Map() as Map<string, (e: MouseEvent) => unknown>,
  MouseUpTaskMap: new Map() as Map<string, (e: MouseEvent) => unknown>,
  isComponentDraging: false,
  isDeleteHover: false,
  // 辅助线
  isXAxisCenterVisible: false,
  isYAxisCenterVisible: false,
  isTopBoundVisible: false,
  isBottomBoundVisible: false,
  isLeftBoundVisible: false,
  isRightBoundVisible: false,
  // 当前点击组件的属性
  currDragTarget: {
    type: -1 as TargetType | -1, // 1:componentName | 2:elementName
    name: '' as Components | '',
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
  name: '' | Components
} => {
  let target = e.target as HTMLInputElement
  try {
    while (!target.getAttribute('data-target-type')) {
      target = target.parentNode as HTMLInputElement
    }
  } catch (e) {}
  if (!target.getAttribute) {
    return {
      type: -1,
      name: '',
    }
  }
  const type = (Number(target.getAttribute('data-target-type')) as 1 | 2) || -1
  const name = target.getAttribute('data-target-name') as Components || ''
  return { type, name }
}

const currMouseTaskKey = computed(() => {
  let taskKey = ''
  if (moveState.currDragTarget.type === 1) {
    taskKey = moveState.currDragTarget.name
  } else if (moveState.currDragTarget.type === 2) {
    taskKey = 'element-general'
  }
  return taskKey
})

const handleMousedown = (e: MouseEvent) => {
  if (!isDragMode.value || e.button !== 0) {
    return
  }
  const targetData = getTargetDataFromEvent(e)
  moveState.currDragTarget.type = targetData.type
  moveState.currDragTarget.name = targetData.name
  if (moveState.currDragTarget.type === -1) {
    return
  }
  const task = moveState.MouseDownTaskMap.get(currMouseTaskKey.value)
  task && task(e)
}

const handleMousemove = (e: MouseEvent) => {
  if (!isDragMode.value || e.buttons === 0 || moveState.currDragTarget.type === -1) {
    return
  }
  const task = moveState.MouseMoveTaskMap.get(currMouseTaskKey.value)
  task && task(e)
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
  const task = moveState.MouseUpTaskMap.get(currMouseTaskKey.value)
  task && task(e)
  // 鼠标抬起时根据上一次状态决定是否打开Element抽屉
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

const handleListener = (isInit: boolean) => {
  const bodyEle = document.querySelector('body') as HTMLElement
  const listenerFunc = isInit ? bodyEle.addEventListener : bodyEle.removeEventListener
  for (const eventName of Object.keys(mouseTaskMap)) {
    listenerFunc(eventName, mouseTaskMap[eventName])
  }
}

watch(isDragMode, (value) => {
  if (!value) {
    handleListener(false)
    onResetState()
    return
  }
  // 开启画布模式时默认打开Element抽屉
  toggleIsElementDrawerVisible(true)
  nextTick(() => {
    handleListener(true)
  })
}, { immediate: true })
