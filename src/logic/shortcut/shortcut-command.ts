/**
 * @module shortcut/shortcut-command
 * @description 全局命令快捷键配置 + 定义。COMMAND_CATEGORIES 是单一数据源，同时携带
 *   命令的执行环境信息（sw/cs/newtab）。SW_COMMANDS / CS_COMMANDS 从中派生。
 *   与 bookmark 共享 Port 通道（name='naivetab-shortcut'），使用不同的修饰键和独立 keymap。
 *   注意：这不是一个 Widget，没有视觉组件，仅有 Setting 面板。
 * @dependencies constants/icons.ts（COMMAND_ICONS）、common/widget-constants.ts（MAX_LAYERS）
 * @consumers shortcut/matcher.ts、shortcut/port.ts、shortcut/shortcut-executor.ts、
 *   background/commands/registry.ts、contentScripts/index.ts
 * @see docs/features/global-shortcut.md
 * @see docs/architecture/messaging.md
 */

import { COMMAND_ICONS } from '@/logic/constants/icons'
import { MAX_LAYERS } from '@/common/widget-constants'
/**
 * 命令执行环境
 * - 'sw'：Service Worker 直接执行（Chrome API 操作）
 * - 'cs'：Content Script 执行（DOM 操作，由 SW 回传 EXECUTE_COMMAND）
 * - 'newtab'：NaiveTab 页面本地执行（localConfig / globalState 操作，CS 侧忽略）
 */
export type TCommandExecEnv = 'sw' | 'cs' | 'newtab'

/**
 * keymap 中的命令条目
 */
export interface TCommandEntry {
  /** 命令唯一标识 */
  command: TCommandName
}

/**
 * 分类内命令条目
 * 默认 execEnv = 'sw'，非 SW 命令需要显式标注 execEnv
 */
export interface TCategoryCommand {
  command: TCommandName
  execEnv?: TCommandExecEnv
  iconName: string
}

/**
 * 命令分类（单一数据源，用于 Setting 面板分组展示）
 * 非 SW 命令需要显式标注 execEnv（'cs' 或 'newtab'），其余默认 'sw'
 */
