const _AnalyticsCode = 'UA-214270103-1'

const _gaq = window._gaq || [];
window._gaq = _gaq
_gaq.push(['_setAccount', _AnalyticsCode]);
_gaq.push(['_trackPageview']);

(function () {
  const ga = document.createElement('script');
  ga.type = 'text/javascript';
  ga.async = true;
  ga.src = 'https://ssl.google-analytics.com/ga.js';
  const s: any = document.getElementsByTagName('script')[0];
  s.parentNode.insertBefore(ga, s);
})();

// (function () {
//   var ga = document.createElement('script')
//   ga.type = 'text/javascript'
//   ga.async = true
//   ga.src = 'https://www.googletagmanager.com/gtag/js?id=G-HHNXF3XD8W'
//   var head = document.getElementsByTagName('head')[0]
//   head.appendChild(ga)

//   window.dataLayer = window.dataLayer || []
//   function gtag() {
//     window.dataLayer.push(arguments)
//   }
//   gtag('js', new Date())
//   gtag('config', 'G-HHNXF3XD8W')
//   gtag('event', 'search', {
//     search_term: '1234'
//   });
// })()
