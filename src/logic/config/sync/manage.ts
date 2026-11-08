/**
 * @module manage
 * @description 配置的导入/导出/重置用户操作。
 * @dependencies config/migrate.ts（normalizeStructure + runMigrations，与本机升级共用同一条迁移链）、
 *   config/update.ts（updateSetting 写入）
 *   store/state.ts（globalState/switchSettingDrawerVisible）— 导入/导出/重置需要控制 loading 状态和关闭 drawer，
 *   globalState 在此充当跨层共享状态总线，非纯配置工具依赖 UI 层
 * @pitfalls
 *   - importSetting 必须先 normalizeStructure 再 runMigrations（与人升级同一张步骤表），
 *     不能自己写一套兼容逻辑，否则两条路会各自漂移
 *   - importSetting 导入后必须把各字段标记 dirty 并 flush 到云端；不能直接把 syncId
 *     设为本地内容指纹 + 清 dirty（等于谎报已同步，下次启动会被云端旧数据回滚）
 *   - clearStorage / resetSetting 必须 cancelAllDebounce + waitForUploadsIdle 后再清空：
 *     已发出的 chrome.storage.sync.set 不会因 reload 取消，清空后迟到的回调会把旧数据写回
 *   - refreshSetting（刷新配置）调用 clearStorage(false) 保留 data-first 标记
 *   - resetSetting（恢复默认）是彻底清除，包含 chrome.storage.sync + localStorage + IndexedDB
 *   - 导入文件结构非法要给 toast，不能静默 return（用户无法得知失败原因）
 * @see docs/architecture/storage.md#配置导入/导出
 */
import { log, sleep } from '@/logic/utils/common'
import { localConfig, localState } from '@/logic/config/state'
import { globalState, switchSettingDrawerVisible } from '@/logic/store/state'
import { updateSetting } from '@/logic/config/update'
import { defaultConfig } from '@/logic/config/defaults'
import { normalizeStructure, runMigrations } from '@/logic/config/migrate'
import type { ConfigDraft } from '@/logic/config/migrate'
import { compareLeftVersionLessThanRightVersions } from '@/logic/config/version'
import { gaProxy } from '@/logic/utils/gtag'
import { clearDatabase } from '@/logic/utils/database'
import { showToast } from '@/common/toast'
import {
  cancelAllDebounce,
  flushConfigSync,
  waitForUploadsIdle,
} from './upload'

const clearStorage = async (clearAll = false) => {
  showToast.info(
    `${window.$t('generalSetting.clearStorageLabel')} — ${window.$t('prompts.pleaseWait')}`,
  )
  // 取消排队中的防抖上传，防止 localStorage 清空后回调执行时上传脏数据
  cancelAllDebounce()
  // 等待已发出的 chrome.storage.sync.set 回调落盘。set 已交给浏览器进程，
  // reload 不会取消它；若在它回调前清空，迟到的写入会把刚清掉的数据写回来。
  await waitForUploadsIdle()
  await sleep(1000)
  log('Clear localStorage execute')
  localStorage.clear()
  if (!clearAll) {
    localStorage.setItem('data-first', 'false')
  }
  log('Reload page')
  location.reload()
}

export const refreshSetting = async () => {
  globalState.isClearStorageLoading = true
  await updateSetting()
  await clearStorage()
  globalState.isClearStorageLoading = false
}

/**
 * 导入文件的最低结构校验：纯对象 + 非空 general.version。
 * 不能只判断 truthy —— 数组、字符串通过 JSON.parse 后同样为 truthy，
 * 后续 `Object.keys` / `fileContent.general.version` 会静默失败或写坏配置。
 */
const isImportableConfig = (value: unknown): value is typeof defaultConfig => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const general = (value as { general?: unknown }).general
  if (!general || typeof general !== 'object' || Array.isArray(general)) {
    return false
  }
  return Boolean((general as { version?: unknown }).version)
}

