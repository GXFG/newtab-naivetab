// !!background Cannot use import statement outside a module
// import browser from 'webextension-polyfill'
import { KEYBOARD_KEY_LIST, KEYBOARD_CODE_TO_LABEL_MAP, KEYBOARD_SPLIT_RANGE_MAP } from '@/logic/const'
import { log, createTab, padUrlHttps } from '@/logic/util'

// src/logic/bookmark.ts
const getKeyboardList = (keyboardSplitList: any[], originList: any[]) => {
  const rowList: any[] = []
  for (const range of keyboardSplitList) {
    if (range.length === 1) {
      rowList.push(originList.slice(range[0]))
    } else {
      if (Array.isArray(range[0])) {
        // 处理特殊按键的拼接，如：数字行 + BS [[0, 10], [12, 13]]
        let tempList: any = []
        for (const rangeItem of range) {
          tempList = [...tempList, ...originList.slice(rangeItem[0], rangeItem[1])]
        }
        rowList.push(tempList)
      } else {
        rowList.push(originList.slice(range[0], range[1]))
      }
    }
  }
  return rowList
}

let bookmarkConfig = null as any
let currentModelAllKeyList = [] as string[]

const getKeyboardSplitList = () => {
  let splitList: any = KEYBOARD_SPLIT_RANGE_MAP.letter
  if (bookmarkConfig.isSymbolEnabled && bookmarkConfig.isNumberEnabled) {
    splitList = KEYBOARD_SPLIT_RANGE_MAP.letterSymbolNumber
  } else if (bookmarkConfig.isSymbolEnabled) {
    splitList = KEYBOARD_SPLIT_RANGE_MAP.letterSymbol
  } else if (bookmarkConfig.isNumberEnabled) {
    splitList = KEYBOARD_SPLIT_RANGE_MAP.letterNumber
  }
  return splitList
}

const getKeyboardData = async () => new Promise((resolve) => {
  chrome.storage.sync.get(null, (data) => {
    const config = data['naive-tab-bookmark']
    bookmarkConfig = JSON.parse(config).data
    const keyboardList = getKeyboardList(getKeyboardSplitList(), KEYBOARD_KEY_LIST)
    currentModelAllKeyList = keyboardList.flat(Infinity)
    resolve(true)
  })
})

let timer = null as any
let laskCommand = ''

const handleKeyboard = async (command: string) => {
  await getKeyboardData()
  if (!bookmarkConfig.isListenBackgroundKeystrokes) {
    return
  }
  const labelKey = KEYBOARD_CODE_TO_LABEL_MAP[command] || command
  if (!currentModelAllKeyList.includes(labelKey)) {
    return
  }
  let url: string = bookmarkConfig.keymap[labelKey] ? bookmarkConfig.keymap[labelKey].url : ''
  if (url.length === 0) {
    return
  }
  url = padUrlHttps(url)
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

chrome.runtime.onInstalled.addListener(() => {
  log('NaiveTab installed')
})

// chrome.runtime.onMessage.addListener((message) => {
//   log('onMessage', message)
//   const { name } = message
//   if (name === 'keyboard') {}
// })

chrome.commands.onCommand.addListener((command) => {
  log(`onCommand: ${command}`)
  handleKeyboard(command)
})
