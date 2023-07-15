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

export const padUrlHttps = (url: string) => url.includes('//') ? url : `https://${url}`

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

export const downloadJsonByTagA = (result: { [propName: string]: unknown }, filename = 'file') => {
  const content = JSON.stringify(result, null, 2)
  const blob = new Blob([content], { type: 'text/json' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.click()
}

export const urlToFile = (url: string, fileName: string): Promise<File> => {
  return new Promise((resolve, reject) => {
    let fileContent: any = null
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.setRequestHeader('Accept', 'image/jpeg')
    xhr.responseType = 'blob'
    xhr.onload = () => {
      fileContent = xhr.response
      const targetFile = new File([fileContent], fileName, { type: 'image/jpeg' })
      resolve(targetFile)
    }
    xhr.onerror = (e) => {
      reject(e)
    }
    xhr.send()
  })
}

export const urlToImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const imageEle = new Image()
    imageEle.onload = () => {
      resolve(imageEle)
    }
    imageEle.onerror = () => {
      reject(imageEle)
    }
    imageEle.src = url
  })
}

export const compressedImageToBlob = (image: HTMLImageElement, quality = 0.5, width = 1366, type = 'image/jpeg'): Promise<Blob> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    const widthHightRatio = +(image.naturalWidth / image.naturalHeight).toFixed(2)
    canvas.width = width
    canvas.height = Math.ceil(width / widthHightRatio)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      resolve(blob as Blob)
    }, type, quality)
  })
}

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(blob)
    reader.onload = function (e: any) {
      resolve(e.target.result)
    }
  })
}

export const compressedImageUrlToBase64 = async (imageUrl: string): Promise<string> => {
  const imageEle = await urlToImage(imageUrl)
  const smallBlob = await compressedImageToBlob(imageEle)
  const smallBase64 = await blobToBase64(smallBlob)
  return smallBase64
}