export const importSetting = async (text: string) => {
  if (!text) {
    return
  }
  globalState.isImportSettingLoading = true
  let fileContent = null as typeof defaultConfig | null
  try {
    fileContent = JSON.parse(text)
  } catch (e) {
    log('Parse error', e)
    showToast.error(`${window.$t('common.import')}${window.$t('common.fail')}`)
    globalState.isImportSettingLoading = false
    return
  }
  // 结构校验：必须是纯对象且带 general.version（导出文件的基础标识）。
  // 以前这里静默 return，用户选错文件时完全无反馈，只能看到「点了没反应」。
  if (!isImportableConfig(fileContent)) {
    log('Import file invalid', fileContent)
    showToast.error(
      `${window.$t('common.import')}${window.$t('common.fail')} — ${window.$t('generalSetting.importInvalidFile')}`,
    )
    globalState.isImportSettingLoading = false
    return
  }
  log('FileContent', fileContent)
  try {
    const fileVersion = String(fileContent.general.version)

    // 更高版本导出的文件不能导入：当前版本不认识的字段会被 updateSetting 丢弃，
    // 而版本号又会被写成当前版本 —— 再上传云端就成了一次静默降级，会波及同账号其他设备。
    if (
      compareLeftVersionLessThanRightVersions(window.appVersion, fileVersion)
    ) {
      log('Import file from newer version', fileVersion)
      showToast.error(
        `${window.$t('common.import')}${window.$t('common.fail')} — ${window.$t('generalSetting.importNewerVersion')}`,
      )
      globalState.isImportSettingLoading = false
      return
    }

    // 与本机升级共用同一条迁移链：先做键名归一（版本无关、幂等），
    // 再按文件里的版本号跑迁移步骤表。导入不注入 host，
    // 因此旧 localStorage 键、localState、更新公告这些本机副作用不会发生。
    // 其中包含 general.isFocusMode：旧实现会把备份里的专注模式写进 localState，
    // 现在刻意丢弃 —— 导入的是「配置」，不该改变当前窗口的运行时状态。
    const draft = normalizeStructure(fileContent as unknown as ConfigDraft)
    runMigrations(
      { mode: 'import', config: draft, defaults: defaultConfig },
      fileVersion,
      window.appVersion,
    )
    draft.general.version = window.appVersion

    log('FileContentTransform', draft)
    await updateSetting(draft as typeof defaultConfig)

    // 导入必须把新配置推到云端，否则下次启动会被云端旧数据回滚：
    // 若像过去那样把 syncId 直接设为本地内容指纹并清 dirty，等于宣称「本地已与云端一致」，
    // 而云端其实还是旧值；下次 loadRemoteConfig 会判定「本地干净 + 版本相同 → 用云端」，
    // 导入结果被静默覆盖（随后成排的 skip (unchanged) 就是覆盖后指纹又对上了）。
    // 因此这里只置 dirty + 新的 localModifiedTime，syncId 保留原值（= 云端值），
    // 再逐个 flush：内容没变的字段被指纹去重跳过，真正变化（或本地本就领先）的才写入云端。
    const importFields = Object.keys(localConfig) as ConfigField[]
    for (const field of importFields) {
      const status = localState.value.isUploadConfigStatusMap[field]
      if (!status) continue
      // 手动操作重置重试配额，否则 retryCount≥3 的字段导入后仍无法补救上传
      status.retryCount = 0
      status.lastError = ''
      status.syncStatus = 'idle'
      status.dirty = true
      status.localModifiedTime = Date.now()
    }
    // 并行 flush：uploadConfigFn 内部有 100ms 的 UI 节奏延迟，串行 20 个字段会让
    // 导入卡住 2s；各字段状态互相独立，并发写入 chrome.storage.sync 是安全的。
    // 失败字段会保留 dirty=true，由下次启动的 handleMissedUploadConfig 重试。
    // 内容没变的字段会被指纹去重跳过；例外是 MD5 → SHA-256 的过渡期：升级后首次
    // 导入时本地 syncId 还是 32 位 MD5，与 64 位指纹必然不等，因此会每个字段各写一次
    // 云端（约 20 次，远低于 120 次/分钟的限制），之后恢复正常去重。
    await Promise.allSettled(
      importFields.map((field) => flushConfigSync(field)),
    )

    showToast.success(
      `${window.$t('common.import')}${window.$t('common.success')}`,
    )
    gaProxy('click', ['sync', 'import'], { result: 'success' })
    globalState.isImportSettingLoading = false
    switchSettingDrawerVisible(false)
  } catch (e) {
    log('Import error', e)
    showToast.error(
      `${window.$t('common.import')}${window.$t('common.fail')} ${e}`,
    )
    gaProxy('click', ['sync', 'import'], { result: 'failed' })
    globalState.isImportSettingLoading = false
  }
}

const downloadJson = (
  result: { [propName: string]: unknown },
  filename = 'file',
) => {
  const content = JSON.stringify(result, null, 2)
  const blob = new Blob([content], { type: 'text/json' })
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.click()
}

export const exportSetting = () => {
  const filename = `naivetab-v${window.appVersion}-${dayjs().format('YYYYMMDD-HHmmss')}.json`
  downloadJson(localConfig, filename)
  showToast.success(
    `${window.$t('common.export')}${window.$t('common.success')}`,
  )
  gaProxy('click', ['sync', 'export'], { result: 'success' })
}

export const resetSetting = async () => {
  // 与 clearStorage 同理：先掐掉排队中的防抖上传，再等已发出的 set 落盘。
  // 否则 sync.clear() 之后迟到的回调会把旧配置写回云端，表现为「恢复默认后又变回旧配置」。
  cancelAllDebounce()
  await waitForUploadsIdle()
  await chrome.storage.sync.clear()
  localStorage.clear()
  await clearDatabase()
  location.reload()
}
