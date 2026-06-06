/// <reference types="vite/client" />
/// <reference types="user-agent-data-types" />
// window.navigator

declare const __DEV__: boolean
declare const __APP_NAME__: string // Extension name, defined in packageJson.name
declare const __APP_VERSION__: string // Extension version, injected by Vite

interface Window {
  appVersion: string
  __naivetabDebug: boolean
  /**
   * Content Script 初始化标志（涵盖书签快捷键 + 命令快捷键两类功能的完整初始化）
   */
  __naivetabGlobalShortcutInit: boolean
  $t: (key: string) => string
}

type WidgetCodes = import('@/common/widget-constants').WidgetCodes
type ConfigField =
  | WidgetCodes
  | 'general'
  | 'keyboardCommon'
  | 'keyboardBookmark'
  | 'keyboardCommand'
type EleTargetCode = WidgetCodes | 'draft-common'
type EleTargetType = 'widget' | 'draft'

type settingPanes =
  | 'general'
  | 'focusMode'
  | 'keyboardCommon'
  | 'keyboardBookmark'
  | 'bookmarkFolder'
  | 'clockDate'
  | 'calendar'
  | 'yearProgress'
  | 'countdown'
  | 'search'
  | 'weather'
  | 'memo'
  | 'news'
  | 'aboutIndex'
  | 'aboutSponsor'
  | 'keyboardCommand'

type KeydownTaskKey =
  | 'draft-tool'
  | 'keyboardBookmark'
  | 'bookmarkFolder'
  | 'globalShortcut'

type DatabaseHandleType = 'add' | 'put' | 'get' | 'delete'
type DatabaseStore = 'localBackgroundImages' | 'currBackgroundImages'

type DatabaseLocalBackgroundImages = {
  appearanceCode: number
  file: File
  smallBase64: string
}

type OptionsPermission = 'bookmarks' | 'notifications'

type Placement =
  | 'top-start'
  | 'top'
  | 'top-end'
  | 'right-start'
  | 'right'
  | 'right-end'
  | 'bottom-start'
  | 'bottom'
  | 'bottom-end'
  | 'left-start'
  | 'left'
  | 'left-end'

type TDrawerPlacement = 'top' | 'bottom' | 'left' | 'right'
type TPageFocusElement =
  | 'default'
  | 'root'
  | 'search'
  | 'memo'
  | 'keyboardBookmark'

interface SelectStringItem {
  label: string
  value: string
}

/**
 * 同步数据结构
 * ⚠️ 重要：appVersion 字段用于版本感知合并策略，确保多设备多版本场景下配置兼容性
 */
interface SyncPayload {
  syncTime: number
  syncId: string // md5
  appVersion: string // 生成该数据的客户端版本
  data: any
}

/**
 * 单个配置字段的同步状态（持久化到 localStorage 的 l-state）
 */
interface UploadStatusItem {
  loading: boolean
  syncTime: number
  syncId: string
  localModifiedTime: number
  dirty: boolean
  retryCount: number // 当前 session 内自动重试次数（≤3），成功时归零
  lastError: string // 最近一次失败的错误信息（空串表示无失败）
  syncStatus: 'idle' | 'syncing' | 'success' | 'failed' | 'quota-exceeded'
}
