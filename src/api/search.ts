import request from './request'

export const getBaiduSugrec = (
  keyword: string,
): Promise<{
  g: {
    q: string
  }[]
}> => {
  return request({
    url: 'https://www.baidu.com/sugrec',
    params: {
      prod: 'pc',
      wd: keyword,
    },
  })
}

/**
 * 统一搜索建议获取接口，适配不同搜索引擎的 API 返回格式。
 * 扩展环境不受 CORS 限制，可直接 fetch 各引擎的 suggestion 接口。
 * 查询词超过 20 字符时跳过请求（超长词无有意义的建议）。
 */
export const getSearchSuggestion = async (
  engineLabel: string,
  suggestUrl: string | undefined,
  keyword: string,
): Promise<string[]> => {
  // 超长查询词直接返回，避免无意义的网络请求
  if (keyword.length > 20) {
    return []
  }

  // 无 suggestUrl 的引擎（Github/Qwant/Yahoo/自定义）回退百度
  if (!suggestUrl) {
    const data = await getBaiduSugrec(keyword)
    if (data?.g?.length) {
      return data.g.map((item) => item.q)
    }
    return []
  }

  const url = suggestUrl.replace('{query}', encodeURIComponent(keyword))

  // Bing / Google / Sogou: ["query", ["词1", "词2", ...], ...]
  if (
    engineLabel === 'Bing' ||
    engineLabel === 'Google' ||
    engineLabel === 'Sogou'
  ) {
    const data = (await request({ url })) as unknown as [
      string,
      string[],
      ...unknown[],
    ]
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1]
    }
    return []
  }

  // DuckDuckGo: [{phrase: "..."}, ...]
  if (engineLabel === 'Duckduckgo') {
    const data = (await request({ url })) as unknown as Array<{
      phrase: string
    }>
    if (Array.isArray(data)) {
      return data.map((item) => item.phrase).filter(Boolean)
    }
    return []
  }

  // Yandex: ["query", ["词1", "词2", ...]]
  if (engineLabel === 'Yandex') {
    const data = (await request({ url })) as unknown as [
      string,
      string[],
      ...unknown[],
    ]
    if (Array.isArray(data) && Array.isArray(data[1])) {
      return data[1]
    }
    return []
  }

  // 360: {"result": [{"word": "..."}, ...]}
  if (engineLabel === '360') {
    const data = (await request({ url })) as unknown as {
      result?: Array<{ word: string }>
    }
    if (data?.result?.length) {
      return data.result.map((item) => item.word)
    }
    return []
  }

  // 百度: {"g": [{q: "..."}, ...]}
  const data = (await request({ url })) as unknown as {
    g?: Array<{ q: string }>
  }
  if (data?.g?.length) {
    return data.g.map((item) => item.q)
  }
  return []
}
