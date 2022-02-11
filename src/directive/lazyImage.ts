export default {
  install(app: any) {
    app.directive('lazy', {
      mounted(el: any, bindings: any) {
        // el:dom元素, bindings:指令的值
        const observer = new IntersectionObserver(([{ isIntersecting }]) => {
          if (isIntersecting) {
            // 绑定的 dom 进入可视区域
            observer.unobserve(el)
            el.src = bindings.value
            el.onerror = () => {
              el.src = ''
            }
          }
        }, {
          threshold: 0,
        })
        // 监视 dom
        observer.observe(el)
      },
    })
  },
}
