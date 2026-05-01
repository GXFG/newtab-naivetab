import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  compareLeftVersionLessThanRightVersions,
  padUrlHttps,
  log,
  sleep,
  createTab,
  downloadImageByUrl,
  downloadJsonByTagA,
  urlToFile,
  urlToImage,
  compressedImageToBlob,
  blobToBase64,
  compressedImageUrlToBase64,
} from '@/logic/util'

describe('compareLeftVersionLessThanRightVersions', () => {
  it('returns true when left is clearly older (major diff)', () => {
    expect(compareLeftVersionLessThanRightVersions('1.0.0', '2.0.0')).toBe(true)
  })

  it('returns false when left is newer (major diff)', () => {
    expect(compareLeftVersionLessThanRightVersions('2.0.0', '1.0.0')).toBe(
      false,
    )
  })

  it('returns false for equal versions', () => {
    expect(compareLeftVersionLessThanRightVersions('1.0.0', '1.0.0')).toBe(
      false,
    )
  })

  it('handles patch version difference', () => {
    expect(compareLeftVersionLessThanRightVersions('1.2.3', '1.2.4')).toBe(true)
  })

  it('handles minor version difference', () => {
    expect(compareLeftVersionLessThanRightVersions('1.27.0', '2.0.0')).toBe(
      true,
    )
  })

  it('handles real migration versions (2.2.0 vs 2.2.2)', () => {
    expect(compareLeftVersionLessThanRightVersions('2.2.0', '2.2.2')).toBe(true)
    expect(compareLeftVersionLessThanRightVersions('2.2.2', '2.2.0')).toBe(
      false,
    )
  })

  it('pads shorter version with zeros (1.0 vs 1.0.0)', () => {
    expect(compareLeftVersionLessThanRightVersions('1.0', '1.0.0')).toBe(false)
  })

  it('pads shorter version with zeros (1 vs 1.0.0)', () => {
    expect(compareLeftVersionLessThanRightVersions('1', '1.0.0')).toBe(false)
  })

  it('handles 0.x.x versions', () => {
    expect(compareLeftVersionLessThanRightVersions('0.9.9', '1.0.0')).toBe(true)
    expect(compareLeftVersionLessThanRightVersions('0.0.1', '0.0.2')).toBe(true)
  })

  it('handles two-segment versions', () => {
    expect(compareLeftVersionLessThanRightVersions('1.27', '1.28')).toBe(true)
    expect(compareLeftVersionLessThanRightVersions('2.2', '2.2')).toBe(false)
  })
})

describe('padUrlHttps', () => {
  it('adds https:// to bare domain', () => {
    expect(padUrlHttps('example.com')).toBe('https://example.com')
  })

  it('keeps https:// URLs unchanged', () => {
    expect(padUrlHttps('https://example.com')).toBe('https://example.com')
  })

  it('keeps http:// URLs unchanged', () => {
    expect(padUrlHttps('http://example.com')).toBe('http://example.com')
  })

  it('handles URLs with path (no protocol)', () => {
    expect(padUrlHttps('example.com/path')).toBe('https://example.com/path')
  })
})

describe('log', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('calls console.log with styled message', () => {
    log('test message')
    expect(console.log).toHaveBeenCalled()
    const callArgs = (console.log as any).mock.calls[0]
    expect(callArgs[0]).toContain('test message')
  })

  it('uses red background for error messages', () => {
    log('error: something failed')
    const callArgs = (console.log as any).mock.calls[0]
    // 样式在第二个参数中
    expect(callArgs[1]).toContain('#ff4757')
  })

  it('uses blue background for normal messages', () => {
    log('normal message')
    const callArgs = (console.log as any).mock.calls[0]
    expect(callArgs[1]).toContain('#1475B2')
  })

  it('passes additional args to console.log', () => {
    log('message with args', { foo: 'bar' }, 42)
    expect(console.log).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      { foo: 'bar' },
      42,
    )
  })
})

