import type { App, DirectiveBinding } from 'vue'

/**
 * v-lazy 图片懒加载指令。
 * 使用 IntersectionObserver 监听 img 元素，进入视口后才设置 src。
 */
export const vLazy = {
  install(app: App) {
    app.directive('lazy', {
      mounted(el: HTMLImageElement, bindings: DirectiveBinding) {
        const observer = new IntersectionObserver(
          ([{ isIntersecting }]) => {
            if (isIntersecting) {
              observer.unobserve(el)
              el.src = bindings.value
              el.onerror = () => {
                el.src = ''
              }
            }
          },
          { threshold: 0 },
        )
        observer.observe(el)
      },
    })
  },
}
