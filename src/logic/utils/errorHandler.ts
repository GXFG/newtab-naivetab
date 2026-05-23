/**
 * @module errorHandler
 * @description 全局错误监听注册器。页面环境通过 window.addEventListener 捕获同步异常和 Promise rejection，
 *   Service Worker 环境通过 globalThis.addEventListener 实现相同功能。Vue 组件通过 onErrorCaptured
 *   捕获渲染/生命周期错误，统一上报到 GA。
 * @dependencies logic/utils/gtag.ts（gaReportError）
 * @consumers newtab/App.vue、popup/App.vue、options/App.vue、contentScripts/index.ts、background/main.ts
 */
import type { App } from 'vue'
import { gaReportError } from '@/logic/utils/gtag'

/**
 * 注册页面级同步异常和 Promise rejection 监听。
 * @param scope 错误 location 前缀，用于标识来源环境
 */
export const registerGlobalErrorHandler = (
  scope: 'newtab' | 'popup' | 'options' | 'content-script',
) => {
  const handleGlobalError = (event: ErrorEvent) => {
    const filename = event.filename ? event.filename.split('/').pop() : ''
    const location = filename
      ? `${scope}/${filename}:${event.lineno}`
      : `${scope}/unknown`
    gaReportError('uncaught', location, event.error || event.message)
  }

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    gaReportError('unhandledrejection', scope, event.reason)
  }

  window.addEventListener('error', handleGlobalError)
  window.addEventListener('unhandledrejection', handleUnhandledRejection)
}

/**
 * 注册 Service Worker 级错误监听（SW 无 window 对象，使用 globalThis）。
 * @param scope 错误 location 前缀
 */
export const registerSWErrorHandler = (scope: 'service-worker') => {
  const handleGlobalError = (event: ErrorEvent) => {
    const filename = event.filename ? event.filename.split('/').pop() : ''
    const location = filename
      ? `${scope}/${filename}:${event.lineno}`
      : `${scope}/unknown`
    gaReportError('uncaught', location, event.error || event.message)
  }

  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    gaReportError('unhandledrejection', scope, event.reason)
  }

  globalThis.addEventListener('error', handleGlobalError)
  globalThis.addEventListener('unhandledrejection', handleUnhandledRejection)
}

/**
 * 注册 Vue 组件层级错误捕获。
 * @param app Vue 应用实例
 * @param scope 错误 location 前缀
 */
export const registerVueErrorHandler = (app: App, scope: string) => {
  app.config.errorHandler = (err, instance, info) => {
    const componentName = instance?.$options?.name || 'unknown-component'
    gaReportError('vue', `${scope}/${componentName}`, err, info)
  }
}