describe('sleep', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  it('resolves after the specified time', async () => {
    const promise = sleep(1000)
    vi.advanceTimersByTime(1000)
    await promise
  })

  it('returns null on resolve', async () => {
    const promise = sleep(50)
    vi.advanceTimersByTime(50)
    const result = await promise
    expect(result).toBeNull()
  })

  afterEach(() => {
    vi.useRealTimers()
  })
})

describe('createTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls chrome.tabs.create with url and active=true by default', () => {
    createTab('https://example.com')
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.com',
      active: true,
    })
  })

  it('calls chrome.tabs.create with active=false when specified', () => {
    createTab('https://example.com', false)
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: 'https://example.com',
      active: false,
    })
  })

  it('does nothing for empty url', () => {
    createTab('')
    expect(chrome.tabs.create).not.toHaveBeenCalled()
  })
})

describe('downloadImageByUrl', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('downloads image and triggers click with inferred extension', async () => {
    const mockBlob = new Blob(['image data'], { type: 'image/png' })
    const mockFetch = vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(mockBlob),
    })
    vi.stubGlobal('fetch', mockFetch)

    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url')
    const mockRevokeObjectURL = vi.fn()
    vi.stubGlobal('URL', {
      createObjectURL: mockCreateObjectURL,
      revokeObjectURL: mockRevokeObjectURL,
    })

    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    }
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)

    await downloadImageByUrl('https://example.com/image.jpg', 'testfile')

    expect(mockFetch).toHaveBeenCalledWith('https://example.com/image.jpg')
    expect(mockLink.download).toBe('testfile.png')
    expect(mockLink.click).toHaveBeenCalled()

    ;(document.createElement as any).mockRestore()
  })

  it('uses jpg as fallback extension for unknown MIME type', async () => {
    const mockBlob = new Blob(['image data'], { type: 'application/octet-stream' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(mockBlob),
    }))
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
      revokeObjectURL: vi.fn(),
    })
    const mockLink = { href: '', download: '', click: vi.fn() }
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)

    await downloadImageByUrl('https://example.com/img', 'untitled')

    expect(mockLink.download).toBe('untitled.jpg')

    ;(document.createElement as any).mockRestore()
  })

  it('preserves filename if it already has extension', async () => {
    const mockBlob = new Blob(['image data'], { type: 'image/png' })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      blob: () => Promise.resolve(mockBlob),
    }))
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:mock-url'),
      revokeObjectURL: vi.fn(),
    })
    const mockLink = { href: '', download: '', click: vi.fn() }
    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)

    await downloadImageByUrl('https://example.com/img', 'my-photo.webp')

    expect(mockLink.download).toBe('my-photo.webp')

    ;(document.createElement as any).mockRestore()
  })
})

describe('downloadJsonByTagA', () => {
  it('creates and downloads JSON file', () => {
    const mockLink = {
      setAttribute: vi.fn(),
      click: vi.fn(),
    }
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:json-url'),
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)

    downloadJsonByTagA({ key: 'value' }, 'export.json')

    expect(mockLink.setAttribute).toHaveBeenCalledWith('href', 'blob:json-url')
    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'export.json')
    expect(mockLink.click).toHaveBeenCalled()

    ;(document.createElement as any).mockRestore()
  })

  it('uses default filename when not provided', () => {
    const mockLink = { setAttribute: vi.fn(), click: vi.fn() }
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn().mockReturnValue('blob:json-url'),
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any)

    downloadJsonByTagA({ foo: 1 })

    expect(mockLink.setAttribute).toHaveBeenCalledWith('download', 'file')

    ;(document.createElement as any).mockRestore()
  })
})

