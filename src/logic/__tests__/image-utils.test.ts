import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getImageUrlFromName,
  downloadImageByUrl,
  urlToFile,
  urlToImage,
  compressedImageToBlob,
  blobToBase64,
  compressedImageUrlToBase64,
} from '@/logic/image/utils'
import { IMAGE_NETWORK_SOURCE } from '@/logic/image/constants'

/**
 * image/utils.test.ts — 图片工具函数
 *
 * 这个模块此前只有 18% 行覆盖：URL 拼接的质量档位、下载时的扩展名推断、
 * XHR/Image 的成功与失败分支全都没测。它又是背景图系统的地基，
 * service.ts 里所有取图路径都要经过这里。
 *
 * 环境依赖（canvas / XHR / Image / createObjectURL）全部用桩替换，
 * 断言的是「函数在这些环境行为下怎么反应」，不是浏览器真实渲染。
 */

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('getImageUrlFromName', () => {
  it('Bing 各质量档位拼出对应的尺寸后缀', () => {
    expect(getImageUrlFromName(IMAGE_NETWORK_SOURCE.BING, 'Arch', 'low')).toBe(
      'https://cn.bing.com/th?id=OHR.Arch_1366x768.jpg',
    )
    expect(
      getImageUrlFromName(IMAGE_NETWORK_SOURCE.BING, 'Arch', 'medium'),
    ).toBe('https://cn.bing.com/th?id=OHR.Arch_1920x1080.jpg')
    expect(getImageUrlFromName(IMAGE_NETWORK_SOURCE.BING, 'Arch', 'high')).toBe(
      'https://cn.bing.com/th?id=OHR.Arch_UHD.jpg',
    )
  })

  it('Pexels 的 low / medium 追加裁剪参数，high 不追加', () => {
    expect(
      getImageUrlFromName(IMAGE_NETWORK_SOURCE.PEXELS, '19161535', 'low'),
    ).toBe(
      'https://images.pexels.com/photos/19161535/pexels-photo-19161535.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=192&w=341',
    )
    expect(
      getImageUrlFromName(IMAGE_NETWORK_SOURCE.PEXELS, '19161535', 'medium'),
    ).toBe(
      'https://images.pexels.com/photos/19161535/pexels-photo-19161535.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=1080&w=1920',
    )
    expect(
      getImageUrlFromName(IMAGE_NETWORK_SOURCE.PEXELS, '19161535', 'high'),
    ).toBe(
      'https://images.pexels.com/photos/19161535/pexels-photo-19161535.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop',
    )
  })

  it('默认质量为 low', () => {
    expect(getImageUrlFromName(IMAGE_NETWORK_SOURCE.BING, 'Arch')).toBe(
      'https://cn.bing.com/th?id=OHR.Arch_1366x768.jpg',
    )
  })

  it('未知来源返回空串，不抛错', () => {
    // 配置可能来自旧版本导入，networkSourceType 未必在枚举内
    expect(getImageUrlFromName(99 as never, 'Arch', 'low')).toBe('')
  })
})

describe('blobToBase64', () => {
  // happy-dom 的 FileReader 不认 Node 的 Blob（两个 class 不互通，readAsDataURL 会抛
  // "parameter 1 is not of type 'Blob'"），所以这里钉住的是契约而不是真实编码：
  // 用 reader 的 result 解析，拿不到时回退空串（调用方会把它存进配置，不能是 undefined）。
  class FakeFileReader {
    result: string | null = 'data:text/plain;base64,aGVsbG8='
    onload: ((e: { target: FakeFileReader }) => void) | null = null
    readAsDataURL() {
      queueMicrotask(() => this.onload?.({ target: this }))
    }
  }

  it('返回 data URL', async () => {
    vi.stubGlobal('FileReader', FakeFileReader)
    await expect(blobToBase64(new Blob(['hello']))).resolves.toBe(
      'data:text/plain;base64,aGVsbG8=',
    )
  })

  it('reader 没有 result 时回退空串而非 undefined', async () => {
    class EmptyReader extends FakeFileReader {
      result = null
    }
    vi.stubGlobal('FileReader', EmptyReader)
    await expect(blobToBase64(new Blob(['hello']))).resolves.toBe('')
  })
})

