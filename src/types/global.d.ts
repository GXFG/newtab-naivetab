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

// @@@@ add widget type
type WidgetCodes = 'keyboard' | 'bookmarkFolder' | 'clockDigital' | 'clockAnalog' | 'date' | 'calendar' | 'yearProgress' | 'search' | 'weather' | 'memo' | 'news'
type ConfigField = WidgetCodes | 'general'
type EleTargetCode = WidgetCodes | 'draft-common'
type EleTargetType = 'widget' | 'draft'

type settingPanes = 'general' | 'focusMode' | 'keyboard' | 'bookmarkFolder' | 'clockDate' | 'calendar' | 'yearProgress' | 'search' | 'weather' | 'memo' | 'news' | 'aboutIndex' | 'aboutSponsor'

type KeydownTaskKey = 'keyboard' | 'draft-tool'

type DatabaseHandleType = 'add' | 'put' | 'get' | 'delete'
type DatabaseStore = 'localBackgroundImages' | 'currBackgroundImages'

type DatabaseLocalBackgroundImages = {
  appearanceCode: number
  file: File
  smallBase64: string
}

type OptionsPermission = 'bookmarks'

type Placement = 'top-start' | 'top' | 'top-end' | 'right-start' | 'right' | 'right-end' | 'bottom-start' | 'bottom' | 'bottom-end' | 'left-start' | 'left' | 'left-end'

type TDrawerPlacement = 'top' | 'bottom' | 'left' | 'right'
type TPageFocusElement = 'default' | 'root' | 'search' | 'memo' | 'keyboard'

interface SelectStringItem {
  label: string
  value: string
}
