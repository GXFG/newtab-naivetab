/**
 * @module config/state
 * @description 响应式配置存储 — 基于 useStorageLocal 创建 localConfig / localState，
 *   自动持久化到 localStorage。localConfig 是 Widget 和通用功能配置，localState 是
 *   运行时本地状态（外观、同步状态、专注模式）。
 * @dependencies common/widget-constants.ts（WIDGET_CODE_LIST）、composables/useStorageLocal.ts、
 *   config/defaults.ts（默认值定义）
 * @consumers 几乎所有业务模块
 * @see docs/architecture/config.md#三层配置架构
 */
import type { WidgetConfigByCode } from '@/common/widget-constants'
import { WIDGET_CODE_LIST } from '@/common/widget-constants'
import {
  recoveredStorageKeys,
  useStorageLocal,
} from '@/composables/useStorageLocal'
import { defaultConfig, defaultLocalState } from './defaults'

type LocalConfigRefs = {
  general: ReturnType<typeof useStorageLocal<(typeof defaultConfig)['general']>>
  keyboardCommon: ReturnType<
    typeof useStorageLocal<(typeof defaultConfig)['keyboardCommon']>
  >
  keyboardCommand: ReturnType<
    typeof useStorageLocal<(typeof defaultConfig)['keyboardCommand']>
  >
} & {
  [K in keyof WidgetConfigByCode]: ReturnType<
    typeof useStorageLocal<WidgetConfigByCode[K]>
  >
}

const useWidgetStorageLocal = <K extends keyof WidgetConfigByCode>(key: K) => {
  return useStorageLocal(`c-${key}`, defaultConfig[key])
}

const createLocalConfig = (): LocalConfigRefs => {
  // 逐字段构建后通过 return 处 as LocalConfigRefs 收敛类型，
  // 中间对象用 any 避免逐字段声明类型（builder 模式常见做法）
  const res: any = {}
  res.general = useStorageLocal('c-general', defaultConfig.general)
  res.keyboardCommon = useStorageLocal(
    'c-keyboardCommon',
    defaultConfig.keyboardCommon,
  )
  res.keyboardCommand = useStorageLocal(
    'c-keyboardCommand',
    defaultConfig.keyboardCommand,
  )
  const widgetNames = WIDGET_CODE_LIST
  for (const key of widgetNames) {
    res[key] = useWidgetStorageLocal(key)
  }
  return res as LocalConfigRefs
}

export const localConfig: typeof defaultConfig = reactive(createLocalConfig())

export const localState = useStorageLocal('l-state', defaultLocalState)

/**
 * 内容被写坏、已回落默认值的配置字段：清空其同步状态，让同步层以云端为准回拉。
 *
 * 不清的话 `syncId` 仍等于云端值 → `loadRemoteConfig` 判定「无更新」直接跳过 →
 * 用户的真实配置留在云端没人取回，本地这份默认值还会在下次修改该 section 时被整段
 * 上传，把云端覆盖掉。清空后 `syncId` 与云端不等 → 走合并分支（本地 dirty=false）
 * → 版本相同直接用云端数据 → 再由 handleMissedUploadConfig 愈合上传。
 *
 * 只处理 `c-<field>`：这是配置字段专用前缀（组件/页面级状态用 `data-*` / `l-*`）。
 * 万一将来出现别的 `c-` 键，statusMap 里没有对应项也会被自动跳过。
 * `l-state` 本身损坏时 statusMap 已整体回落默认值（syncId 全为空），
 * 天然走「不一致 → 拉取」路径，不需要额外处理。
 */
for (const storageKey of recoveredStorageKeys) {
  if (!storageKey.startsWith('c-')) continue
  const status =
    localState.value.isUploadConfigStatusMap[storageKey.slice(2) as ConfigField]
  if (!status) continue
  status.syncId = ''
  status.dirty = false
}

/**
 * 强制将 localConfig 中的配置写入 localStorage。
 * 用于 popup 关闭前确保配置持久化，防止快速关闭导致 useStorageLocal 的 800ms 防抖被清除。
 */
export const flushConfigToLocalStorage = () => {
  for (const key of Object.keys(localConfig)) {
    localStorage.setItem(
      `c-${key}`,
      JSON.stringify(localConfig[key as keyof typeof defaultConfig]),
    )
  }
}
