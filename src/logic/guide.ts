/**
 * 用户引导系统 — 首次打开引导 + 手动触发引导，基于 driver.js 实现。
 */
import 'driver.js/dist/driver.css'
import { driver } from 'driver.js'
import { toggleIsDragMode } from '@/logic/moveable'
import { localConfig } from '@/logic/config/state'
import { globalState } from '@/logic/store/state'

const onCloseGuide = () => {
  localConfig.general.isFirstOpen = false
  globalState.isGuideMode = false
  globalState.isSettingDrawerVisible = false
  toggleIsDragMode(false)
}

const destroyGuide = (driverInstance: ReturnType<typeof driver>) => {
  onCloseGuide()
  driverInstance.destroy()
}

// https://driverjs.com/docs/configuration
const startGuide = () => {
  const driverConfig = driver({
    showProgress: true,
    allowClose: true,
    allowKeyboardControl: false,
    disableActiveInteraction: true, // 高亮区域不可点击
    overlayClickBehavior: () => {}, // 遮罩层不可点击
    prevBtnText: window.$t('guide.prevStep'),
    nextBtnText: window.$t('guide.nextStep'),
    doneBtnText: window.$t('guide.doneStep'),
    steps: [
      {
        element: '#draft-tool .draft__content',
        popover: {
          title: window.$t('guide.stepTitle1'),
          description: window.$t('guide.stepDescription1'),
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '#draft-tool .drawer__header .header__done',
        popover: {
          title: window.$t('guide.stepTitle2'),
          description: window.$t('guide.stepDescription2'),
        },
      },
      {
        popover: {
          title: window.$t('guide.stepTitle3'),
          description: window.$t('guide.stepDescription3'),
        },
      },
      {
        popover: {
          title: window.$t('guide.stepTitle4'),
          description: window.$t('guide.stepDescription4'),
          onNextClick: () => {
            destroyGuide(driverConfig)
          },
        },
      },
    ],
    onCloseClick: () => {
      destroyGuide(driverConfig)
    },
  })

  driverConfig.drive()
}

export const openUserGuide = async () => {
  globalState.isSettingDrawerVisible = false
  globalState.isGuideMode = true
  // 打开编辑布局 & 用户引导
  toggleIsDragMode(true)
  // 等待抽屉动画执行完成开始引导
  setTimeout(() => {
    startGuide()
  }, 350)
}

export const handleFirstOpen = () => {
  if (!localConfig.general.isFirstOpen) {
    return
  }
  openUserGuide()
}
