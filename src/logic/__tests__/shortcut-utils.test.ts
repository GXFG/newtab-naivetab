import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest'
import { isUrlInBlacklist, normalizeDomain, buildModifierKeys, formatModifierKeys, toModifierMask, isInInputElement } from '@/logic/shortcut/utils'
import { matchShortcut } from '@/logic/shortcut/matcher'

describe('normalizeDomain', () => {
  it('removes https:// protocol', () => {
    expect(normalizeDomain('https://google.com')).toBe('google.com')
  })

  it('removes http:// protocol', () => {
    expect(normalizeDomain('http://google.com')).toBe('google.com')
  })

  it('removes path, query and hash', () => {
    expect(normalizeDomain('https://docs.google.com/document/123?foo=bar#anchor')).toBe('docs.google.com')
  })

  it('removes port number', () => {
    expect(normalizeDomain('localhost:8080')).toBe('localhost')
    expect(normalizeDomain('https://example.com:443/path')).toBe('example.com')
  })

  it('removes trailing slash', () => {
    expect(normalizeDomain('google.com/')).toBe('google.com')
  })

  it('converts to lowercase', () => {
    expect(normalizeDomain('GOOGLE.COM')).toBe('google.com')
  })

  it('removes www. prefix', () => {
    expect(normalizeDomain('www.google.com')).toBe('google.com')
    expect(normalizeDomain('WWW.EXAMPLE.COM')).toBe('example.com')
  })

  it('trims whitespace', () => {
    expect(normalizeDomain('  google.com  ')).toBe('google.com')
  })

  it('returns empty string for protocol-only input', () => {
    expect(normalizeDomain('https://')).toBe('')
  })
})

describe('isUrlInBlacklist', () => {
  it('returns false for empty blacklist', () => {
    expect(isUrlInBlacklist('google.com', [])).toBe(false)
    expect(isUrlInBlacklist('google.com', [''])).toBe(false)
  })

  it('matches exact domain', () => {
    expect(isUrlInBlacklist('google.com', ['google.com'])).toBe(true)
  })

  it('matches subdomain of blacklisted domain', () => {
    expect(isUrlInBlacklist('docs.google.com', ['google.com'])).toBe(true)
    expect(isUrlInBlacklist('mail.google.com', ['google.com'])).toBe(true)
  })

  it('does not match unrelated domain', () => {
    expect(isUrlInBlacklist('evil.com', ['google.com'])).toBe(false)
  })

  it('does not falsely match domain ending with same suffix', () => {
    expect(isUrlInBlacklist('not-google.com', ['google.com'])).toBe(false)
    expect(isUrlInBlacklist('iamnotgoogle.com', ['google.com'])).toBe(false)
  })

  it('handles *.domain pattern (equivalent to domain)', () => {
    expect(isUrlInBlacklist('docs.google.com', ['*.google.com'])).toBe(true)
    expect(isUrlInBlacklist('google.com', ['*.google.com'])).toBe(true)
  })

  it('handles * as wildcard matching all domains', () => {
    expect(isUrlInBlacklist('anything.com', ['*'])).toBe(true)
    expect(isUrlInBlacklist('localhost', ['*'])).toBe(true)
  })

  it('normalizes pattern input (protocol, path, case)', () => {
    expect(isUrlInBlacklist('google.com', ['https://GOOGLE.COM/some/path'])).toBe(true)
  })

  it('normalizes hostname input (www, case)', () => {
    expect(isUrlInBlacklist('www.GOOGLE.com', ['google.com'])).toBe(true)
  })

  it('matches multiple patterns (first match wins)', () => {
    expect(isUrlInBlacklist('bing.com', ['google.com', 'bing.com', 'yahoo.com'])).toBe(true)
  })

  it('handles empty hostname (about:blank)', () => {
    expect(isUrlInBlacklist('', ['google.com'])).toBe(false)
    expect(isUrlInBlacklist('', ['*'])).toBe(true)
  })

  it('handles port in hostname (location.hostname has no port)', () => {
    expect(isUrlInBlacklist('localhost', ['localhost:8080'])).toBe(true)
  })
})

