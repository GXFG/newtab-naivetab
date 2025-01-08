/// <reference types="vite/client" />
/// <reference types="user-agent-data-types" />
// window.navigator

declare const __DEV__: boolean
declare const __NAME__: string //  Extension name, defined in packageJson.name

interface Window {
  appVersion: string
  $t: (key: string) => string
  $message: MessageApiInjection
  $notification: NotificationApiInjection
  $dialog: DialogApiInjection
  $loadingBar: LoadingBarApiInjection
}

// @@@@ add Components 1
type Components = 'bookmark' | 'clockDigital' | 'clockAnalog' | 'date' | 'calendar' | 'yearProgress' | 'search' | 'weather' | 'memo' | 'news'
type ConfigField = Components | 'general'

type DatabaseHandleType = 'add' | 'put' | 'get' | 'delete'
type DatabaseStore = 'localBackgroundImages' | 'currBackgroundImages'

type DatabaseLocalBackgroundImages = {
  appearanceCode: number
  file: File
  smallBase64: string
}

type OptionsPermission = 'bookmarks'

type TargetType = 1 | 2 // 1:component 2:element
type Placement = 'top' | 'bottom' | 'left' | 'right'

interface SelectStringItem {
  label: string
  value: string
}