export const COMMAND_CATEGORIES = [
  {
    categoryKey: 'commandCategory.tabNavigation',
    commands: [
      { command: 'prevTab', iconName: COMMAND_ICONS.prevTab },
      { command: 'nextTab', iconName: COMMAND_ICONS.nextTab },
      { command: 'firstTab', iconName: COMMAND_ICONS.firstTab },
      { command: 'lastTab', iconName: COMMAND_ICONS.lastTab },
      { command: 'lastUsedTab', iconName: COMMAND_ICONS.lastUsedTab },
      { command: 'goBack', iconName: COMMAND_ICONS.goBack },
      { command: 'goForward', iconName: COMMAND_ICONS.goForward },
      { command: 'goHome', iconName: COMMAND_ICONS.goHome },
    ],
  },
  {
    categoryKey: 'commandCategory.tabManagement',
    commands: [
      { command: 'moveTabLeft', iconName: COMMAND_ICONS.moveTabLeft },
      { command: 'moveTabRight', iconName: COMMAND_ICONS.moveTabRight },
      { command: 'newTab', iconName: COMMAND_ICONS.newTab },
      { command: 'newTabAfter', iconName: COMMAND_ICONS.newTabAfter },
      { command: 'closeTab', iconName: COMMAND_ICONS.closeTab },
      { command: 'reopenClosedTab', iconName: COMMAND_ICONS.reopenClosedTab },
      { command: 'toggleTabPinned', iconName: COMMAND_ICONS.toggleTabPinned },
      { command: 'toggleTabMute', iconName: COMMAND_ICONS.toggleTabMute },
      { command: 'duplicateTab', iconName: COMMAND_ICONS.duplicateTab },
    ],
  },
  {
    categoryKey: 'commandCategory.batchClose',
    commands: [
      { command: 'closeLeftTabs', iconName: COMMAND_ICONS.closeLeftTabs },
      { command: 'closeRightTabs', iconName: COMMAND_ICONS.closeRightTabs },
      {
        command: 'closeDuplicateTabs',
        iconName: COMMAND_ICONS.closeDuplicateTabs,
      },
      { command: 'closeOtherTabs', iconName: COMMAND_ICONS.closeOtherTabs },
      { command: 'mergeAllWindows', iconName: COMMAND_ICONS.mergeAllWindows },
    ],
  },
  {
    categoryKey: 'commandCategory.tabGroup',
    commands: [
      { command: 'groupCurrentTab', iconName: COMMAND_ICONS.groupCurrentTab },
      {
        command: 'ungroupCurrentTab',
        iconName: COMMAND_ICONS.ungroupCurrentTab,
      },
      {
        command: 'toggleGroupCollapse',
        iconName: COMMAND_ICONS.toggleGroupCollapse,
      },
      { command: 'closeGroupTabs', iconName: COMMAND_ICONS.closeGroupTabs },
    ],
  },
  {
    categoryKey: 'commandCategory.pageAction',
    commands: [
      {
        command: 'copyPageUrl',
        execEnv: 'cs' as const,
        iconName: COMMAND_ICONS.copyPageUrl,
      },
      {
        command: 'copyPageTitle',
        execEnv: 'cs' as const,
        iconName: COMMAND_ICONS.copyPageTitle,
      },
      {
        command: 'reloadPage',
        execEnv: 'cs' as const,
        iconName: COMMAND_ICONS.reloadPage,
      },
      { command: 'reloadAllTabs', iconName: COMMAND_ICONS.reloadAllTabs },
      {
        command: 'reloadAllTabsAllWindows',
        iconName: COMMAND_ICONS.reloadAllTabsAllWindows,
      },
    ],
  },
  {
    categoryKey: 'commandCategory.windowActions',
    commands: [
      { command: 'closeWindow', iconName: COMMAND_ICONS.closeWindow },
      { command: 'newWindow', iconName: COMMAND_ICONS.newWindow },
      { command: 'newIncognito', iconName: COMMAND_ICONS.newIncognito },
      {
        command: 'moveTabToNextWindow',
        iconName: COMMAND_ICONS.moveTabToNextWindow,
      },
      { command: 'moveToNewWindow', iconName: COMMAND_ICONS.moveToNewWindow },
      {
        command: 'moveWindowToNextDisplay',
        iconName: COMMAND_ICONS.moveWindowToNextDisplay,
      },
    ],
  },
  {
    categoryKey: 'commandCategory.pageScroll',
    commands: [
      {
        command: 'scrollUp',
        execEnv: 'cs' as const,
        iconName: COMMAND_ICONS.scrollUp,
      },
      {
        command: 'scrollDown',
        execEnv: 'cs' as const,
        iconName: COMMAND_ICONS.scrollDown,
      },
      {
        command: 'scrollToTop',
        execEnv: 'cs' as const,
        iconName: COMMAND_ICONS.scrollToTop,
      },
      {
        command: 'scrollToBottom',
        execEnv: 'cs' as const,
        iconName: COMMAND_ICONS.scrollToBottom,
      },
      {
        command: 'scrollPageUp',
        execEnv: 'cs' as const,
        iconName: COMMAND_ICONS.scrollPageUp,
      },
      {
        command: 'scrollPageDown',
        execEnv: 'cs' as const,
        iconName: COMMAND_ICONS.scrollPageDown,
      },
      {
        command: 'scrollLeft',
        execEnv: 'cs' as const,
        iconName: COMMAND_ICONS.scrollLeft,
      },
      {
        command: 'scrollRight',
        execEnv: 'cs' as const,
        iconName: COMMAND_ICONS.scrollRight,
      },
      {
        command: 'scrollToLeft',
        execEnv: 'cs' as const,
        iconName: COMMAND_ICONS.scrollToLeft,
      },
      {
        command: 'scrollToRight',
        execEnv: 'cs' as const,
        iconName: COMMAND_ICONS.scrollToRight,
      },
    ],
  },
  {
    categoryKey: 'commandCategory.switchToPinnedTab',
    commands: [
      {
        command: 'switchToPinnedTab1',
        iconName: COMMAND_ICONS.switchToPinnedTab,
      },
      {
        command: 'switchToPinnedTab2',
        iconName: COMMAND_ICONS.switchToPinnedTab,
      },
      {
        command: 'switchToPinnedTab3',
        iconName: COMMAND_ICONS.switchToPinnedTab,
      },
      {
        command: 'switchToPinnedTab4',
        iconName: COMMAND_ICONS.switchToPinnedTab,
      },
      {
        command: 'switchToPinnedTab5',
        iconName: COMMAND_ICONS.switchToPinnedTab,
      },
      {
        command: 'switchToPinnedTab6',
        iconName: COMMAND_ICONS.switchToPinnedTab,
      },
      {
        command: 'switchToPinnedTab7',
        iconName: COMMAND_ICONS.switchToPinnedTab,
      },
      {
        command: 'switchToPinnedTab8',
        iconName: COMMAND_ICONS.switchToPinnedTab,
      },
      {
        command: 'switchToPinnedTab9',
        iconName: COMMAND_ICONS.switchToPinnedTab,
      },
      {
        command: 'switchToPinnedTabLast',
        iconName: COMMAND_ICONS.switchToPinnedTab,
      },
    ],
  },
  {
    categoryKey: 'commandCategory.naiveTabControl',
    commands: [
      {
        command: 'toggleFocusMode',
        execEnv: 'newtab' as const,
        iconName: COMMAND_ICONS.toggleFocusMode,
      },
      {
        command: 'toggleDragMode',
        execEnv: 'newtab' as const,
        iconName: COMMAND_ICONS.toggleDragMode,
      },
      {
        command: 'toggleSettingDrawer',
        execEnv: 'newtab' as const,
        iconName: COMMAND_ICONS.toggleSettingDrawer,
      },
      {
        command: 'cycleBookmarkLayers',
        execEnv: 'sw' as const,
        iconName: COMMAND_ICONS.switchBookmarkLayer,
      },
      ...Array.from({ length: MAX_LAYERS }, (_, i) => ({
        command: `switchBookmarkLayer${i + 1}` as const,
        execEnv: 'sw' as const,
        iconName: COMMAND_ICONS.switchBookmarkLayer,
      })),
    ],
  },
] as const

