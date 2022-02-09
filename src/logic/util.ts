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
  const content = JSON.stringify(result, null, 2)
  const blob = new Blob([content], { type: 'text/json' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.click()
}

/**
 * 以state为模板与acceptState进行递归去重合并
 */
export const mergeState = (state: any, acceptState: any) => {
  if (acceptState === undefined || acceptState === null) {
    return state
  }
  // 二者类型不同时，直接返回state，为处理新增state的情况
  if (Object.prototype.toString.call(state) !== Object.prototype.toString.call(acceptState)) {
    return state
  }
  if (typeof acceptState === 'string' || typeof acceptState === 'number' || typeof acceptState === 'boolean') {
    return acceptState
  }
  // 只处理Object类型，其余如Array等对象类型均直接返回state，
  if (Object.prototype.toString.call(acceptState) !== '[object Object]') {
    return state
  }
  // 二者均为Object、且state为空Object时，返回acceptState，如setting中的keymap数据
  if (Object.keys(state).length === 0) {
    return acceptState
  }
  const filterState = {} as any
  const fieldList = Object.keys(acceptState)
  for (const field of fieldList) {
    // 递归合并，只合并state内存在的字段
    if (Object.prototype.hasOwnProperty.call(state, field)) {
      filterState[field] = mergeState(state[field], acceptState[field])
    }
  }
  return { ...state, ...filterState }
}
