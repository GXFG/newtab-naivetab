const logStyles = [
  'padding: 4px 8px',
  'color: #fff',
  'border-radius: 3px',
  'background:',
].join(';')

export const log = (msg: string, ...args: any[]) => {
  const style = `${logStyles}${msg.includes('error') ? '#ff4757' : '#1475B2'}`
  console.log(`%c${msg}`, style, ...args)
}

export const sleep = (time: number) => {
  return new Promise((resolve) => {
    setTimeout(() => { resolve(null) }, time)
  })
}

/**
 * leftVersion < rightVersion ?
 */
export const compareLeftVersionLessThanRightVersions = (leftVersion: string, rightVersion: string): boolean => {
  const leftVersionList = leftVersion.split('.')
  const rightVersionList = rightVersion.split('.')
  const maxLen = Math.max(leftVersionList.length, rightVersionList.length)
  while (leftVersionList.length < maxLen) {
    leftVersionList.push('0')
  }
  while (rightVersionList.length < maxLen) {
    rightVersionList.push('0')
  }
  for (let i = 0; i < maxLen; i++) {
    const leftItem = parseInt(leftVersionList[i])
    const rightItem = parseInt(rightVersionList[i])
    if (leftItem > rightItem) {
      return false
    } else if (leftItem < rightItem) {
      return true
    }
  }
  // equal
  return false
}

export const downloadImageByUrl = async (url: string, filename = `${Date.now()}`) => {
  const image = await fetch(url)
  const imageBlog = await image.blob()
  const imageURL = window.URL.createObjectURL(imageBlog)
  const link = document.createElement('a')
  link.href = imageURL
  link.download = filename
  link.click()
}

export const downloadJsonByTagA = (result: any, filename = 'file') => {
  const content = JSON.stringify(result, null, 2)
  const blob = new Blob([content], { type: 'text/json' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.click()
}

export const createTab = (url: string, active = true) => {
  if (url.length === 0) {
    return
  }
  chrome.tabs.create({ url, active })
}

export const padUrlHttps = (url: string) => url.includes('//') ? url : `https://${url}`
