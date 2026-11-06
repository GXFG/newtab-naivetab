/**
 * @module update
 * @description 配置更新与版本迁移入口。updateSetting 合并配置，
 *   handleAppUpdate 负责「判断是否需要升级 → 跑迁移步骤表 → 收尾」。
 *   具体的结构迁移知识在 config/migrations.ts，这里只做编排。
 * @dependencies config/migrations.ts（步骤表）、config/migrate.ts（迁移引擎）、
 *   config/merge.ts（mergeState）、config/version.ts（版本比较）、config/defaults.ts（默认值）、
 *   store/state.ts（globalState）— handleAppUpdate 作为顶层编排器需要控制 changelog 弹窗等 UI 状态，
 *   globalState 在此充当跨层共享状态总线，非纯配置工具依赖 UI 层
 * @pitfalls
 *   - 新增迁移只能加到 MIGRATION_STEPS，不要在这里写 if 分支：
 *     导入路径不经过本文件，写在这里等于只对老用户生效
 *   - 末尾的 updateSetting() 是异步执行（不 await），整理配置结构但不阻塞首屏渲染
 *   - 新增迁移分支时必须同步升 package.json version
 *   - host 提供的旧 localStorage 键读取只对本机升级有意义，导入模式下 host 不注入
 * @see docs/architecture/config.md#配置迁移系统
 * @see .claude/rules/pitfalls-config.md#配置迁移黄金法则
 */
import { showToast } from '@/common/toast'
import { defaultConfig, defaultLocalState } from '@/logic/config/defaults'
import { log } from '@/logic/utils/common'
import { gaProxy } from '@/logic/utils/gtag'
import { globalState } from '@/logic/store/state'
import { mergeState } from './merge'
import { localConfig, localState } from './state'
import { compareLeftVersionLessThanRightVersions } from './version'
import { runMigrations, type ConfigDraft, type MigrationHost } from './migrate'

/**
 * 获取本地版本号
 */
export const getLocalVersion = () => {
  let version = localConfig.general.version
  // 直接读 localStorage 而不是 localConfig：要的是「上次落盘的版本号」，
  // 避免运行期 localConfig.general.version 已被写成本次升级后的值。
  const settingGeneral = localStorage.getItem('c-general')
  if (settingGeneral) {
    try {
      version = JSON.parse(settingGeneral).version
    } catch {
      // 正常走不到这里：useStorageLocal 建 localConfig 时已把损坏内容修复成默认值。
      // 只有那次修复写回也失败（配额写满）才会残留损坏内容，此时退回 localConfig
      // 里的版本号即可 —— 版本号读不出来不该升级成启动期异常。
    }
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
  // 清理已下线字段（不在 defaultConfig 中）的残留状态：
  // 上传链路按 statusMap 的 key 遍历字段，残留项会让 getUploadConfigData() 返回
  // undefined，产出缺少 data 的垃圾 payload 写进 chrome.storage.sync。
  //
  // 注意：这里只清本地状态，不回删 chrome.storage.sync 里的同名键。已下线字段在云端
  // 的残留键会一直占配额，但主动 remove 有「组件临时下线后又回归」的误删风险，
  // 这里选择保守处理 —— 残留键不会再被读写，也不会再产生垃圾 payload。
  const statusMap = localState.value.isUploadConfigStatusMap
  for (const field of Object.keys(statusMap)) {
    if (!Object.prototype.hasOwnProperty.call(defaultConfig, field)) {
      delete statusMap[field as ConfigField]
      log(`isUploadConfigStatusMap remove stale field: ${field}`)
    }
  }

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
      localState.value.isUploadConfigStatusMap[field as ConfigField] = {
        ...defaultStatus,
      }
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
          if ((acceptState[configField] as any)[subField] !== undefined) {
            ;(localConfig[configField] as any)[subField] = mergeState(
              (defaultConfig[configField] as any)[subField],
              (acceptState[configField] as any)[subField],
            )
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
 * 本机升级可用的宿主能力：旧 localStorage 键、localState、更新公告。
 * 导入路径不注入 host，因此这些逻辑对导入天然失效。
 */
const createUpgradeHost = (): MigrationHost => ({
  markBreakingChange: () => {
    localConfig.general.showBreakingChangeNotice = true
  },
  setFocusMode: (value: boolean) => {
    localState.value.isFocusMode = value
  },
  takeLegacyStorage: <T>(key: string): T | undefined => {
    const raw = localStorage.getItem(key)
    if (!raw) return undefined
    // 旧键是历史遗留数据，读坏（手工编辑、写入中断）不能让升级流程整体失败：
    // 此时版本号还没写，异常会在每次启动重复抛出，迁移永远无法完成。
    // 读不出来就当作「没有旧数据」，顺手删掉这条无法使用的残留。
    try {
      const parsed = JSON.parse(raw) as T
      localStorage.removeItem(key)
      return parsed
    } catch (e) {
      log(`Migration: invalid legacy storage "${key}", skip`, e)
      localStorage.removeItem(key)
      return undefined
    }
  },
})

/**
 * 处理应用版本升级迁移
 *
 * @param localVersion 可选，调用方在 setupPageConfigSync 之前快照的本地版本号。
 *   传入此参数可避免 loadRemoteConfig 合并云端数据后 localConfig.general.version
 *   被覆盖导致迁移被跳过。不传则退化为从 getLocalVersion() 读取。
 */
export const handleAppUpdate = (localVersion?: string) => {
  const version = localVersion ?? getLocalVersion()
  log('Version', version)
  if (!compareLeftVersionLessThanRightVersions(version, window.appVersion)) {
    return
  }
  log('Get new version', window.appVersion)
  gaProxy('view', ['version_upgrade'], {
    fromVersion: version,
    toVersion: window.appVersion,
  })

  runMigrations(
    {
      mode: 'upgrade',
      config: localConfig as unknown as ConfigDraft,
      defaults: defaultConfig,
      host: createUpgradeHost(),
    },
    version,
    window.appVersion,
  )

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
