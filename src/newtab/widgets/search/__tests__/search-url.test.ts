import { describe, it, expect } from 'vitest'
import {
  SEARCH_QUERY_PLACEHOLDER,
  isValidSearchTemplate,
  buildSearchUrl,
} from '../logic'

/**
 * search-url.test.ts — 搜索地址构建（被测模块：`src/newtab/widgets/search/logic.ts`）
 *
 * 背景：自定义引擎的 urlValue 由用户自由输入，设置面板不校验。原来组件里直接
 * `urlValue.replace('{query}', ...)` 就跳转，三种输入错误全部静默：
 *   1. 漏写占位符（用户常粘贴搜索结果页 URL）→ 关键词被丢弃，跳到固定地址
 *   2. 空字符串 → `location.href = ''` 重载当前页，看起来「点了没反应」
 *   3. 占位符出现两次 → replace 只替换第一个，第二个原样留在地址里
 */

describe('isValidSearchTemplate', () => {
  it('含占位符的模板合法', () => {
    expect(isValidSearchTemplate('https://www.baidu.com/s?word={query}')).toBe(
      true,
    )
  })

  it('缺少占位符时非法（粘贴搜索结果页 URL 的典型情况）', () => {
    expect(isValidSearchTemplate('https://www.baidu.com/s?word=abc')).toBe(
      false,
    )
  })

  it('空字符串与纯空白非法', () => {
    expect(isValidSearchTemplate('')).toBe(false)
    expect(isValidSearchTemplate('   ')).toBe(false)
  })
})

describe('buildSearchUrl', () => {
  it('替换占位符并编码关键词', () => {
    expect(buildSearchUrl('https://a.com/s?q={query}', '中文 空格')).toBe(
      'https://a.com/s?q=%E4%B8%AD%E6%96%87%20%E7%A9%BA%E6%A0%BC',
    )
  })

  it('模板中出现两次占位符时全部替换', () => {
    expect(buildSearchUrl('https://a.com/{query}?q={query}', 'k')).toBe(
      'https://a.com/k?q=k',
    )
  })

  it('模板非法时返回 null（不返回原地址）', () => {
    expect(buildSearchUrl('https://a.com/fixed', 'k')).toBeNull()
    expect(buildSearchUrl('', 'k')).toBeNull()
  })

  it('关键词里的 $ 不会被当成替换模式', () => {
    // encodeURIComponent('$&') === '%24%26'，若不编码，replaceAll 会把它展开成「匹配到的内容」
    const url = buildSearchUrl('https://a.com/s?q={query}', '$&')
    expect(url).toBe('https://a.com/s?q=%24%26')
    expect(url).not.toContain(SEARCH_QUERY_PLACEHOLDER)
  })
})
