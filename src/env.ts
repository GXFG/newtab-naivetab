const forbiddenProtocols = ['chrome-extension://', 'chrome-search://', 'chrome://', 'devtools://', 'edge://', 'https://chrome.google.com/webstore']

export function isForbiddenUrl(url: string): boolean {
  return forbiddenProtocols.some((protocol) => url.startsWith(protocol))
}

export const isMacOS = navigator.userAgent.includes('Mac OS')

export const isFirefox = navigator.userAgent.includes('Firefox')
export const isChrome = navigator.userAgent.includes('Chrome')
export const isEdge = navigator.userAgent.includes('Edg')
