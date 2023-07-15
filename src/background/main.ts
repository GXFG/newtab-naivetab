// !!background Cannot use import statement outside a module
// import browser from 'webextension-polyfill'
import { log, createTab, padUrlHttps } from '@/logic/util'
import { gaProxy } from '@/logic/gtag'

const ALL_COMMAND_KEYCODE = [
  'Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9', 'Digit0',
  'KeyQ', 'KeyW', 'KeyE', 'KeyR', 'KeyT', 'KeyY', 'KeyU', 'KeyI', 'KeyO', 'KeyP',
  'KeyA', 'KeyS', 'KeyD', 'KeyF', 'KeyG', 'KeyH', 'KeyJ', 'KeyK', 'KeyL',
  'KeyZ', 'KeyX', 'KeyC', 'KeyV', 'KeyB', 'KeyN', 'KeyM', 'Comma', 'Period',
]

let bookmarkConfig = null as any

const getBookmarkConfigData = async () => new Promise((resolve) => {
  chrome.storage.sync.get(null, (data) => {
    const config = data['naive-tab-bookmark']
    bookmarkConfig = JSON.parse(config).data
    resolve(true)
  })
})

let dblclickTimer: NodeJS.Timeout

let laskCommand = ''

const handleKeyboard = async (command: string) => {
  await getBookmarkConfigData()
  if (!bookmarkConfig.isListenBackgroundKeystrokes) {
    return
  }
  const keycode = command
  if (!ALL_COMMAND_KEYCODE.includes(keycode)) {
    return
  }
  let url: string = bookmarkConfig.keymap[keycode] ? bookmarkConfig.keymap[keycode].url : ''
  if (url.length === 0) {
    return
  }
  url = padUrlHttps(url)
  if (!bookmarkConfig.isDblclickOpen) {
    createTab(url)
    return
  }
  clearTimeout(dblclickTimer)
  if (laskCommand === keycode) {
    createTab(url)
  } else {
    laskCommand = keycode
    dblclickTimer = setTimeout(() => {
      laskCommand = ''
    }, bookmarkConfig.dblclickIntervalTime)
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
