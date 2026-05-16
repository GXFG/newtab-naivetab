/**
 * 通用工具函数 — log / sleep / createTab / padUrlHttps。
 */
const logStyles = [
  'padding: 4px 8px',
  'color: #fff',
  'border-radius: 3px',
  'background:',
].join(';')

export const log = (msg: string, ...args: unknown[]) => {
  const style = `${logStyles}${msg.includes('error') ? '#ff4757' : '#1475B2'}`
  console.log(`%c${msg}`, style, ...args)
}

export const sleep = (time: number) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(null)
    }, time)
  })
}

export const createTab = (url: string, active = true) => {
  if (url.length === 0) {
    return
  }
  chrome.tabs.create({ url, active })
}

export const padUrlHttps = (url: string) =>
  url.includes('//') ? url : `https://${url}`
