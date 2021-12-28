import { useToggle } from '@vueuse/core'

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

let currDragComponentName = ''

const handleBodyMousedown = (e: MouseEvent) => {
  if (!isDragMode.value) {
    return
  }
  let target: any = e.target
  try {
    while (!target.getAttribute('cname')) {
      target = target.parentNode
    }
  } catch (e) {}
  if (!(target.getAttribute && target.getAttribute('cname'))) {
    return
  }
  const componentName: TComponents = target.getAttribute('cname')
  currDragComponentName = componentName
  moveState.MouseDownTaskMap.get(componentName)(e)
}

const handleBodyMouseup = () => {
  if (!isDragMode.value || !currDragComponentName) {
    return
  }
  moveState.MouseUpTaskMap.get(currDragComponentName)()
}

const handleBodyMousemove = (e: MouseEvent) => {
  if (!isDragMode.value || e.button !== 0) {
    return
  }
  for (const task of moveState.MouseMoveTaskMap.values()) {
    task(e)
  }
}

const initBodyListener = () => {
  containerEl.value = document.querySelector('body')
  containerEl.value.addEventListener('mousedown', handleBodyMousedown)
  containerEl.value.addEventListener('mousemove', handleBodyMousemove)
  containerEl.value.addEventListener('mouseup', handleBodyMouseup)
  containerEl.value.addEventListener('mouseleave', handleBodyMouseup)
}
const removeBodyListener = () => {
  containerEl.value = document.querySelector('body')
  containerEl.value.removeEventListener('mousedown', handleBodyMousedown)
  containerEl.value.removeEventListener('mousemove', handleBodyMousemove)
  containerEl.value.removeEventListener('mouseup', handleBodyMouseup)
  containerEl.value.removeEventListener('mouseleave', handleBodyMouseup)
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
