import 'driver.js/dist/driver.css'
import { driver } from 'driver.js'
import { createTab } from '@/logic/util'
import { URL_NAIVETAB_DOC_STARTED } from '@/logic/constants/index'
import { toggleIsDragMode } from '@/logic/moveable'
import { localConfig, globalState } from '@/logic/store'

const onCloseGuide = () => {
  localConfig.general.isFirstOpen = false
  globalState.isGuideMode = false
  globalState.isSettingDrawerVisible = false
  toggleIsDragMode(false)
}

// https://driverjs.com/docs/configuration
const startGuide = () => {
  const driverConfig = driver({
    showProgress: true,
    allowClose: true,
    allowKeyboardControl: false,
    disableActiveInteraction: true, // 高亮区域不可点击
    prevBtnText: window.$t('guide.prevStep'),
    nextBtnText: window.$t('guide.nextStep'),
    doneBtnText: window.$t('guide.doneStep'),
    steps: [
      {
        element: '#draft-tool .drawer__content',
        popover: {
          title: window.$t('guide.stepTitle1'),
          description: window.$t('guide.stepDescription1'),
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '#digital-clock .clockDigital__container',
        popover: {
          title: window.$t('guide.stepTitle2'),
          description: window.$t('guide.stepDescription2'),
          side: 'top',
          align: 'center',
        },
      },
      {
        element: '#draft-tool .drawer__header .header__done',
        popover: {
          title: window.$t('guide.stepTitle3'),
          description: window.$t('guide.stepDescription3'),
          side: 'left',
          align: 'start',
        },
      },
      {
        element: '#digital-clock .clockDigital__container',
        popover: {
          title: window.$t('guide.stepTitle4'),
          description: window.$t('guide.stepDescription4'),
          side: 'top',
          align: 'center',
        },
      },
      {
        popover: {
          title: window.$t('guide.stepTitle5'),
          description: window.$t('guide.stepDescription5'),
          onNextClick: () => {
            onCloseGuide()
            driverConfig.moveNext()
            driverConfig.destroy()
          },
        },
      },
    ],
    onCloseClick: () => {
      onCloseGuide()
      driverConfig.moveNext()
      driverConfig.destroy()
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
  setTimeout(() => {
    createTab(URL_NAIVETAB_DOC_STARTED)
  }, 300)
}
