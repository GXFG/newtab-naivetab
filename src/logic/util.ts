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
  // =
  return false
}

export const downloadImageByUrl = async(url: string, filename = `${Date.now()}`) => {
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

/**
 * 埋点
 * @param category 类型
 * @param action 操作
 * @param opt_label 标签
 * @param opt_value 数值
 * @param opt_noninteraction 为true时，表示将不会在跳出率计算中使用事件命中
 */
export const gaEvent = (category: string, action: string, opt_label: string, opt_value?: number, opt_noninteraction?: boolean) => {
  // if (import.meta.env.DEV) {
  //   return
  // }
  // const param: any = ['event', category, action, opt_label]
  const param: any = ['_trackEvent', category, action, opt_label]

  if (opt_value !== undefined) {
    param.push(opt_value)
  }
  if (opt_noninteraction !== undefined) {
    param.push(opt_noninteraction)
  }
  // log('ga', param)
  // window.dataLayer.push(param)
  // window._gaq.push(param)
}