describe('downloadImageByUrl', () => {
  const stubBrowser = () => {
    // click 时把 anchor.download 抓出来：扩展名推断的唯一可观测产物就是它，
    // 只断言「click 被调用」的话，把 extMap 删掉测试照样绿。
    let downloadedName = ''
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloadedName = this.download
      })
    const createSpy = vi.fn(() => 'blob:mock-url')
    const revokeSpy = vi.fn()
    Object.defineProperty(URL, 'createObjectURL', {
      value: createSpy,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(URL, 'revokeObjectURL', {
      value: revokeSpy,
      configurable: true,
      writable: true,
    })
    return {
      clickSpy,
      createSpy,
      revokeSpy,
      getDownloadedName: () => downloadedName,
    }
  }

  it.each([
    ['image/jpeg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
    ['image/gif', 'gif'],
    ['image/avif', 'jpg'], // 未登记的类型回退 jpg
  ])('按 %s 推断扩展名为 %s', async (mime, ext) => {
    const { clickSpy, getDownloadedName } = stubBrowser()
    const blob = new Blob(['x'], { type: mime })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ blob: async () => blob })),
    )

    await downloadImageByUrl('https://a.com/pic')

    expect(clickSpy).toHaveBeenCalledTimes(1)
    // 默认文件名是 Date.now()，只能断后缀；文件名没有扩展名时浏览器会存成无后缀文件
    expect(getDownloadedName()).toMatch(new RegExp(`^\\d+\\.${ext}$`))
  })

  it('文件名已带扩展名时不重复追加', async () => {
    const { createSpy, revokeSpy, getDownloadedName } = stubBrowser()
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ blob: async () => new Blob(['x']) })),
    )

    await downloadImageByUrl('https://a.com/pic', 'wallpaper.png')

    expect(getDownloadedName()).toBe('wallpaper.png')
    expect(createSpy).toHaveBeenCalled()
    // 用完必须释放，否则页面一直持有 blob 引用
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url')
  })
})

describe('urlToFile', () => {
  class FakeXHR {
    static last: FakeXHR
    open = vi.fn()
    setRequestHeader = vi.fn()
    send = vi.fn()
    responseType = ''
    timeout = 0
    status = 200
    response: Blob | null = new Blob(['x'], { type: 'image/jpeg' })
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    ontimeout: (() => void) | null = null
    constructor() {
      FakeXHR.last = this
    }
  }

  beforeEach(() => {
    vi.stubGlobal('XMLHttpRequest', FakeXHR)
  })

  it('成功后返回以指定文件名创建的 File', async () => {
    const promise = urlToFile('https://a.com/pic', 'a.jpg')
    FakeXHR.last.onload?.()
    const file = await promise
    expect(file.name).toBe('a.jpg')
    expect(file.type).toBe('image/jpeg')
    expect(FakeXHR.last.open).toHaveBeenCalledWith('GET', 'https://a.com/pic')
  })

  it('超时走 timeout 拒绝并带上可识别的原因', async () => {
    const promise = urlToFile('https://a.com/slow', 'a.jpg')
    FakeXHR.last.ontimeout?.()
    await expect(promise).rejects.toThrow('Image download timeout')
  })

  it('网络错误拒绝时包含 URL 与状态码（便于排查是哪个图床挂了）', async () => {
    const promise = urlToFile('https://a.com/bad', 'a.jpg')
    FakeXHR.last.status = 403
    FakeXHR.last.onerror?.()
    await expect(promise).rejects.toThrow(
      'Image download failed: https://a.com/bad (status: 403)',
    )
  })
})

describe('urlToImage', () => {
  class FakeImage {
    static last: FakeImage
    crossOrigin = ''
    onload: (() => void) | null = null
    onerror: (() => void) | null = null
    private _src = ''
    constructor() {
      FakeImage.last = this
    }
    set src(value: string) {
      this._src = value
    }
    get src() {
      return this._src
    }
  }

  beforeEach(() => {
    vi.stubGlobal('Image', FakeImage)
  })

  it('设置 crossOrigin=anonymous（Canvas 取色需要 CORS 头）', async () => {
    const promise = urlToImage('https://a.com/pic.jpg')
    expect(FakeImage.last.crossOrigin).toBe('anonymous')
    expect(FakeImage.last.src).toBe('https://a.com/pic.jpg')
    FakeImage.last.onload?.()
    await expect(promise).resolves.toBe(FakeImage.last)
  })

  it('加载失败时拒绝并带上 URL', async () => {
    const promise = urlToImage('https://a.com/broken.jpg')
    FakeImage.last.onerror?.()
    await expect(promise).rejects.toThrow(
      'Image load failed: https://a.com/broken.jpg',
    )
  })
})

