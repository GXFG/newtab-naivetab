/* eslint-disable @typescript-eslint/no-unused-vars */
import { useToggle } from '@vueuse/core'
import { changeElementEnabledStatus } from '@/logic'

export const [isDragMode, toggleIsDragMode] = useToggle(false)

export const moveState = reactive({
  isXAxisCenterVisible: false,
  isYAxisCenterVisible: false,
  isTopVisible: false,
  isBottomVisible: false,
  isLeftVisible: false,
  isRightVisible: false,
  MouseDownTaskMap: new Map() as any,
  MouseMoveTaskMap: new Map() as any,
  MouseUpTaskMap: new Map() as any,
})

const containerEl = ref()

export const currDragComponentName = ref('')
export const currDragMaterielComponentName = ref('')

export const getComponentNameFromEvent = (e: MouseEvent): string => {
  let target: any = e.target
  try {
    while (!target.getAttribute('data-cname')) {
      target = target.parentNode
    }
  } catch (e) { }
  if (!(target.getAttribute && target.getAttribute('data-cname'))) {
    return ''
  }
  const componentName: TComponents = target.getAttribute('data-cname')
  return componentName
}

const handleMousedown = (e: MouseEvent) => {
  if (!isDragMode.value) {
    return
  }
  const componentName = getComponentNameFromEvent(e)
  if (componentName.length === 0) {
    return
  }
  currDragComponentName.value = componentName
  moveState.MouseDownTaskMap.get(componentName)(e)
}

const handleMouseup = () => {
  if (!isDragMode.value || !currDragComponentName.value) {
    return
  }
  moveState.MouseUpTaskMap.get(currDragComponentName.value)()
}

const handleMousemove = (e: MouseEvent) => {
  if (!isDragMode.value || e.button !== 0) {
    return
  }
  for (const task of moveState.MouseMoveTaskMap.values()) {
    task(e)
  }
}

const handleDragEnter = (e: any) => {
  console.log('handleDragEnter')
}

// 当被拖动对象在另一对象容器范围内拖动时触发此事件（每隔 350 毫秒会触发一次）
const handleDragOver = (e: any) => {
  e.preventDefault()
  console.log('handleDragOver')
}

const handleDragLeave = (e: any) => {
  console.log('handleDragLeave')
}

const handleDrop = (e: any) => {
  console.log('handleDrop')
  // 阻止默认动作（如打开一些元素的链接）
  // e.preventDefault()
  if (currDragMaterielComponentName.value.length === 0) {
    return
  }
  changeElementEnabledStatus(currDragMaterielComponentName.value as TComponents, true)
}

const initBodyListener = () => {
  containerEl.value = document.querySelector('body')
  containerEl.value.addEventListener('mousedown', handleMousedown)
  containerEl.value.addEventListener('mousemove', handleMousemove)
  containerEl.value.addEventListener('mouseup', handleMouseup)
  containerEl.value.addEventListener('mouseleave', handleMouseup)
  containerEl.value.addEventListener('dragenter', handleDragEnter)
  containerEl.value.addEventListener('dragover', handleDragOver)
  containerEl.value.addEventListener('dragleave', handleDragLeave)
  containerEl.value.addEventListener('drop', handleDrop)
}

const removeBodyListener = () => {
  containerEl.value = document.querySelector('body')
  containerEl.value.removeEventListener('mousedown', handleMousedown)
  containerEl.value.removeEventListener('mousemove', handleMousemove)
  containerEl.value.removeEventListener('mouseup', handleMouseup)
  containerEl.value.removeEventListener('mouseleave', handleMouseup)
  containerEl.value.addEventListener('dragenter', handleDragEnter)
  containerEl.value.addEventListener('dragover', handleDragOver)
  containerEl.value.addEventListener('dragleave', handleDragLeave)
  containerEl.value.addEventListener('drop', handleDrop)
}

watch(isDragMode, (value) => {
  if (!value) {
    removeBodyListener()
    return
  }
  nextTick(() => {
    initBodyListener()
  })
}, { immediate: true })
