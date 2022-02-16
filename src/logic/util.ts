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
