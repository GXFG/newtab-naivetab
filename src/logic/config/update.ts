/**
 * @module update
 * @description 配置更新与版本迁移。updateSetting 合并配置，handleAppUpdate 处理跨版本数据结构迁移。
 * @dependencies config/merge.ts（mergeState）、config/version.ts（版本比较）、config/defaults.ts（默认值）
 * @consumers config/sync/loader.ts（拉取后调用 updateSetting）、SW init-guard（启动时 handleAppUpdate）
 * @pitfalls
 *   - handleAppUpdate 使用 if 而非 if-else，确保跨越多个版本的旧用户能依次执行所有迁移
 *   - 末尾的 updateSetting() 是异步执行（不 await），整理配置结构但不阻塞首屏渲染
 *   - 新增迁移分支时必须同步升 package.json version
 * @see docs/architecture/config.md#配置迁移系统
 * @see .claude/rules/pitfalls.md#配置迁移黄金法则
 */
import { showToast } from '@/common/toast'
import {
  defaultConfig,
  defaultLocalState,
  defaultFocusVisibleWidgetMap,
} from '@/logic/config/defaults'
import { log } from '@/logic/utils/common'
import {
  type WidgetCodes,
  MAX_LAYERS,
  BookmarkSource,
} from '@/common/widget-constants'
import { DEFAULT_LAYER_SOURCE_FOLDER } from '@/logic/keyboard/keyboard-constants'
import { globalState } from '@/logic/store/state'
import { mergeState } from './merge'
import { localConfig, localState } from './state'
import { compareLeftVersionLessThanRightVersions } from './version'

/**
 * 获取本地版本号
 */
export const getLocalVersion = () => {
  let version = localConfig.general.version
  const settingGeneral = localStorage.getItem('c-general')
  if (settingGeneral) {
    version = JSON.parse(settingGeneral).version
  }
  return version || '0'
}

/**
 * 更新成功通知
 */
const updateSuccess = () => {
  showToast.success(
    `${window.$t('common.update')}${window.$t('common.success')} — V${window.appVersion}`,
  )
}

/**
 * 同步状态映射表增量更新
 *
 * 当新增 Widget 后，为 isUploadConfigStatusMap 增量添加新增字段的默认状态
 * 避免全量重置导致丢失已有字段的同步状态（dirty, syncTime, syncId 等）
 */
export const handleStateResetAndUpdate = () => {
  // 遍历默认状态，增量添加缺失的字段
  for (const [field, defaultStatus] of Object.entries(
    defaultLocalState.isUploadConfigStatusMap,
  )) {
    if (
      !Object.prototype.hasOwnProperty.call(
        localState.value.isUploadConfigStatusMap,
        field,
      )
    ) {
      localState.value.isUploadConfigStatusMap[field] = { ...defaultStatus }
      log(`isUploadConfigStatusMap add field: ${field}`)
    }
  }
}

/**
 * 处理新增配置，并删除无用旧配置。默认 acceptState 不传递时为刷新配置数据结构
 * 以 defaultConfig 为模板与 acceptState 进行去重合并
 */
export const updateSetting = (
  acceptRawState = localConfig,
): Promise<boolean> => {
  const acceptState = acceptRawState
  return new Promise((resolve) => {
    try {
      // 只处理存在于 acceptState 中的配置字段，减少不必要的处理
      const configFields = Object.keys(defaultConfig).filter((field) =>
        Object.prototype.hasOwnProperty.call(acceptState, field),
      ) as ConfigField[]

      for (const configField of configFields) {
        // 获取需要更新的子字段
        const subFields = Object.keys(defaultConfig[configField])

        // 批量处理子字段，减少循环内的操作
        for (const subField of subFields) {
          if (acceptState[configField][subField] !== undefined) {
            localConfig[configField][subField] = mergeState(
              defaultConfig[configField][subField],
              acceptState[configField][subField],
            )
            // console.log(`${configField}-${subField}`, localConfig[configField][subField], '=', defaultConfig[configField][subField], '<-', acceptState[configField][subField])
          }
        }
      }

      log('UpdateSetting', localConfig)
      resolve(true)
    } catch (e) {
      log('updateSetting error', e)
      resolve(false)
    }
  })
}