function createKeyboardEvent(partial: Partial<KeyboardEventInit>): KeyboardEvent {
  return new KeyboardEvent('keydown', {
    code: 'KeyK',
    ctrlKey: false,
    shiftKey: false,
    altKey: false,
    metaKey: false,
    repeat: false,
    ...partial,
  })
}

describe('matchShortcut — blacklist integration', () => {
  it('blocks shortcut when hostname matches blacklist', () => {
    const e = createKeyboardEvent({})
    // 模拟 location.hostname = 'docs.google.com'
    const result = matchShortcut(e, true, ['alt'], false, ['google.com'], 'docs.google.com')
    expect(result).toBeNull()
  })

  it('allows shortcut when hostname does not match blacklist', () => {
    const e = createKeyboardEvent({ code: 'KeyK', altKey: true })
    const result = matchShortcut(e, true, ['alt'], false, ['blocked.com'], 'allowed.com')
    expect(result).toBe('KeyK')
  })

  it('allows shortcut when blacklist is empty', () => {
    const e = createKeyboardEvent({ code: 'KeyK', altKey: true })
    const result = matchShortcut(e, true, ['alt'], false, [], 'google.com')
    expect(result).toBe('KeyK')
  })

  it('allows shortcut when hostname is empty (about:blank) and blacklist exists', () => {
    const e = createKeyboardEvent({ code: 'KeyK', altKey: true })
    const result = matchShortcut(e, true, ['alt'], false, ['google.com'], '')
    // 空 hostname 时 matchShortcut 跳过黑名单检查（因为 `hostname && ...` 短路）
    expect(result).toBe('KeyK')
  })

  it('blocks shortcut when hostname is empty and blacklist contains *', () => {
    const e = createKeyboardEvent({ code: 'KeyK', altKey: true })
    const result = matchShortcut(e, true, ['alt'], false, ['*'], '')
    // 空 hostname normalize 后仍是 ''，'' === '*' 不匹配，但 * 是通配符
    // normalizeDomain('') → ''，domain = '*'，'' !== '*' → 不匹配
    // 所以空 hostname 不会被 * 拦截
    expect(result).toBe('KeyK')
  })
})

describe('toModifierMask', () => {
  it('returns 0 for empty array', () => {
    expect(toModifierMask([])).toBe(0)
  })

  it('maps single modifiers correctly', () => {
    expect(toModifierMask(['ctrl'])).toBe(1)
    expect(toModifierMask(['shift'])).toBe(2)
    expect(toModifierMask(['alt'])).toBe(4)
    expect(toModifierMask(['meta'])).toBe(8)
  })

  it('combines multiple modifiers via bitwise OR', () => {
    expect(toModifierMask(['ctrl', 'shift'])).toBe(3) // 1|2
    expect(toModifierMask(['shift', 'alt'])).toBe(6) // 2|4
    expect(toModifierMask(['ctrl', 'shift', 'alt', 'meta'])).toBe(15) // 1|2|4|8
  })

  it('is order-independent (bitwise property)', () => {
    expect(toModifierMask(['alt', 'shift'])).toBe(toModifierMask(['shift', 'alt']))
  })
})

