/**
 * 将资源路径转换为带 base path 的完整路径
 * 用于 GitHub Pages 部署，base = /newtab-naivetab/
 *
 * normalizedPath 分支并非冗余：当前所有调用方都传前导 /，但 API 不应依赖调用方的
 * 输入格式，保留防御性补全可防止未来新增调用方遗漏前导 / 时出现路径错误。
 */
export function withBase(path: string): string {
  const base = import.meta.env.BASE_URL
  const normalizedBase = base.replace(/\/$/, '')
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${normalizedBase}${normalizedPath}`
}