/**
 * 处理应用版本升级迁移
 */
export const handleAppUpdate = () => {
  const version = getLocalVersion()
  log('Version', version)
  if (!compareLeftVersionLessThanRightVersions(version, window.appVersion)) {
    return
  }
  log('Get new version', window.appVersion)
  // @@@@ 更新localConfig后需要手动处理新版本变更的本地数据结构
  if (compareLeftVersionLessThanRightVersions(version, '1.20.0')) {
    const keymapLength = Object.keys(localConfig.keyboardBookmark.keymap).length
    localConfig.keyboardBookmark.source =
      keymapLength === 0 ? BookmarkSource.BROWSER : BookmarkSource.INTERNAL
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.21.0')) {
    localConfig.search.isNewTabOpen = false
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.23.1')) {
    localConfig.clockDigital.width = localConfig.clockDigital.fontSize / 2 + 8
    const clockDigitalConfig =
      localConfig.clockDigital as typeof localConfig.clockDigital & {
        letterSpacing?: number
      }
    delete clockDigitalConfig.letterSpacing
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.24.0')) {
    localConfig.general.timeLang = localConfig.general.lang
    localConfig.yearProgress = defaultConfig.yearProgress
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.24.3')) {
    localConfig.general.backgroundColor = structuredClone(
      defaultConfig.general.backgroundColor,
    )
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.25.9')) {
    localConfig.calendar.festivalCountdown = true
  }
  if (compareLeftVersionLessThanRightVersions(version, '1.27.0')) {
    localState.value.isFocusMode = false
    localConfig.general.focusVisibleWidgetMap = defaultFocusVisibleWidgetMap
    if (
      (localConfig.general.openPageFocusElement as any) === 'bookmarkKeyboard'
    ) {
      localConfig.general.openPageFocusElement = 'keyboardBookmark'
    }
    localConfig.calendar.backgroundBlur = defaultConfig.calendar.backgroundBlur
    localConfig.memo.backgroundBlur = defaultConfig.memo.backgroundBlur
    localConfig.news.backgroundBlur = defaultConfig.news.backgroundBlur
    localConfig.search.backgroundBlur = defaultConfig.search.backgroundBlur
    localConfig.yearProgress.backgroundBlur =
      defaultConfig.yearProgress.backgroundBlur
    localConfig.bookmarkFolder.enabled = false
  }
  if (compareLeftVersionLessThanRightVersions(version, '2.0.0')) {
    localConfig.clockFlip.enabled = false
  }
  if (compareLeftVersionLessThanRightVersions(version, '2.2.0')) {
    localConfig.keyboardBookmark.isGlobalShortcutEnabled =
      (localConfig.keyboardBookmark as any).isListenBackgroundKeystrokes ?? true
    // 全局快捷键架构变更（浏览器原生 → 扩展内部控制），老用户需重新配置修饰键
    // 修饰键从字符串改为数组的迁移在 handleStateResetAndUpdate 中处理
    localConfig.general.showBreakingChangeNotice = true
    // 通用 widget 字体改为系统字体栈
    const configList = [
      'general',
      'memo',
      'yearProgress',
      'calendar',
      'bookmarkFolder',
      'search',
      'news',
    ] as WidgetCodes[]
    for (const code of configList) {
      const config = localConfig[code] as any
      if (config.fontFamily === 'Arial') {
        config.fontFamily = 'system'
      }
    }
    // calendar 有额外字段
    if (localConfig.calendar.dayFontFamily === 'Arial') {
      localConfig.calendar.dayFontFamily = 'system'
    }
    if (localConfig.calendar.descFontFamily === 'Arial') {
      localConfig.calendar.descFontFamily = 'system'
    }
  }
  if (compareLeftVersionLessThanRightVersions(version, '2.2.2')) {
    localConfig.general.focusVisibleWidgetMap = defaultFocusVisibleWidgetMap
    // openPageFocusElement 修正
    if ((localConfig.general.openPageFocusElement as any) === 'keyboard') {
      localConfig.general.openPageFocusElement = 'keyboardBookmark'
    }
    // keyboard → keyboardBookmark
    const localKeyboardData = localStorage.getItem('c-keyboard')
    if (localKeyboardData) {
      const localKeyboardConfig = JSON.parse(localKeyboardData)
      const keyboardBookmarkFields = Object.keys(defaultConfig.keyboardBookmark)
      for (const field of keyboardBookmarkFields) {
        localConfig.keyboardBookmark[field] = localKeyboardConfig[field]
      }

      const keyboardCommonFields = Object.keys(defaultConfig.keyboardCommon)
      for (const field of keyboardCommonFields) {
        localConfig.keyboardCommon[field] = localKeyboardConfig[field]
      }
      localStorage.removeItem('c-keyboard')
    }
    // commandShortcut → keyboardCommand
    const localCommandShortcutData = localStorage.getItem('c-commandShortcut')
    if (localCommandShortcutData) {
      const localCommandShortcutConfig = JSON.parse(localCommandShortcutData)
      const keyboardCommandFields = Object.keys(defaultConfig.keyboardCommand)
      for (const field of keyboardCommandFields) {
        localConfig.keyboardCommand[field] = localCommandShortcutConfig[field]
      }
      localStorage.removeItem('c-commandShortcut')
    }

    /**
     * isFocusMode 从 localConfig.general（云同步）迁移到 localState（仅本地）
     * 保留用户当前的专注模式状态，不重置为 false
     */
    const oldFocusMode = (localConfig.general as any).isFocusMode
    if (oldFocusMode !== undefined) {
      localState.value.isFocusMode = oldFocusMode
      delete (localConfig.general as any).isFocusMode
    }
  }
  if (compareLeftVersionLessThanRightVersions(version, '2.3.1')) {
    // 无修饰键模式：默认关闭
    if (typeof localConfig.keyboardCommand.noModifierMode !== 'boolean') {
      localConfig.keyboardCommand.noModifierMode = false
    }
    if (typeof localConfig.keyboardBookmark.noModifierMode !== 'boolean') {
      localConfig.keyboardBookmark.noModifierMode = false
    }
    // 移除键盘键帽 / 定位板的 backdrop-filter blur 配置（性能优化，改为纯 CSS 实现）
    delete (localConfig.keyboardCommon as any).keycapBackgroundBlur
    delete (localConfig.keyboardCommon as any).plateBackgroundBlur
  }
  if (compareLeftVersionLessThanRightVersions(version, '2.3.2')) {
    localConfig.general.showBreakingChangeNotice = true
    // 新增书签层功能，初始化默认 4 层配置（第 0 层默认为 DEFAULT_LAYER_SOURCE_FOLDER，与导出路径一致）
    localConfig.keyboardBookmark.layers = Array.from(
      { length: MAX_LAYERS },
      (_, i) => ({
        sourceFolderPath: i === 0 ? DEFAULT_LAYER_SOURCE_FOLDER : '',
      }),
    )
    // 移除顺序模式，统一为 [X] 前缀精确绑定，引导用户使用「文件夹书签」Widget
    delete (localConfig.keyboardBookmark as any).defaultExpandFolder
    // 背景图配置重构：backgroundImageNames 从字符串数组改为对象数组，backgroundNetworkSourceType 废弃
    const oldNames = (localConfig.general as any).backgroundImageNames
    if (Array.isArray(oldNames) && typeof oldNames[0] === 'string') {
      const networkSourceType = (localConfig.general as any)
        .backgroundNetworkSourceType
      localConfig.general.backgroundImageList = oldNames.map(
        (name: string) => ({
          networkSourceType: networkSourceType,
          name,
        }),
      )
    }
    delete (localConfig.general as any).backgroundImageNames
    delete (localConfig.general as any).backgroundNetworkSourceType
  }

  // 更新local版本号
  localConfig.general.version = window.appVersion
  if (localConfig.general.showBreakingChangeNotice) {
    globalState.isChangelogModalVisible = true
  }
  updateSuccess()

  // 异步刷新配置数据结构，不阻塞首屏渲染
  // updateSetting 会整理配置结构、补充缺失字段、删除废弃字段
  // 这些修改会触发 watch，但属于后台操作，不应阻塞初始化流程
  updateSetting()
}