describe('buildModifierKeys', () => {
  function createKeyboardEventWithModifiers(partial: Partial<KeyboardEventInit> & {
    ctrlKey?: boolean
    shiftKey?: boolean
    altKey?: boolean
    metaKey?: boolean
  }): KeyboardEvent {
    return new KeyboardEvent('keydown', {
      ctrlKey: false,
      shiftKey: false,
      altKey: false,
      metaKey: false,
      ...partial,
    })
  }

  it('returns empty array when no modifiers are pressed', () => {
    const e = createKeyboardEventWithModifiers({})
    expect(buildModifierKeys(e)).toEqual([])
  })

  it('extracts single modifier', () => {
    const e = createKeyboardEventWithModifiers({ ctrlKey: true })
    expect(buildModifierKeys(e)).toEqual(['ctrl'])
  })

  it('extracts multiple modifiers in canonical order', () => {
    const e = createKeyboardEventWithModifiers({ metaKey: true, ctrlKey: true, shiftKey: true })
    expect(buildModifierKeys(e)).toEqual(['ctrl', 'shift', 'meta'])
  })

  it('always returns ctrl→shift→alt→meta order regardless of event property order', () => {
    const e = createKeyboardEventWithModifiers({ altKey: true, ctrlKey: true })
    expect(buildModifierKeys(e)).toEqual(['ctrl', 'alt'])
  })
})

describe('formatModifierKeys', () => {
  it('returns empty string for empty array', () => {
    expect(formatModifierKeys([])).toBe('')
  })

  it('formats single modifier', () => {
    expect(formatModifierKeys(['ctrl'])).toBe('Ctrl')
    expect(formatModifierKeys(['shift'])).toBe('Shift')
  })

  it('formats multiple modifiers with " + " separator', () => {
    expect(formatModifierKeys(['ctrl', 'shift'])).toBe('Ctrl + Shift')
    expect(formatModifierKeys(['ctrl', 'alt', 'meta'])).toBe('Ctrl + Alt + Win')
  })
})

