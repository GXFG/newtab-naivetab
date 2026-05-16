/**
 * @module image/utils
 * @description 图片工具函数 — URL 生成、下载、格式转换、压缩、Base64 编码。
 *   纯函数模块，无副作用，不依赖配置或状态。
 * @dependencies image/constants.ts（来源常量）
 * @consumers image/service.ts、image/gallery.ts
 * @see docs/architecture/background.md
 */
import type { ImageNetworkSource } from './constants'
import { IMAGE_NETWORK_SOURCE } from './constants'

const BING_QUALITY_MAP = {
  low: '1366x768',
  medium: '1920x1080',
  high: 'UHD',
}

const PEXELS_QUALITY_MAP = {
  low: '&h=192&w=341',
  medium: '&h=1080&w=1920',
  high: '',
}

export const getImageUrlFromName = (
  networkSourceType: ImageNetworkSource,
  name: string,
  quality = 'low' as TImage.quality,
) => {
  if (networkSourceType === IMAGE_NETWORK_SOURCE.BING) {
    return `https://cn.bing.com/th?id=OHR.${name}_${BING_QUALITY_MAP[quality]}.jpg`
  }
  if (networkSourceType === IMAGE_NETWORK_SOURCE.PEXELS) {
    return `https://images.pexels.com/photos/${name}/pexels-photo-${name}.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop${PEXELS_QUALITY_MAP[quality]}`
  }
  return ''
}

export const downloadImageByUrl = async (
  url: string,
  filename = `${Date.now()}`,
) => {
  const image = await fetch(url)
  const imageBlog = await image.blob()
  if (!filename.includes('.')) {
    const extMap: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
      'image/gif': 'gif',
    }
    const ext = extMap[imageBlog.type] || 'jpg'
    filename = `${filename}.${ext}`
  }
  const imageURL = window.URL.createObjectURL(imageBlog)
  const link = document.createElement('a')
  link.href = imageURL
  link.download = filename
  link.click()
  URL.revokeObjectURL(imageURL)
}

export const urlToFile = (url: string, fileName: string): Promise<File> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', url)
    xhr.setRequestHeader('Accept', 'image/jpeg')
    xhr.responseType = 'blob'
    xhr.timeout = 30000
    xhr.ontimeout = () => {
      reject(new Error('Image download timeout'))
    }
    xhr.onload = () => {
      const fileContent = xhr.response
      const targetFile = new File([fileContent], fileName, {
        type: 'image/jpeg',
      })
      resolve(targetFile)
    }
    xhr.onerror = () => {
      reject(new Error(`Image download failed: ${url} (status: ${xhr.status})`))
    }
    xhr.send()
  })
}

export const urlToImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const imageEle = new Image()
    // crossOrigin = 'anonymous' 要求服务器返回 Access-Control-Allow-Origin 头。
    // Bing/Pexels 图片服务器支持 CORS；自定义 URL 若来自不支持 CORS 的图床，
    // 此处的 crossOrigin 不影响 <img> 标签正常加载图片，但后续 Canvas drawImage
    // 会抛出 SecurityError（Tainted canvas）。
    // 当前项目中 compressedImageUrlToBase64 仅用于网络图片（Bing/Pexels），
    // 自定义 URL 的压缩路径在 service.ts/downloadAndApplyCustomUrl 中同样使用 fetch 而非 urlToImage，
    // 不会触发此问题。
    imageEle.crossOrigin = 'anonymous'
    imageEle.onload = () => {
      resolve(imageEle)
    }
    imageEle.onerror = () => {
      reject(new Error(`Image load failed: ${url}`))
    }
    imageEle.src = url
  })
}

export const compressedImageToBlob = async (
  image: HTMLImageElement,
  quality = 0.5,
  width = 1366,
  type = 'image/jpeg',
): Promise<Blob> => {
  if (!image.complete || image.naturalWidth === 0) {
    throw new Error('Image not loaded or corrupted')
  }

  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
    const widthHeightRatio = image.naturalWidth / image.naturalHeight
    canvas.width = width
    canvas.height = Math.ceil(width / widthHeightRatio)
    try {
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    } catch (error) {
      throw new Error(`Canvas drawing failed: ${error}`, { cause: error })
    }
    return await new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error(`create Blob failed: ${type}`))
            return
          }
          resolve(blob)
        },
        type,
        quality,
      )
    })
  } catch (error) {
    throw new Error(`Image compression failed: ${error}`, { cause: error })
  }
}

export const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.readAsDataURL(blob)
    reader.onload = (e: ProgressEvent<FileReader>) => {
      resolve((e.target?.result || '') as string)
    }
  })
}

export const compressedImageUrlToBase64 = async (
  imageUrl: string,
): Promise<string> => {
  const imageEle = await urlToImage(imageUrl)
  const smallBlob = await compressedImageToBlob(imageEle)
  const smallBase64 = await blobToBase64(smallBlob)
  return smallBase64
}
