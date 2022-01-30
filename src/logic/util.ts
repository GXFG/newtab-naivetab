const logStyles = [
  'padding: 3px 8px',
  'background: #1475B2',
  'color: #fff',
  'border-radius: 3px',
].join(';')

export const log = (msg: string, ...args: any[]) => {
  console.log(`%c${msg}`, logStyles, ...args)
}

export const sleep = (time: number) => {
  return new Promise((resolve) => {
    setTimeout(() => { resolve(null) }, time)
  })
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
  const content = JSON.stringify(result, null, 4)
  const blob = new Blob([content], { type: 'text/json' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.click()
}

/**
 * 只合并当前配置内存在的字段
 */
export const mergeState = (currState: {}, acceptState: {}) => {
  if (acceptState === undefined || acceptState === null) {
    return currState
  }
  if (typeof acceptState === 'string' || typeof acceptState === 'number' || typeof acceptState === 'boolean') {
    return acceptState
  }
  // 只处理对象类型，其余均返回currState，如Array
  if (Object.prototype.toString.call(acceptState) !== '[object Object]') {
    return currState
  }
  const filterState = {} as any
  const fieldList = Object.keys(acceptState)
  for (const field of fieldList) {
    if (Object.prototype.hasOwnProperty.call(currState, field)) {
      filterState[field] = acceptState[field]
    }
  }
  return { ...currState, ...filterState }
}