describe('urlToFile', () => {
  it('resolves with File on successful XHR', async () => {
    const OrigXHR = globalThis.XMLHttpRequest
    let capturedOnload: Function | null = null
    let capturedOntimeout: Function | null = null
    let capturedOnerror: Function | null = null

    class FakeXHR {
      timeout = 0
      response = new Blob(['image content'], { type: 'image/jpeg' })
      status = 200
      onload: Function | null = null
      ontimeout: Function | null = null
      onerror: Function | null = null
      open = vi.fn()
      setRequestHeader = vi.fn()
      send = vi.fn(() => {
        capturedOnload = this.onload
        capturedOntimeout = this.ontimeout
        capturedOnerror = this.onerror
      })
    }

    globalThis.XMLHttpRequest = FakeXHR as any

    const promise = urlToFile('https://example.com/img.jpg', 'test.jpg')

    // Simulate success
    capturedOnload?.()

    const file = await promise
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe('test.jpg')

    globalThis.XMLHttpRequest = OrigXHR
  })

  it('rejects on XHR timeout', async () => {
    const OrigXHR = globalThis.XMLHttpRequest
    let capturedOntimeout: Function | null = null

    class FakeXHR {
      timeout = 30000
      response = new Blob()
      status = 200
      onload: Function | null = null
      ontimeout: Function | null = null
      onerror: Function | null = null
      open = vi.fn()
      setRequestHeader = vi.fn()
      send = vi.fn(() => {
        capturedOntimeout = this.ontimeout
      })
    }

    globalThis.XMLHttpRequest = FakeXHR as any

    const promise = urlToFile('https://example.com/img.jpg', 'test.jpg')
    capturedOntimeout?.()

    await expect(promise).rejects.toThrow('Image download timeout')

    globalThis.XMLHttpRequest = OrigXHR
  })

  it('rejects on XHR error', async () => {
    const OrigXHR = globalThis.XMLHttpRequest
    let capturedOnerror: Function | null = null

    class FakeXHR {
      timeout = 30000
      response = new Blob()
      status = 404
      onload: Function | null = null
      ontimeout: Function | null = null
      onerror: Function | null = null
      open = vi.fn()
      setRequestHeader = vi.fn()
      send = vi.fn(() => {
        capturedOnerror = this.onerror
      })
    }

    globalThis.XMLHttpRequest = FakeXHR as any

    const promise = urlToFile('https://example.com/missing.jpg', 'test.jpg')
    capturedOnerror?.()

    await expect(promise).rejects.toThrow('Image download failed')

    globalThis.XMLHttpRequest = OrigXHR
  })
})

