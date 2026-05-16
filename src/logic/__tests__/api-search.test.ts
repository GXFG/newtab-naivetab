import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * api-search.test.ts — 测试 search.ts 中 getSearchSuggestion 的多引擎建议解析逻辑
 *
 * getSearchSuggestion 依赖 axios 网络请求，通过 vi.doMock 模拟 request 模块。
 * 测试覆盖：超长关键词跳过、无 suggestUrl 回退百度、各引擎响应格式解析。
 */

// ── 工具：创建 mock request ──

function createMockRequest() {
  return vi.fn()
}

describe('getSearchSuggestion', () => {
  let getSearchSuggestion: typeof import('@/api/search')['getSearchSuggestion']
  let mockRequest: ReturnType<typeof createMockRequest>

  beforeEach(async () => {
    vi.resetModules()
    mockRequest = createMockRequest()

    vi.doMock('@/api/request', () => ({
      default: mockRequest,
    }))

    const mod = await import('@/api/search')
    getSearchSuggestion = mod.getSearchSuggestion
  })

  it('returns empty array for keyword longer than 20 characters', async () => {
    const result = await getSearchSuggestion(
      'Bing',
      'https://example.com/suggest?q={query}',
      'this is a very long keyword that exceeds twenty characters',
    )
    expect(result).toEqual([])
    expect(mockRequest).not.toHaveBeenCalled()
  })

  it('falls back to Baidu when suggestUrl is undefined', async () => {
    mockRequest.mockResolvedValue({
      g: [{ q: '百度词1' }, { q: '百度词2' }],
    })

    const result = await getSearchSuggestion('Baidu', undefined, 'test')

    expect(mockRequest).toHaveBeenCalledWith({
      url: 'https://www.baidu.com/sugrec',
      params: { prod: 'pc', wd: 'test' },
    })
    expect(result).toEqual(['百度词1', '百度词2'])
  })

  it('parses Bing format: [query, ["word1", "word2"]]', async () => {
    mockRequest.mockResolvedValue(['test', ['suggestion1', 'suggestion2']])

    const result = await getSearchSuggestion(
      'Bing',
      'https://api.bing.com/qsonhs.aspx?q={query}',
      'test',
    )

    expect(result).toEqual(['suggestion1', 'suggestion2'])
  })

  it('parses Google format: [query, ["word1", "word2"]]', async () => {
    mockRequest.mockResolvedValue([
      'test',
      ['google1', 'google2', 'google3'],
      null,
    ])

    const result = await getSearchSuggestion(
      'Google',
      'https://suggestqueries.google.com/complete/search?q={query}&client=chrome',
      'test',
    )

    expect(result).toEqual(['google1', 'google2', 'google3'])
  })

  it('parses Sogou format: [query, ["word1", "word2"]]', async () => {
    mockRequest.mockResolvedValue(['test', ['sogou1', 'sogou2']])

    const result = await getSearchSuggestion(
      'Sogou',
      'https://w.sugg.sogou.com/sugg/ajaxaction.jsp?key={query}',
      'test',
    )

    expect(result).toEqual(['sogou1', 'sogou2'])
  })

  it('parses DuckDuckGo format: [{phrase: "..."}, ...]', async () => {
    mockRequest.mockResolvedValue([
      { phrase: 'ddg1' },
      { phrase: 'ddg2' },
      { phrase: '' },
      { phrase: 'ddg3' },
    ])

    const result = await getSearchSuggestion(
      'Duckduckgo',
      'https://duckduckgo.com/ac/?q={query}',
      'test',
    )

    expect(result).toEqual(['ddg1', 'ddg2', 'ddg3'])
  })

  it('filters out empty phrases from DuckDuckGo response', async () => {
    mockRequest.mockResolvedValue([
      { phrase: 'valid' },
      { phrase: '' },
      { phrase: null },
    ])

    const result = await getSearchSuggestion(
      'Duckduckgo',
      'https://duckduckgo.com/ac/?q={query}',
      'test',
    )

    expect(result).toEqual(['valid'])
  })

  it('parses Yandex format: [query, ["word1", "word2"]]', async () => {
    mockRequest.mockResolvedValue(['test', ['yandex1', 'yandex2']])

    const result = await getSearchSuggestion(
      'Yandex',
      'https://suggest.yandex.ru/suggest-ff.cgi?part={query}',
      'test',
    )

    expect(result).toEqual(['yandex1', 'yandex2'])
  })

  it('parses 360 format: {result: [{word: "..."}]}', async () => {
    mockRequest.mockResolvedValue({
      result: [{ word: '360词1' }, { word: '360词2' }],
    })

    const result = await getSearchSuggestion(
      '360',
      'https://sug.so.360.cn/suggest?word={query}',
      'test',
    )

    expect(result).toEqual(['360词1', '360词2'])
  })

  it('parses Baidu custom URL format: {g: [{q: "..."}]}', async () => {
    mockRequest.mockResolvedValue({
      g: [{ q: 'baidu1' }, { q: 'baidu2' }],
    })

    const result = await getSearchSuggestion(
      'Baidu',
      'https://www.baidu.com/sugrec?prod=pc&wd={query}',
      'test',
    )

    expect(result).toEqual(['baidu1', 'baidu2'])
  })

  it('returns empty array when Bing response has no suggestions array', async () => {
    mockRequest.mockResolvedValue(['test'])

    const result = await getSearchSuggestion(
      'Bing',
      'https://api.bing.com/qsonhs.aspx?q={query}',
      'test',
    )

    expect(result).toEqual([])
  })

  it('returns empty array when DuckDuckGo response is not an array', async () => {
    mockRequest.mockResolvedValue({ error: 'not found' })

    const result = await getSearchSuggestion(
      'Duckduckgo',
      'https://duckduckgo.com/ac/?q={query}',
      'test',
    )

    expect(result).toEqual([])
  })

  it('returns empty array when 360 response has empty result', async () => {
    mockRequest.mockResolvedValue({ result: [] })

    const result = await getSearchSuggestion(
      '360',
      'https://sug.so.360.cn/suggest?word={query}',
      'test',
    )

    expect(result).toEqual([])
  })

  it('replaces {query} placeholder with encoded keyword', async () => {
    mockRequest.mockResolvedValue(['test with space', ['result1']])

    await getSearchSuggestion(
      'Bing',
      'https://api.bing.com/qsonhs.aspx?q={query}&type=1',
      'test with space',
    )

    expect(mockRequest).toHaveBeenCalledWith({
      url: 'https://api.bing.com/qsonhs.aspx?q=test%20with%20space&type=1',
    })
  })

  it('falls back to Baidu for unknown engine label without suggestUrl', async () => {
    mockRequest.mockResolvedValue({
      g: [{ q: 'fallback' }],
    })

    const result = await getSearchSuggestion(
      'UnknownEngine',
      undefined,
      'test',
    )

    expect(mockRequest).toHaveBeenCalledWith({
      url: 'https://www.baidu.com/sugrec',
      params: { prod: 'pc', wd: 'test' },
    })
    expect(result).toEqual(['fallback'])
  })

  it('falls back to Baidu for unknown engine label with suggestUrl', async () => {
    // Unknown engine label falls through to Baidu format parsing
    mockRequest.mockResolvedValue({
      g: [{ q: 'fallbackViaUrl' }],
    })

    const result = await getSearchSuggestion(
      'UnknownEngine',
      'https://example.com/suggest?q={query}',
      'test',
    )

    expect(result).toEqual(['fallbackViaUrl'])
  })
})
