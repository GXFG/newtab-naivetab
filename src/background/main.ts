// ! background Cannot use import statement outside a module
// import browser from 'webextension-polyfill'
import { WIDGET_CONFIG } from '~/newtab/widgets/keyboard/config'
import { log, createTab, padUrlHttps } from '@/logic/util'
import { gaProxy } from '@/logic/gtag'
import { ALL_COMMAND_KEYCODE } from './config'

let keyboardConfig = WIDGET_CONFIG

const getKeyboardConfigData = async () =>
  new Promise((resolve) => {
    chrome.storage.sync.get(null, (data) => {
      const config = data['naive-tab-keyboard']
      if (!config || config.length === 0) {
        resolve(true)
        return
      }
      keyboardConfig = JSON.parse(config).data
      resolve(true)
    })
  })

let dblclickTimer: ReturnType<typeof setTimeout>

let lastCommand = ''

const handleKeyboard = async (command: string) => {
  const keycode = command
  if (!ALL_COMMAND_KEYCODE.includes(keycode)) {
    return
  }
  await getKeyboardConfigData()
  if (!keyboardConfig.isListenBackgroundKeystrokes) {
    return
  }

  let url: string = keyboardConfig.keymap[keycode] ? keyboardConfig.keymap[keycode].url : ''
  if (url.length === 0) {
    return
  }
  url = padUrlHttps(url)
  if (!keyboardConfig.isDblclickOpen) {
    createTab(url)
    return
  }
  clearTimeout(dblclickTimer)
  if (lastCommand === keycode) {
    createTab(url)
  } else {
    lastCommand = keycode
    dblclickTimer = setTimeout(() => {
      lastCommand = ''
    }, keyboardConfig.dblclickIntervalTime)
  }
}

chrome.runtime.onInstalled.addListener(() => {
  log('NaiveTab installed')
})

chrome.commands.onCommand.addListener((command) => {
  log(`onCommand: ${command}`)
  handleKeyboard(command)
  gaProxy('press', ['service', 'command'], {
    command,
  })
})

addEventListener('unhandledrejection', async (event) => {
  gaProxy('error', ['unhandledrejection'], {
    event: JSON.stringify(event),
  })
})

// chrome.runtime.onMessage.addListener((message) => {
//   log('onMessage', message)
//   const { name } = message
//   if (name === 'keyboard') {}
// })