/**
 * 从 COMMAND_CATEGORIES 派生的命令名称联合类型。
 * 覆盖所有字符串命令和对象命令的 command 字段。
 */
export type TCommandName =
  (typeof COMMAND_CATEGORIES)[number]['commands'][number]['command']

/**
 * CS 命令名称（与 COMMAND_CATEGORIES 中 execEnv: 'cs' 的条目一致）
 * scroll 系列和 copy 系列只能在 content script 中执行。
 */
type TCsCommandName =
  | 'scrollUp'
  | 'scrollDown'
  | 'scrollToTop'
  | 'scrollToBottom'
  | 'reloadPage'
  | 'copyPageUrl'
  | 'copyPageTitle'
  | 'scrollPageUp'
  | 'scrollPageDown'
  | 'scrollLeft'
  | 'scrollRight'
  | 'scrollToLeft'
  | 'scrollToRight'

/**
 * NaiveTab 页面本地命令（与 COMMAND_CATEGORIES 中 execEnv: 'newtab' 的条目一致）
 * 依赖 localConfig / globalState，只能在 newtab 页面执行；CS 侧静默忽略。
 */
export type TNewtabCommandName =
  | 'toggleFocusMode'
  | 'toggleDragMode'
  | 'toggleSettingDrawer'

/**
 * SW 命令名称（TCommandName 排除 CS 命令和 newtab 命令）
 */
export type TSwCommandName = Exclude<
  TCommandName,
  TCsCommandName | TNewtabCommandName
>

/**
 * 从单一数据源派生 CS 命令列表（运行时值）
 */
export const CS_COMMANDS = COMMAND_CATEGORIES.flatMap((c) =>
  c.commands
    .filter((cmd) => 'execEnv' in cmd && cmd.execEnv === 'cs')
    .map((cmd) => cmd.command),
) as unknown as readonly TCommandName[]

