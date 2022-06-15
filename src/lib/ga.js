(function () {
  var ga = document.createElement('script')
  ga.type = 'text/javascript'
  ga.async = true
  ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-HHNXF3XD8W'
  var head = document.getElementsByTagName('head')[0]
  head.appendChild(ga)

  window.dataLayer = window.dataLayer || []
  function gtag() {
    dataLayer.push(arguments)
  }
  gtag('js', new Date())
  gtag('config', 'G-HHNXF3XD8W')
  gtag('event', 'hello-world', {
    'test': true
  })
})()
