import { useToggle } from '@vueuse/core'

export const [isDragMode, toggleIsDragMode] = useToggle(true)

export const moveState = reactive({
  isXAxisCenterVisible: false,
  isYAxisCenterVisible: false,
  MouseDownTaskList: {} as any,
  MouseMoveTaskList: [] as any,
  MouseUpTaskList: {} as any,
})

const containerEl = ref()

let currDragComponentName = ''

const handleBodyMousedown = (e: MouseEvent) => {
  let target: any = e.target
  try {
    while (!target.getAttribute('cname')) {
      target = target.parentNode
    }
  } catch (e) {}
  if (!(target.getAttribute && target.getAttribute('cname'))) {
    return
  }
  const componentName = target.getAttribute('cname')
  currDragComponentName = componentName
  moveState.MouseDownTaskList[componentName](e)
}

const handleBodyMouseup = () => {
  if (!currDragComponentName) {
    return
  }
  moveState.MouseUpTaskList[currDragComponentName]()
}

const handleBodyMousemove = (e: MouseEvent) => {
  // 鼠标左键
  if (e.button !== 0) {
    return
  }
  for (const task of moveState.MouseMoveTaskList) {
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

watch(() => isDragMode, (value) => {
  if (!value.value) {
    containerEl.value?.removeEventListener('mousemove', handleBodyMousemove)
    return
  }
  nextTick(() => {
    initBodyListener()
  })
}, { immediate: true })