describe('compressedImageToBlob', () => {
  const fakeImage = (naturalWidth = 2048, naturalHeight = 1024) =>
    ({
      complete: true,
      naturalWidth,
      naturalHeight,
    }) as unknown as HTMLImageElement

  const stubCanvas = (blob: Blob | null, drawImage = vi.fn()) => {
    const ctx = { drawImage }
    HTMLCanvasElement.prototype.getContext = vi.fn(() => ctx) as never
    HTMLCanvasElement.prototype.toBlob = vi.fn((cb: BlobCallback) => {
      cb(blob)
    }) as never
    return { ctx, drawImage }
  }

  it('未加载完成或尺寸为 0 时直接抛错（避免拿到空画布）', async () => {
    await expect(
      compressedImageToBlob({ complete: false } as HTMLImageElement),
    ).rejects.toThrow('Image not loaded or corrupted')
    await expect(compressedImageToBlob(fakeImage(0, 0))).rejects.toThrow(
      'Image not loaded or corrupted',
    )
  })

  it('按目标宽度和原图比例计算画布高度', async () => {
    const { drawImage } = stubCanvas(new Blob(['x']))

    await compressedImageToBlob(fakeImage(2048, 1024), 0.5, 1000)

    // 宽高比 2:1 → 高 500（不是把原图硬拉到正方形）
    expect(drawImage).toHaveBeenCalledTimes(1)
    expect(drawImage.mock.calls[0].slice(1)).toEqual([0, 0, 1000, 500])
  })

  it('toBlob 返回 null 时拒绝，带上目标类型', async () => {
    stubCanvas(null)
    await expect(
      compressedImageToBlob(fakeImage(), 0.5, 100, 'image/webp'),
    ).rejects.toThrow('create Blob failed: image/webp')
  })

  it('drawImage 抛错（跨域 tainted canvas）时错误信息保留原因', async () => {
    stubCanvas(
      new Blob(['x']),
      vi.fn(() => {
        throw new DOMException('tainted', 'SecurityError')
      }),
    )
    await expect(compressedImageToBlob(fakeImage())).rejects.toThrow(
      /Image compression failed: .*Canvas drawing failed/,
    )
  })
})

describe('compressedImageUrlToBase64', () => {
  it('串起 加载 → 压缩 → Base64 三步并返回 data URL', async () => {
    class FakeImage {
      static last: FakeImage
      crossOrigin = ''
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      complete = true
      naturalWidth = 100
      naturalHeight = 100
      private _src = ''
      constructor() {
        FakeImage.last = this
      }
      set src(value: string) {
        this._src = value
        queueMicrotask(() => this.onload?.())
      }
      get src() {
        return this._src
      }
    }
    vi.stubGlobal('Image', FakeImage)
    // 同 blobToBase64：FileReader 与 Node Blob 不互通，桩掉读取环节
    class FakeFileReader {
      result = 'data:image/jpeg;base64,eA=='
      onload: ((e: { target: FakeFileReader }) => void) | null = null
      readAsDataURL() {
        queueMicrotask(() => this.onload?.({ target: this }))
      }
    }
    vi.stubGlobal('FileReader', FakeFileReader)
    HTMLCanvasElement.prototype.getContext = vi.fn(
      () => ({ drawImage: vi.fn() }) as never,
    ) as never
    HTMLCanvasElement.prototype.toBlob = vi.fn((cb: BlobCallback) => {
      cb(new Blob(['x'], { type: 'image/jpeg' }))
    }) as never

    const result = await compressedImageUrlToBase64('https://a.com/pic.jpg')

    expect(result.startsWith('data:')).toBe(true)
  })
})
