# API 层

`src/api/` 封装所有外部 HTTP 请求，供 Widget 调用。所有请求通过 `src/lib/request.ts`（基于 axios）统一发送。

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/api/index.ts` | 统一导出所有 API |
| `src/api/image.ts` | Bing 每日壁纸、Pexels 图片搜索 |
| `src/api/weather.ts` | 和风天气（城市搜索、实时天气、3 日预报、空气质量、预警、生活指数） |
| `src/api/search.ts` | 搜索建议（百度、Bing、Google、DuckDuckGo、Sogou、Yandex、360） |
| `src/api/poetry.ts` | 今日诗词 |
| `src/lib/request.ts` | axios 实例，统一请求封装 |

## 请求层

`src/lib/request.ts` 基于 axios 创建实例，处理：
- 超时设置
- 错误拦截
- 响应类型自动推断

扩展环境中不受 CORS 限制，可直接 fetch 各第三方 API。

## 图片 API

### Bing 每日壁纸

```ts
getBingImagesData(count?: number): Promise<{ images: BingImageItem[] }>
```

- **Endpoint**：`https://cn.bing.com/HPImageArchive.aspx?format=js&idx=0&n={count}`
- **参数**：`count` 1~8，最多一次获取 8 张
- `idx=0` 当天，1=昨天，支持 15 天内历史图片

### Pexels 图片

```ts
getPexelsImagesData(params?: { page: number, per_page: number }): Promise<{ photos: PexelsImageItem[] }>
getPexelsImageById(id: string): Promise<PexelsImageItem>
getPexelsImagesBySearch(params: { query: string, page?: number, per_page?: number }): Promise<{ photos: PexelsImageItem[] }>
```

- **认证**：API Key 硬编码在 `PEXELS_API` 常量中（`src/logic/constants/app.ts`）
- **分页**：`per_page` 最大 80
- **本地化**：请求携带 `locale` 参数，跟随 `localConfig.general.lang`

## 天气 API（和风天气）

```ts
getCityLookup(location: string): Promise<{ location: CityItem[] }>     // 城市搜索
getWeatherNow(): Promise<{ now: { temp, text, icon, ... } }>            // 实时天气
getWeatherForecast(): Promise<{ daily: ForecastItem[] }>                // 3 日预报
getWeatherAirNow(): Promise<{ now: { aqi, category, pm2p5, ... } }>     // 实时空气质量
getWeatherWarning(): Promise<{ warning: WarningItem[] }>                // 天气预警
getWeatherIndices(): Promise<any>                                       // 生活指数（type: 1,3,7,8,10）
```

### 认证

- 使用 `localConfig.weather.apiKey` 作为请求密钥
- 用户需要在设置面板中自行配置和风天气 API Key

### 本地化

所有请求携带 `lang` 参数，通过 `WEATHER_LANG_MAP` 将 `localConfig.general.lang` 映射为和风天气支持的语言代码。

### 生活指数类型

`type: '1,3,7,8,10'` 对应：
- `1` = 紫外线指数
- `3` = 穿衣指数
- `7` = 运动指数
- `8` = 洗车指数
- `10` = 感冒指数

## 搜索建议 API

```ts
getSearchSuggestion(
  engineLabel: string,
  suggestUrl: string | undefined,
  keyword: string
): Promise<string[]>
```

### 支持的引擎及解析规则

| 引擎 | 返回格式 | 解析路径 |
|------|---------|---------|
| Bing / Google / Sogou | `["query", ["词1", "词2", ...], ...]` | 取 `data[1]` |
| DuckDuckGo | `[{phrase: "..."}, ...]` | `map(item => item.phrase)` |
| Yandex | `["query", ["词1", "词2", ...]]` | 取 `data[1]` |
| 360 | `{"result": [{"word": "..."}, ...]}` | `map(item => item.word)` |
| Baidu | `{"g": [{q: "..."}, ...]}` | `map(item => item.q)` |

### Fallback 策略

- 无 `suggestUrl` 的引擎（Github/Qwant/Yahoo/自定义）回退到百度
- 查询词超过 20 字符时跳过请求
- 请求失败时返回空数组

### 扩展环境

`src/lib/request.ts` 在浏览器扩展环境中不受 CORS 限制，可以直接请求各搜索引擎的 suggest 接口。

## 诗词 API

```ts
getPoetryTokenData(): Promise<{ status: string, data: string }>       // 获取 token
getTodayPoetryData(token: string): Promise<{ status: string, data: PoetryData }>  // 获取今日诗词
```

- **Endpoint**：`https://v2.jinrishici.com/`
- **认证**：token 机制——先调用 `/token` 获取 token，再在后续请求的 `X-User-Token` 头中携带

## 常见踩坑

### 1. 和风天气 API Key 是用户配置

`localConfig.weather.apiKey` 可能为空（用户未配置），Widget 中调用天气 API 前需要检查。

### 2. Pexels API Key 是硬编码的

`PEXELS_API` 常量存储在 `src/logic/constants/app.ts` 中。如需更换或移除，注意会影响所有用户的壁纸功能。

### 3. 搜索建议的 suggestUrl 模板

`suggestUrl` 中使用 `{query}` 占位符，请求时会被 `encodeURIComponent(keyword)` 替换。不同引擎的 URL 模板在 Widget 配置中定义。

### 4. 诗词 token 有效期

今日诗词的 token 有有效期限制，Widget 中需要缓存并处理 token 过期重新获取的逻辑。
