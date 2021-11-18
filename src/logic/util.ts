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

export const exportStringToFile = (result: any, filename: string) => {
  const text = JSON.stringify(result, null, 4)
  const url = `data:application/json;base64,${window.btoa(text)}`
  chrome.downloads.download({
    url,
    filename,
  })
}
