/**
 * API 层 — 封装所有外部 HTTP 请求（图片 / 天气 / 搜索建议 / 诗词）。
 *
 * 扩展环境下不受 CORS 限制，可直接请求各服务的公开接口。
 * 各接口的 Endpoint、参数含义与认证方式，以对应源文件顶部的文档链接为准。
 */
export * from './image'
export * from './search'
export * from './weather'
export * from './poetry'
