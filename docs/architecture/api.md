# API 层

`src/api/` 封装所有外部 HTTP 请求。扩展环境中不受 CORS 限制。

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/api/index.ts` | 统一导出 |
| `src/api/image.ts` | Bing 每日壁纸、Pexels 图片 |
| `src/api/weather.ts` | 和风天气（城市搜索、实时天气、3 日预报、空气质量、预警、生活指数） |
| `src/api/search.ts` | 搜索建议（百度、Bing、Google、DuckDuckGo、Sogou、Yandex、360） |
| `src/api/poetry.ts` | 今日诗词 |
| `src/api/request.ts` | axios 实例 |

## API 速查

```ts
// 图片
getBingImagesData(count?: number)          // Bing 每日壁纸，idx=0~15
getPexelsImagesData(params?)               // Pexels 分页搜索
getPexelsImageById(id: string)
getPexelsImagesBySearch(params)

// 天气（和风天气，需用户配置 API Key）
getCityLookup(location: string)            // 城市搜索
getWeatherNow()                            // 实时天气
getWeatherForecast()                       // 3 日预报
getWeatherAirNow()                         // 实时空气质量
getWeatherWarning()                        // 天气预警
getWeatherIndices()                        // 生活指数（type: 1,3,7,8,10）

// 搜索建议
getSearchSuggestion(engineLabel, suggestUrl, keyword)

// 诗词（token 机制）
getPoetryTokenData()
getTodayPoetryData(token: string)
```

## 搜索建议引擎

| 引擎 | 返回格式 | 解析方式 |
|------|---------|---------|
| Bing / Google / Sogou | `["q", ["词1", ...], ...]` | `data[1]` |
| DuckDuckGo | `[{phrase: "..."}, ...]` | `map → phrase` |
| Yandex | `["q", ["词1", ...]]` | `data[1]` |
| 360 | `{"result": [{"word": "..."}]}` | `map → word` |
| Baidu | `{"g": [{q: "..."}]}` | `map → q` |

无 `suggestUrl` 的引擎（Github/Qwant/Yahoo/自定义）回退到百度。查询词超过 20 字符时跳过请求。Baidu 在代码中有独立的分支处理（不走通用 `suggestUrl` 逻辑）。

## 常见踩坑

- 和风天气 API Key 来自 `localConfig.weather.apiKey`，可能为空（用户未配置）
- Pexels API Key 硬编码在 `src/logic/constants/app.ts` 中
- 搜索建议的 `suggestUrl` 使用 `{query}` 占位符，请求时 `encodeURIComponent(keyword)` 替换
- 诗词 token 有有效期，Widget 中需缓存并处理过期重新获取
- 各 API 的 Endpoint、认证细节见对应源码文件顶部注释