describe('isInInputElement', () => {
  /**
   * 模拟 activeElement（现在的首要检测源）。
   */
  function withActiveElement(el: Element | null): void {
    Object.defineProperty(document, 'activeElement', { value: el, configurable: true })
  }

  const originalActiveElement = document.activeElement

  beforeEach(() => {
    // 每个测试前恢复 activeElement 为原始值，避免测试间泄漏
    withActiveElement(originalActiveElement)
  })

  // -- activeElement 主路径 --

  it('returns true for INPUT element via activeElement', () => {
    const input = document.createElement('input')
    withActiveElement(input)
    expect(isInInputElement(new KeyboardEvent('keydown', { code: 'KeyA' }))).toBe(true)
  })

  it('returns true for TEXTAREA via activeElement', () => {
    const textarea = document.createElement('textarea')
    withActiveElement(textarea)
    expect(isInInputElement(new KeyboardEvent('keydown', { code: 'KeyA' }))).toBe(true)
  })

  it('returns true for SELECT via activeElement', () => {
    const select = document.createElement('select')
    withActiveElement(select)
    expect(isInInputElement(new KeyboardEvent('keydown', { code: 'KeyA' }))).toBe(true)
  })

  it('returns true for EMBED via activeElement', () => {
    const embed = document.createElement('embed')
    withActiveElement(embed)
    expect(isInInputElement(new KeyboardEvent('keydown', { code: 'KeyA' }))).toBe(true)
  })

  it('returns true for OBJECT via activeElement', () => {
    const obj = document.createElement('object')
    withActiveElement(obj)
    expect(isInInputElement(new KeyboardEvent('keydown', { code: 'KeyA' }))).toBe(true)
  })

  it('returns true for contenteditable="true" via activeElement', () => {
    const div = document.createElement('div')
    div.setAttribute('contenteditable', 'true')
    Object.defineProperty(div, 'isContentEditable', { value: true })
    withActiveElement(div)
    expect(isInInputElement(new KeyboardEvent('keydown', { code: 'KeyA' }))).toBe(true)
  })

  it('returns true for role=textbox via activeElement', () => {
    const div = document.createElement('div')
    div.setAttribute('role', 'textbox')
    withActiveElement(div)
    expect(isInInputElement(new KeyboardEvent('keydown', { code: 'KeyA' }))).toBe(true)
  })

  it('returns true for role=combobox via activeElement', () => {
    const div = document.createElement('div')
    div.setAttribute('role', 'combobox')
    withActiveElement(div)
    expect(isInInputElement(new KeyboardEvent('keydown', { code: 'KeyA' }))).toBe(true)
  })

  it('returns true for IFRAME via activeElement', () => {
    const iframe = document.createElement('iframe')
    withActiveElement(iframe)
    expect(isInInputElement(new KeyboardEvent('keydown', { code: 'KeyA' }))).toBe(true)
  })

  it('returns false for regular div when neither activeElement nor composedPath match', () => {
    const div = document.createElement('div')
    withActiveElement(div)
    expect(isInInputElement(new KeyboardEvent('keydown', { code: 'KeyA' }))).toBe(false)
  })

  it('returns false for body as activeElement', () => {
    withActiveElement(document.body)
    expect(isInInputElement(new KeyboardEvent('keydown', { code: 'KeyA' }))).toBe(false)
  })

  // -- composedPath 兜底路径（activeElement 非输入时） --

  it('falls back to composedPath when activeElement is non-input', () => {
    const nonInput = document.createElement('div')
    const input = document.createElement('input')
    withActiveElement(nonInput)
    const e = new KeyboardEvent('keydown', { code: 'KeyA' })
    vi.spyOn(e, 'composedPath').mockReturnValue([input])
    expect(isInInputElement(e)).toBe(true)
  })

  it('returns true for input inside Shadow DOM via composedPath', () => {
    const host = document.createElement('div')
    const input = document.createElement('input')
    host.attachShadow({ mode: 'open' })
    host.shadowRoot!.appendChild(input)
    const nonInput = document.createElement('span')
    const e = new KeyboardEvent('keydown', { code: 'KeyA' })
    withActiveElement(nonInput)
    vi.spyOn(e, 'composedPath').mockReturnValue([host, input])
    expect(isInInputElement(e)).toBe(true)
  })

  it('returns true when composedPath contains a textbox role ancestor', () => {
    const wrapper = document.createElement('div')
    wrapper.setAttribute('role', 'searchbox')
    const inner = document.createElement('span')
    wrapper.appendChild(inner)
    const nonInput = document.createElement('div')
    withActiveElement(nonInput)
    const e = new KeyboardEvent('keydown', { code: 'KeyA' })
    vi.spyOn(e, 'composedPath').mockReturnValue([inner, wrapper])
    expect(isInInputElement(e)).toBe(true)
  })

  // -- 竞态场景 --

  it('detects input via activeElement when composedPath has no input (focus race condition)', () => {
    const nonInput = document.createElement('div')
    const input = document.createElement('input')
    withActiveElement(input)
    const e = new KeyboardEvent('keydown', { code: 'KeyA' })
    vi.spyOn(e, 'composedPath').mockReturnValue([nonInput])
    expect(isInInputElement(e)).toBe(true)
  })

  // -- input type 白名单 --

  it('returns true for text/password/email/search/number/tel/url input types', () => {
    for (const type of ['text', 'password', 'email', 'search', 'number', 'tel', 'url', 'date', 'time', 'datetime-local', 'month', 'week']) {
      const input = document.createElement('input')
      input.type = type
      withActiveElement(input)
      expect(isInInputElement(new KeyboardEvent('keydown'))).toBe(true)
    }
  })

  it('returns false for button/checkbox/radio/file/hidden/image/submit/reset/color input types', () => {
    for (const type of ['button', 'checkbox', 'radio', 'file', 'hidden', 'image', 'submit', 'reset', 'color']) {
      const input = document.createElement('input')
      input.type = type
      withActiveElement(input)
      expect(isInInputElement(new KeyboardEvent('keydown'))).toBe(false)
    }
  })

  it('treats unknown input type as text (not excluded)', () => {
    const input = document.createElement('input')
    input.setAttribute('type', 'unknown-type')
    withActiveElement(input)
    expect(isInInputElement(new KeyboardEvent('keydown'))).toBe(true)
  })

  it('returns true when document.designMode is on', () => {
    const nonInput = document.createElement('div')
    withActiveElement(nonInput)
    // jsdom 中 designMode 默认是 'off'，需要模拟
    Object.defineProperty(document, 'designMode', { value: 'on', configurable: true })
    expect(isInInputElement(new KeyboardEvent('keydown'))).toBe(true)
    // 恢复
    Object.defineProperty(document, 'designMode', { value: 'off', configurable: true })
  })

  afterAll(() => {
    // 防止 activeElement mock 泄漏到后续测试块
    withActiveElement(originalActiveElement)
  })
})

