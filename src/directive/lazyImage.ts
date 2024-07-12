import { App, DirectiveBinding } from 'vue'

/* eslint-disable no-param-reassign */
export default {
  install(app: App) {
    app.directive('lazy', {
      mounted(el: HTMLImageElement, bindings: DirectiveBinding) {
        // el:dom元素, bindings:指令的值
        const observer = new IntersectionObserver(
          ([{ isIntersecting }]) => {
            if (isIntersecting) {
              // 绑定的 dom 进入可视区域
              observer.unobserve(el)
              el.src = bindings.value
              el.onerror = () => {
                el.src = ''
              }
            }
          },
          {
            threshold: 0,
          },
        )
        // 监视 dom
        observer.observe(el)
      },
    })
  },
}
