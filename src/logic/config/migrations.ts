/**
 * @module migrations
 * @description 版本迁移步骤表 —— 「配置结构如何随版本演进」的唯一一份知识。
 *   本机升级（handleAppUpdate）与导入备份（importSetting）共用这张表，
 *   区别只在于 ctx.mode 与是否注入 ctx.host。
 * @dependencies config/defaults.ts（默认值）、common/widget-constants.ts（枚举与层数）、
 *   keyboard/keyboard-constants.ts（默认层目录）
 * @pitfalls
 *   - 步骤必须按 version 严格升序排列，后一步可以依赖前一步的结构（有单测保证）
 *   - 步骤只许读写 ctx.config；禁止 import localConfig / localState，
 *     需要本机副作用时走 ctx.host（导入模式下 host 不存在，这类逻辑自动跳过）
 *   - 步骤不写版本号、不弹 toast、不记统计 —— 这些属于入口收尾
 *   - 缺字段不要在这里赋值，交给 updateSetting 的 mergeState 补默认；
 *     只有「必须与默认值解耦」的字段（如 2.7.0 的日历订阅）才显式写默认值
 *   - 删除字段一定要写 delete：漏掉的老字段会被当作合法数据继续往上传播
 * @see docs/architecture/config.md#配置迁移系统
 */

import { BookmarkSource, MAX_LAYERS } from '@/common/widget-constants'
import {
  defaultConfig,
  defaultFocusVisibleWidgetMap,
} from '@/logic/config/defaults'
import { DEFAULT_LAYER_SOURCE_FOLDER } from '@/logic/keyboard/keyboard-constants'
import type { MigrationStep } from './migrate'

/** 2.2.0 把字体从 Arial 改为系统字体栈，涉及这些 section */
const FONT_FAMILY_SECTIONS = [
  'general',
  'memo',
  'yearProgress',
  'calendar',
  'bookmarkFolder',
  'search',
  'news',
]

/** 1.27.0 统一重置 backgroundBlur 的 section */
const BACKGROUND_BLUR_SECTIONS = [
  'calendar',
  'memo',
  'news',
  'search',
  'yearProgress',
]