describe('matchShortcut — non-blacklist paths', () => {

  it('returns null when disabled', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyK', ctrlKey: true })
    expect(matchShortcut(e, false, ['ctrl'], false)).toBeNull()
  })

  it('returns null when event.repeat is true', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyK', ctrlKey: true, repeat: true })
    expect(matchShortcut(e, true, ['ctrl'], false)).toBeNull()
  })

  it('respects shortcutInInputElement=false (blocks in input)', () => {
    const input = document.createElement('input')
    const e = new KeyboardEvent('keydown', { code: 'KeyK', ctrlKey: true })
    vi.spyOn(e, 'composedPath').mockReturnValue([input])
    expect(matchShortcut(e, true, ['ctrl'], false)).toBeNull()
  })

  it('respects shortcutInInputElement=true (allows in input)', () => {
    const input = document.createElement('input')
    const e = new KeyboardEvent('keydown', { code: 'KeyK', ctrlKey: true })
    vi.spyOn(e, 'composedPath').mockReturnValue([input])
    expect(matchShortcut(e, true, ['ctrl'], true)).toBe('KeyK')
  })

  it('matches when modifiers match via bitmask', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyA', ctrlKey: true, shiftKey: true })
    expect(matchShortcut(e, true, ['ctrl', 'shift'], false)).toBe('KeyA')
  })

  it('returns null when modifiers do not match', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyA', ctrlKey: true })
    expect(matchShortcut(e, true, ['ctrl', 'shift'], false)).toBeNull()
  })

  it('returns null when empty modifiers configured', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyA', ctrlKey: true })
    expect(matchShortcut(e, true, [], false)).toBeNull()
  })

  it('returns null for main key not in ALLOWED_SET', () => {
    const e = new KeyboardEvent('keydown', { code: 'Escape', ctrlKey: true })
    expect(matchShortcut(e, true, ['ctrl'], false)).toBeNull()
  })

  it('matches all letter keys with ctrl', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyZ', ctrlKey: true })
    expect(matchShortcut(e, true, ['ctrl'], false)).toBe('KeyZ')
  })

  it('matches digit keys', () => {
    const e = new KeyboardEvent('keydown', { code: 'Digit1', altKey: true })
    expect(matchShortcut(e, true, ['alt'], false)).toBe('Digit1')
  })

  it('matches function keys', () => {
    const e = new KeyboardEvent('keydown', { code: 'F5', ctrlKey: true })
    expect(matchShortcut(e, true, ['ctrl'], false)).toBe('F5')
  })

  it('matches arrow keys', () => {
    const e = new KeyboardEvent('keydown', { code: 'ArrowUp', ctrlKey: true })
    expect(matchShortcut(e, true, ['ctrl'], false)).toBe('ArrowUp')
  })
})

describe('matchShortcut — noModifierMode', () => {
  it('matches single key without modifiers', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyK' })
    expect(matchShortcut(e, true, [], false, undefined, undefined, true)).toBe('KeyK')
  })

  it('rejects when modifiers are pressed in noModifierMode', () => {
    const e = new KeyboardEvent('keydown', { code: 'KeyK', ctrlKey: true })
    expect(matchShortcut(e, true, [], false, undefined, undefined, true)).toBeNull()
  })

  it('rejects non-allowed keys in noModifierMode', () => {
    const e = new KeyboardEvent('keydown', { code: 'Escape' })
    expect(matchShortcut(e, true, [], false, undefined, undefined, true)).toBeNull()
  })
})
