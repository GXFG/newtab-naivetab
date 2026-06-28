/**
 * @module useTheme
 * 深浅模式管理 — 单例状态，通过 localStorage 持久化，fallback 到系统偏好。
 *
 * main.ts 在 app.mount 前调用 initTheme() 防止首屏闪烁；
 * Navbar 通过 useTheme() 获取 isDark 和 toggleTheme 渲染切换按钮。
 */

import { ref } from 'vue'

const STORAGE_KEY = 'naivetab-site-theme'

/** 模块级单例，多个调用方共享同一状态 */
const isDark = ref(false)

/**
 * 将当前主题应用到 <html> 的 .dark class
 * 在 main.ts 的 app.mount 前调用，避免深/浅切换闪烁
 */
function applyTheme(dark: boolean): void {
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
}

/**
 * 初始化主题：localStorage > prefers-color-scheme > 默认浅色
 * 仅在 main.ts 中调用一次
 */
export function initTheme(): void {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'dark' || stored === 'light') {
      applyTheme(stored === 'dark')
      return
    }
  } catch {
    // localStorage 不可用时静默降级
  }
  applyTheme(window.matchMedia('(prefers-color-scheme: dark)').matches)
}

/** 切换深浅模式并持久化 */
function toggleTheme(): void {
  const next = !isDark.value
  applyTheme(next)
  try {
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
  } catch {
    // localStorage 不可用时静默降级
  }
}

/**
 * 供组件使用的主题 composable
 * @returns isDark - 当前是否深色模式（响应式）
 * @returns toggleTheme - 切换深浅模式
 */
export function useTheme() {
  return { isDark, toggleTheme }
}