describe('urlToImage', () => {
  it('resolves with HTMLImageElement on successful load', async () => {
    const OrigImage = globalThis.Image

    const FakeImage = class extends EventTarget {
      crossOrigin = ''
      #onload: Function | null = null
      #srcVal = ''

      set onload(fn: Function | null) { this.#onload = fn }
      get onload() { return this.#onload }
      set src(v: string) {
        this.#srcVal = v
        queueMicrotask(() => this.#onload?.())
      }
      get src() { return this.#srcVal }
    }

    globalThis.Image = FakeImage as unknown as typeof Image

    const promise = urlToImage('https://example.com/photo.jpg')
    const result = await promise
    expect(result).toBeInstanceOf(FakeImage)

    globalThis.Image = OrigImage
  })

  it('rejects when image fails to load', async () => {
    const OrigImage = globalThis.Image

    const FakeImage = class extends EventTarget {
      crossOrigin = ''
      #onerror: Function | null = null
      #srcVal = ''

      set onerror(fn: Function | null) { this.#onerror = fn }
      get onerror() { return this.#onerror }
      set src(v: string) {
        this.#srcVal = v
        queueMicrotask(() => this.#onerror?.())
      }
      get src() { return this.#srcVal }
    }

    globalThis.Image = FakeImage as unknown as typeof Image

    const promise = urlToImage('https://example.com/broken.jpg')
    await expect(promise).rejects.toThrow('Image load failed')

    globalThis.Image = OrigImage
  })
})

describe('compressedImageToBlob', () => {
  it('rejects if image is not loaded', async () => {
    const mockImg = { complete: false, naturalWidth: 0 } as HTMLImageElement
    await expect(compressedImageToBlob(mockImg)).rejects.toThrow(
      'Image not loaded or corrupted',
    )
  })

  it('creates compressed blob from loaded image', async () => {
    const mockCtx = { drawImage: vi.fn() }
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toBlob: vi.fn((cb: Function) => {
        cb(new Blob(['compressed'], { type: 'image/jpeg' }))
      }),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any)

    const mockImg = {
      complete: true,
      naturalWidth: 1920,
      naturalHeight: 1080,
    } as HTMLImageElement

    const result = await compressedImageToBlob(mockImg, 0.8, 1366)

    expect(result).toBeInstanceOf(Blob)
    expect(mockCanvas.width).toBe(1366)
    expect(mockCtx.drawImage).toHaveBeenCalled()
  })

  it('rejects when canvas.toBlob returns null', async () => {
    const mockCtx = { drawImage: vi.fn() }
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue(mockCtx),
      toBlob: vi.fn((cb: Function) => {
        cb(null)
      }),
    }
    vi.spyOn(document, 'createElement').mockReturnValue(mockCanvas as any)

    const mockImg = {
      complete: true,
      naturalWidth: 100,
      naturalHeight: 100,
    } as HTMLImageElement

    await expect(compressedImageToBlob(mockImg)).rejects.toThrow(
      'Blob failed',
    )
  })
})

describe('blobToBase64', () => {
  it('reads blob as data URL using FileReader', async () => {
    const blob = new Blob(['hello'], { type: 'text/plain' })

    // FileReader in jsdom doesn't work, so mock it
    const OrigFileReader = globalThis.FileReader
    class FakeFileReader extends EventTarget {
      result = 'data:text/plain;base64,aGVsbG8='
      readAsDataURL = vi.fn(function (this: FakeFileReader) {
        queueMicrotask(() => {
          this.onload?.({ target: this } as ProgressEvent<FileReader>)
        })
      })
    }
    globalThis.FileReader = FakeFileReader as any

    const result = await blobToBase64(blob)
    expect(result).toBe('data:text/plain;base64,aGVsbG8=')

    globalThis.FileReader = OrigFileReader
  })
})

describe('compressedImageUrlToBase64', () => {
  it('chains urlToImage → compressedImageToBlob → blobToBase64', async () => {
    // Mock Image constructor that auto-triggers onload when src is set
    const OrigImage = globalThis.Image
    class FakeImage extends EventTarget {
      complete = true
      naturalWidth = 1920
      naturalHeight = 1080
      crossOrigin = ''
      onload: Function | null = null
      onerror: Function | null = null
      #srcVal = ''
      get src() { return this.#srcVal }
      set src(_v: string) {
        this.#srcVal = _v
        // Auto-trigger onload when src is set (simulating immediate load)
        queueMicrotask(() => this.onload?.())
      }
    }
    globalThis.Image = FakeImage as any

    const origCreateElement = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      if (tagName === 'canvas') {
        const mockCtx = { drawImage: vi.fn() }
        return {
          width: 0,
          height: 0,
          getContext: vi.fn().mockReturnValue(mockCtx),
          toBlob: vi.fn((cb: Function) => {
            cb(new Blob(['compressed'], { type: 'image/jpeg' }))
          }),
        } as any as HTMLCanvasElement
      }
      return origCreateElement(tagName)
    })

    const OrigFileReader = globalThis.FileReader
    class FakeFileReader extends EventTarget {
      result = 'data:image/jpeg;base64,dGVzdA=='
      readAsDataURL = vi.fn(function (this: FakeFileReader) {
        queueMicrotask(() => {
          this.onload?.({ target: this } as ProgressEvent<FileReader>)
        })
      })
    }
    globalThis.FileReader = FakeFileReader as any

    const result = await compressedImageUrlToBase64('https://example.com/img.jpg')

    expect(typeof result).toBe('string')
    expect(result).toBe('data:image/jpeg;base64,dGVzdA==')

    globalThis.Image = OrigImage
    globalThis.FileReader = OrigFileReader
    ;(document.createElement as any).mockRestore()
  })
})
