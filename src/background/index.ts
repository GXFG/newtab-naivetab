// !!background Cannot use import statement outside a module
// import browser from 'webextension-polyfill'

chrome.runtime.onInstalled.addListener((): void => {
  console.log('NaiveTab installed')
})

const createTab = (url: string) => {
  chrome.tabs.create({ url, active: true })
}

let keyboardData = {
  KEYBOARD_CODE_TO_LABEL_MAP: {} as any,
  keyboardCurrentModelAllKeyList: [] as string[],
  bookmarkConfig: {} as any,
}

const setKeyboardData = (data: {
  KEYBOARD_CODE_TO_LABEL_MAP: any
  keyboardCurrentModelAllKeyList: string[]
  bookmarkConfig: any
}) => {
  keyboardData = data
}

let timer = null as any
let laskCommand = ''

const handleKeyboard = (command: string) => {
  const { KEYBOARD_CODE_TO_LABEL_MAP, bookmarkConfig, keyboardCurrentModelAllKeyList } = keyboardData
  if (!bookmarkConfig.isListenBackgroundKeystrokes) {
    return
  }
  const labelKey = KEYBOARD_CODE_TO_LABEL_MAP[command] || command
  if (!keyboardCurrentModelAllKeyList.includes(labelKey)) {
    return
  }
  let url = bookmarkConfig.keymap[labelKey] ? bookmarkConfig.keymap[labelKey].url : ''
  if (url.length === 0) {
    return
  }
  url = url.includes('//') ? url : `https://${url}`
  if (!bookmarkConfig.isDblclickOpen) {
    createTab(url)
    return
  }
  clearTimeout(timer)
  if (laskCommand === labelKey) {
    createTab(url)
  } else {
    laskCommand = labelKey
    timer = setTimeout(() => {
      laskCommand = ''
    }, bookmarkConfig.dblclickIntervalTime)
  }
}

chrome.runtime.onMessage.addListener((message) => {
  console.log('onMessage', message)
  const { name, data } = message
  if (name === 'keyboard') {
    setKeyboardData(data)
  }
})

chrome.commands.onCommand.addListener((command) => {
  console.log(`onCommand: ${command}`)
  handleKeyboard(command)
})