export const MIGRATION_STEPS: MigrationStep[] = [
  {
    version: '1.20.0',
    summary: '键盘书签为空时回退为浏览器书签来源',
    apply({ config }) {
      const keymapLength = Object.keys(
        config.keyboardBookmark.keymap ?? {},
      ).length
      config.keyboardBookmark.source =
        keymapLength === 0 ? BookmarkSource.BROWSER : BookmarkSource.INTERNAL
    },
  },
  {
    version: '1.21.0',
    summary: '搜索改为当前标签页打开',
    apply({ config }) {
      config.search.isNewTabOpen = false
    },
  },
  {
    version: '1.23.1',
    summary: '数字时钟宽度改由字号推导，移除 letterSpacing',
    apply({ config }) {
      config.clockDigital.width = config.clockDigital.fontSize / 2 + 8
      delete config.clockDigital.letterSpacing
    },
  },
  {
    version: '1.24.0',
    summary: '时间语言独立于界面语言，年进度配置重建',
    apply({ config }) {
      config.general.timeLang = config.general.lang
      // 结构整体重建：用默认值而不是逐个字段迁移
      config.yearProgress = structuredClone(defaultConfig.yearProgress)
    },
  },
  {
    version: '1.24.3',
    summary: '背景色改用默认色板',
    apply({ config }) {
      config.general.backgroundColor = structuredClone(
        defaultConfig.general.backgroundColor,
      )
    },
  },
  {
    version: '1.25.9',
    summary: '日历默认显示节日倒计时',
    apply({ config }) {
      config.calendar.festivalCountdown = true
    },
  },
  {
    version: '1.27.0',
    summary: '专注模式迁出配置，聚焦元素与背景模糊配置重建',
    apply({ config, host, mode, defaults }) {
      // isFocusMode 从 localConfig 迁到 localState；导入的配置文件不该控制本机运行时状态
      host?.setFocusMode(false)
      // 整表重建只对本机升级有意义：旧数据的 key 是旧 widget code（keyboard 等），
      // 值已经无法解释。导入的备份在 normalizeStructure 里已完成键名修正，
      // 再重置一次等于抹掉用户的专注模式可见性设置。
      if (mode === 'upgrade') {
        config.general.focusVisibleWidgetMap = structuredClone(
          defaultFocusVisibleWidgetMap,
        )
      }
      if (config.general.openPageFocusElement === 'bookmarkKeyboard') {
        config.general.openPageFocusElement = 'keyboardBookmark'
      }
      const defaultSections = defaults as Record<string, any>
      for (const section of BACKGROUND_BLUR_SECTIONS) {
        config[section].backgroundBlur = structuredClone(
          defaultSections[section].backgroundBlur,
        )
      }
      config.bookmarkFolder.enabled = false
    },
  },
  {
    version: '2.0.0',
    summary: '翻页时钟默认关闭',
    apply({ config }) {
      config.clockFlip.enabled = false
    },
  },
  {
    version: '2.2.0',
    summary: '全局快捷键改为扩展内部控制，字体改为系统字体栈',
    apply({ config, host }) {
      config.keyboardBookmark.isGlobalShortcutEnabled =
        config.keyboardBookmark.isListenBackgroundKeystrokes ?? true
      // 破坏性变更：需要向用户展示更新公告（仅本机升级）
      host?.markBreakingChange()
      for (const section of FONT_FAMILY_SECTIONS) {
        if (config[section].fontFamily === 'Arial') {
          config[section].fontFamily = 'system'
        }
      }
      if (config.calendar.dayFontFamily === 'Arial') {
        config.calendar.dayFontFamily = 'system'
      }
      if (config.calendar.descFontFamily === 'Arial') {
        config.calendar.descFontFamily = 'system'
      }
    },
  },
  {
    version: '2.2.2',
    summary:
      'keyboard 拆分落地：旧 localStorage 键合并、聚焦元素修正、isFocusMode 迁出',
    apply({ config, host, mode, defaults }) {
      // 同 1.27.0：整表重建只针对本机升级的旧 code，导入已归一过，重置会丢设置
      if (mode === 'upgrade') {
        config.general.focusVisibleWidgetMap = structuredClone(
          defaultFocusVisibleWidgetMap,
        )
      }
      if (config.general.openPageFocusElement === 'keyboard') {
        config.general.openPageFocusElement = 'keyboardBookmark'
      }

      // 旧 localStorage 键只在本机升级时存在，导入的备份文件里不可能有。
      // 逐字段挑着拷（而不是按默认字段全量赋值）是必须的：c-keyboard 是 2.2.2 之前的
      // 存储格式，2.2.0 才新增的 isGlobalShortcutEnabled 在里面并不存在。
      // 全量赋值会把它写成 undefined —— 既覆盖上一步（2.2.0）刚算好的值，又会被
      // updateSetting 跳过（undefined 不参与 mergeState），最终在下次启动时被默认值顶掉。
      // 「旧键是原始类型/数组」的脏数据由 typeof 判断挡住（`in` 作用在原始类型上会抛错）。
      const legacyKeyboard =
        host?.takeLegacyStorage<Record<string, unknown>>('c-keyboard')
      if (legacyKeyboard && typeof legacyKeyboard === 'object') {
        for (const section of ['keyboardBookmark', 'keyboardCommon'] as const) {
          const target = config[section]
          if (!target || typeof target !== 'object') continue
          for (const field of Object.keys(defaults[section])) {
            if (field in legacyKeyboard) target[field] = legacyKeyboard[field]
          }
        }
      }
      const legacyCommand =
        host?.takeLegacyStorage<Record<string, unknown>>('c-commandShortcut')
      if (legacyCommand && typeof legacyCommand === 'object') {
        for (const field of Object.keys(defaults.keyboardCommand)) {
          if (field in legacyCommand) {
            config.keyboardCommand[field] = legacyCommand[field]
          }
        }
      }

      // isFocusMode 迁到 localState：本机升级保留用户当前状态，导入则直接丢弃该字段
      const oldFocusMode = config.general.isFocusMode
      if (oldFocusMode !== undefined) {
        host?.setFocusMode(oldFocusMode)
        delete config.general.isFocusMode
      }
    },
  },
  {
    version: '2.3.1',
    summary: '无修饰键模式默认关闭，移除键帽/定位板的 blur 配置',
    apply({ config }) {
      if (typeof config.keyboardCommand.noModifierMode !== 'boolean') {
        config.keyboardCommand.noModifierMode = false
      }
      if (typeof config.keyboardBookmark.noModifierMode !== 'boolean') {
        config.keyboardBookmark.noModifierMode = false
      }
      delete config.keyboardCommon.keycapBackgroundBlur
      delete config.keyboardCommon.plateBackgroundBlur
    },
  },
  {
    version: '2.3.2',
    summary: '书签层功能上线，背景图配置重构为对象数组',
    apply({ config, host }) {
      host?.markBreakingChange()
      // 第 0 层默认为 DEFAULT_LAYER_SOURCE_FOLDER，与导出路径一致
      config.keyboardBookmark.layers = Array.from(
        { length: MAX_LAYERS },
        (_, index) => ({
          sourceFolderPath: index === 0 ? DEFAULT_LAYER_SOURCE_FOLDER : '',
        }),
      )
      delete config.keyboardBookmark.defaultExpandFolder

      const oldNames = config.general.backgroundImageNames
      if (Array.isArray(oldNames) && typeof oldNames[0] === 'string') {
        const networkSourceType = config.general.backgroundNetworkSourceType
        config.general.backgroundImageList = oldNames.map((name: string) => ({
          networkSourceType,
          name,
        }))
      }
      delete config.general.backgroundImageNames
      delete config.general.backgroundNetworkSourceType
    },
  },
  {
    version: '2.5.0',
    summary: '键盘铭牌功能移除',
    apply({ config }) {
      config.keyboardCommon.nameplates = []
    },
  },
  {
    version: '2.5.2',
    summary: '键盘开关字段补齐，便签内边距重设',
    apply({ config }) {
      config.keyboardBookmark.isEnabled =
        config.keyboardBookmark.isEnabled ?? true
      config.keyboardCommand.isGlobalShortcutEnabled =
        config.keyboardCommand.isGlobalShortcutEnabled ?? true
      config.memo.padding = structuredClone(defaultConfig.memo.padding)
    },
  },
  {
    version: '2.6.0',
    summary: '缩放与主色/背景色自动推导上线，流光背景默认参数',
    apply({ config }) {
      config.general.scaleMode = 'auto'
      config.general.isAutoPrimaryColor = false
      config.general.isAutoBackgroundColor = false
      config.general.shimmerBackgroundEffect =
        config.general.shimmerBackgroundEffect ?? 'aurora'
      config.general.shimmerBackgroundColors = config.general
        .shimmerBackgroundColors ?? [
        ['#D1ADFF', '#98D69B', '#FAE390', '#FFACD8', '#7DD5FF', '#C8E6C9'],
        ['#6B4FAE', '#4A7A4D', '#B8A050', '#B06080', '#4080A0', '#4A6F5A'],
      ]
      config.general.shimmerAnimationSpeed =
        config.general.shimmerAnimationSpeed ?? 1
    },
  },
  {
    version: '2.6.2',
    summary: '统计数据开关默认开启',
    apply({ config }) {
      config.general.isGaEnabled = config.general.isGaEnabled ?? true
    },
  },
  {
    version: '2.7.0',
    summary: '日历节假日改为订阅驱动，补齐订阅相关字段',
    apply({ config, defaults }) {
      // 这些字段对 2.6.x 用户尚不存在（浅合并也会补默认值），仍显式赋值：
      // 把「升级后的行为」与「默认值」解耦，以后调整默认值不会顺带改变老用户体验。
      //
      // holidayRegion 是 2.7.0 开发期用过、从未发布的字段，这里刻意不做映射/删除，
      // 残留值不会影响 subscriptionRegion（见 calendar-config-compat.test.ts）。
      config.calendar.subscriptionRegion = defaults.calendar.subscriptionRegion
      config.calendar.customSubscriptionUrl =
        defaults.calendar.customSubscriptionUrl
      config.calendar.isHolidayMarkVisible =
        defaults.calendar.isHolidayMarkVisible
      config.calendar.isLunarTermVisible = defaults.calendar.isLunarTermVisible
      config.calendar.isAlmanacVisible = defaults.calendar.isAlmanacVisible
    },
  },
]