/**
 * NaiveTab 本地命令列表（运行时值）
 */
export const NEWTAB_COMMANDS = COMMAND_CATEGORIES.flatMap((c) =>
  c.commands
    .filter((cmd) => 'execEnv' in cmd && cmd.execEnv === 'newtab')
    .map((cmd) => cmd.command),
) as unknown as readonly TNewtabCommandName[]

/**
 * 从 SW 命令列表派生运行时值
 */
export const SW_COMMANDS = COMMAND_CATEGORIES.flatMap((c) =>
  c.commands
    .filter((cmd) => {
      if (!('execEnv' in cmd)) return true
      return cmd.execEnv !== 'cs' && cmd.execEnv !== 'newtab'
    })
    .map((cmd) => cmd.command),
) as readonly TSwCommandName[]

/**
 * 各执行环境命令实现说明
 *
 * CS 命令（execEnv: 'cs'）：
 *   由 SW 通过 Port 回传 NAIVETAB_EXECUTE_COMMAND，CS 和 NewTab 各自在本地执行器中实现。
 *
 * | 命令            | CS 端实现 | NewTab 端实现 | 差异原因 |
 * |-----------------|-----------|---------------|----------|
 * | scrollUp        | ✅ rAF 循环（按住加速/松开减速） | ❌ 忽略 | NewTab 页面无可滚动内容 |
 * | scrollDown      | ✅ rAF 循环（按住加速/松开减速） | ❌ 忽略 | 同上 |
 * | scrollToTop     | ✅ 200ms ease-out 动画 | ❌ 忽略 | 同上 |
 * | scrollToBottom  | ✅ 200ms ease-out 动画 | ❌ 忽略 | 同上 |
 * | reloadPage      | ✅ location.reload() | ✅ location.reload() | 实现一致 |
 * | copyPageUrl     | ✅ clipboard API + fallback textarea | ✅ clipboard API + showToast | CS 端需 fallback 兼容旧环境 |
 * | copyPageTitle   | ✅ clipboard API + fallback textarea | ✅ clipboard API + showToast | 同上 |
 *
 * NaiveTab 本地命令（execEnv: 'newtab'）：
 *   由 shortcut-executor.ts 中 newtabControlExecutors 直接执行，不经过 SW。
 *   CS 侧收到此类命令时静默忽略（没有 localConfig，无法执行）。
 *   SW 侧收到此类命令时也静默忽略（防御性保护）。
 *
 * | 命令                 | NewTab 端实现          | CS 端实现 |
 * |----------------------|------------------------|-----------|
 * | toggleFocusMode      | ✅ localConfig 切换    | ❌ 忽略   |
 * | toggleDragMode       | ✅ toggleIsDragMode()  | ❌ 忽略   |
 * | toggleSettingDrawer  | ✅ switchSettingDrawerVisible() | ❌ 忽略 |
 *
 * 新增 CS 命令时，必须在此表追加对应行并在 shortcut-executor.ts 的
 * newtabCommandExecutors 中补充实现（或明确标注忽略）。
 * 新增 newtab 命令时，必须同步更新 newtabControlExecutors 和 TNewtabCommandName。
 */

/**
 * 从命令标识推导执行环境
 * 遍历 COMMAND_CATEGORIES 查找，默认返回 'sw'
 */
export function getCommandExecEnv(command: TCommandName): TCommandExecEnv {
  for (const category of COMMAND_CATEGORIES) {
    for (const cmd of category.commands) {
      if (cmd.command === command) {
        return ('execEnv' in cmd ? cmd.execEnv : null) ?? 'sw'
      }
    }
  }
  return 'sw'
}

export type TCommandShortcutConfig =
  typeof import('@/logic/config/defaults').KEYBOARD_COMMAND_CONFIG

/**
 * 支持按键重复（按住持续触发）的命令。
 */
export const REPEATABLE_SCROLL_COMMANDS = new Set([
  'scrollUp',
  'scrollDown',
  'scrollLeft',
  'scrollRight',
] as const)
