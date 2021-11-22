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

export const downloadByTagA = (result: any, filename = 'file') => {
  const content = JSON.stringify(result, null, 4)
  const blob = new Blob([content], { type: 'text/json' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.click()
}
