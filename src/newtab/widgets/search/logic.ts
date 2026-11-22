/**
 * @module search/logic
 * @description 搜索地址构建：占位符替换 + 模板合法性判定。
 * @dependencies 无（纯函数）
 * @consumers newtab/widgets/search/index.vue
 * @pitfalls
 *   - 自定义引擎的 urlValue 由用户自由输入，可能不含 {query}。此时直接把关键词丢掉
 *     跳转会变成「静默失败」——用户以为搜索坏了。必须先判定再跳转并给出提示。
 *   - 用 replaceAll 而非 replace：String.replace 只替换第一个匹配，模板里出现两次
 *     {query} 时第二个会原样留在地址里。
 *   - 替换值经过 encodeURIComponent，产物不含 $，因此 replaceAll 不会把替换串里的
 *     $& / $1 当成特殊模式。
 */

/** 查询词占位符（引擎模板与联想地址共用同一标记） */
export const SEARCH_QUERY_PLACEHOLDER = '{query}'

/**
 * 模板是否可用于实际搜索
 *
 * 空字符串同样视为非法：`window.location.href = ''` 会重载当前页，
 * 用户看到的是「点了搜索什么都没发生」。
 */
export const isValidSearchTemplate = (template: string): boolean =>
  typeof template === 'string' &&
  template.trim().length > 0 &&
  template.includes(SEARCH_QUERY_PLACEHOLDER)

/**
 * 把关键词填入模板
 *
 * 返回值不 trim：模板首尾空白交给 URL 解析器处理（无论 `location.href` 赋值还是
 * `chrome.tabs.create`，都按 WHATWG 规则剥离首尾空白与制表/换行），在这里 trim
 * 反而会掩盖用户实际粘贴进来的内容，排查时看不出模板原来长什么样。
 *
 * @returns 合法时返回完整地址；模板非法时返回 `null`，由调用方负责提示用户
 */
export const buildSearchUrl = (
  template: string,
  keyword: string,
): string | null => {
  if (!isValidSearchTemplate(template)) {
    return null
  }
  return template.replaceAll(
    SEARCH_QUERY_PLACEHOLDER,
    encodeURIComponent(keyword),
  )
}
