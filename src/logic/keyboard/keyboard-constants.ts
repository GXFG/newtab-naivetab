/**
 * @module keyboard/keyboard-constants
 * @description 键盘系统常量：强调键集合、按键码列表、默认配置映射、UI 选择器选项、
 *   书签相关常量（文件夹名、导出标记、层数）。
 * @dependencies common/widget-constants.ts（MAX_LAYERS、LAYER_FOLDER_NAMES）
 * @consumers keyboard/keyboard-layout.ts、keyboard/bookmark-state.ts、keyboard/bookmark-export.ts
 * @see docs/features/keyboard.md
 */
import { isMacOS } from '@/env'
import { LAYER_FOLDER_NAMES } from '@/common/widget-constants'

// ── 公共强调键集合 ─────────────────────────
/** 一级强调键：功能键区 + 修饰键 + 编辑键 */
export const EMPHASIS_ONE_KEYS = [
  'F5',
  'F6',
  'F7',
  'F8',
  'F13',
  'F14',
  'F15',
  'F16',
  'Backquote',
  'Backspace',
  'Tab',
  'CapsLock',
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'MetaLeft',
  'AltLeft',
  'AltRight',
  'MetaRight',
  'ControlRight',
  'Fn',
  'Insert',
  'Delete',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'PrintScreen',
  'ScrollLock',
  'Pause',
  'NumLock',
  'NumpadDivide',
  'NumpadMultiply',
  'NumpadSubtract',
  'NumpadAdd',
]

/** 二级强调键：方向键 + 确认键 */
export const EMPHASIS_TWO_KEYS = [
  'Escape',
  'Enter',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'NumpadEnter',
]

// 按键按压反馈持续时间（ms），控制 keycap 从按下到回弹的完整动画时长
export const KEYCAP_ACTIVE_DURATION = 80

// keyboard 书签 URL / name 的最大字符数限制
export const KEYBOARD_URL_MAX_LENGTH = 200
export const KEYBOARD_NAME_MAX_LENGTH = 10

// UI 选择器选项 → 已迁移至 ./keyboard-options
export {
  KEYBOARD_TYPE_OPTION,
  SPLIT_SPACE_OPTION,
  KEYCAP_TYPE_OPTION,
  KEYBOARD_NOT_ALLOW_KEYCODE_LIST_FOR_WIDGET,
} from './keyboard-options'

export const KEYBOARD_CODE_TO_DEFAULT_CONFIG: Record<
  string,
  { label: string; textAlign: string; alias?: string; size: number } | undefined
> = {
  // 0
  Escape: { label: isMacOS ? 'esc' : 'Esc', textAlign: 'left', size: 1 },
  F1: { label: 'F1', textAlign: 'center', size: 1 },
  F2: { label: 'F2', textAlign: 'center', size: 1 },
  F3: { label: 'F3', textAlign: 'center', size: 1 },
  F4: { label: 'F4', textAlign: 'center', size: 1 },
  F5: { label: 'F5', textAlign: 'center', size: 1 },
  F6: { label: 'F6', textAlign: 'center', size: 1 },
  F7: { label: 'F7', textAlign: 'center', size: 1 },
  F8: { label: 'F8', textAlign: 'center', size: 1 },
  F9: { label: 'F9', textAlign: 'center', size: 1 },
  F10: { label: 'F10', textAlign: 'center', size: 1 },
  F11: { label: 'F11', textAlign: 'center', size: 1 },
  F12: { label: 'F12', textAlign: 'center', size: 1 },
  F13: { label: 'F13', textAlign: 'center', size: 1 },
  F14: { label: 'F14', textAlign: 'center', size: 1 },
  F15: { label: 'F15', textAlign: 'center', size: 1 },
  // 1
  Backquote: { label: '` ~', textAlign: 'center', size: 1 },
  Digit1: { label: '1', textAlign: 'center', size: 1 },
  Digit2: { label: '2', textAlign: 'center', size: 1 },
  Digit3: { label: '3', textAlign: 'center', size: 1 },
  Digit4: { label: '4', textAlign: 'center', size: 1 },
  Digit5: { label: '5', textAlign: 'center', size: 1 },
  Digit6: { label: '6', textAlign: 'center', size: 1 },
  Digit7: { label: '7', textAlign: 'center', size: 1 },
  Digit8: { label: '8', textAlign: 'center', size: 1 },
  Digit9: { label: '9', textAlign: 'center', size: 1 },
  Digit0: { label: '0', textAlign: 'center', size: 1 },
  Minus: { label: '-', textAlign: 'center', size: 1 },
  Equal: { label: '+', textAlign: 'center', size: 1 },
  Backspace: {
    label: isMacOS ? 'delete' : 'Backspace',
    textAlign: 'right',
    size: 2,
  },
  // 2
  Tab: { label: isMacOS ? 'tab' : 'Tab', textAlign: 'left', size: 1.5 },
  KeyQ: { label: 'Q', textAlign: 'center', size: 1 },
  KeyW: { label: 'W', textAlign: 'center', size: 1 },
  KeyE: { label: 'E', textAlign: 'center', size: 1 },
  KeyR: { label: 'R', textAlign: 'center', size: 1 },
  KeyT: { label: 'T', textAlign: 'center', size: 1 },
  KeyY: { label: 'Y', textAlign: 'center', size: 1 },
  KeyU: { label: 'U', textAlign: 'center', size: 1 },
  KeyI: { label: 'I', textAlign: 'center', size: 1 },
  KeyO: { label: 'O', textAlign: 'center', size: 1 },
  KeyP: { label: 'P', textAlign: 'center', size: 1 },
  BracketLeft: { label: '{ [', textAlign: 'center', size: 1 },
  BracketRight: { label: '] }', textAlign: 'center', size: 1 },
  Backslash: { label: '| \\', textAlign: 'center', size: 1.5 },
  // 3
  CapsLock: {
    label: isMacOS ? 'caps lock' : 'Caps Lock',
    textAlign: 'left',
    size: 1.75,
  },
  KeyA: { label: 'A', textAlign: 'center', size: 1 },
  KeyS: { label: 'S', textAlign: 'center', size: 1 },
  KeyD: { label: 'D', textAlign: 'center', size: 1 },
  KeyF: { label: 'F', textAlign: 'center', size: 1 },
  KeyG: { label: 'G', textAlign: 'center', size: 1 },
  KeyH: { label: 'H', textAlign: 'center', size: 1 },
  KeyJ: { label: 'J', textAlign: 'center', size: 1 },
  KeyK: { label: 'K', textAlign: 'center', size: 1 },
  KeyL: { label: 'L', textAlign: 'center', size: 1 },
  Semicolon: { label: ': ;', textAlign: 'center', size: 1 },
  Quote: { label: '" \'', textAlign: 'center', size: 1 },
  Enter: {
    label: isMacOS ? 'return' : 'Enter',
    textAlign: 'right',
    size: 2.25,
  },
  // 4
  ShiftLeft: {
    label: isMacOS ? 'shift' : 'Shift',
    alias: 'LShift',
    textAlign: 'left',
    size: 2.25,
  },
  KeyZ: { label: 'Z', textAlign: 'center', size: 1 },
  KeyX: { label: 'X', textAlign: 'center', size: 1 },
  KeyC: { label: 'C', textAlign: 'center', size: 1 },
  KeyV: { label: 'V', textAlign: 'center', size: 1 },
  KeyB: { label: 'B', textAlign: 'center', size: 1 },
  KeyN: { label: 'N', textAlign: 'center', size: 1 },
  KeyM: { label: 'M', textAlign: 'center', size: 1 },
  Comma: { label: '< ,', textAlign: 'center', size: 1 },
  Period: { label: '> .', textAlign: 'center', size: 1 },
  Slash: { label: '? /', textAlign: 'center', size: 1 },
  ShiftRight: {
    label: isMacOS ? 'shift' : 'Shift',
    alias: 'RShift',
    textAlign: 'right',
    size: 2.75,
  },
  // 5
  ControlLeft: {
    label: isMacOS ? '⌃' : 'Ctrl',
    alias: 'LCtrl',
    textAlign: 'left',
    size: 1.25,
  },
  MetaLeft: {
    label: isMacOS ? '⌘' : 'Win',
    alias: 'LMeta',
    textAlign: 'left',
    size: 1.25,
  },
  AltLeft: {
    label: isMacOS ? '⌥' : 'Alt',
    alias: 'LAlt',
    textAlign: 'left',
    size: 1.25,
  },
  Space: { label: '', textAlign: 'center', size: 6.25 },
  SpaceSplit1: { label: '', textAlign: 'center', size: 2.25 },
  SpaceSplit2: { label: '', textAlign: 'center', size: 2.75 },
  AltRight: {
    label: isMacOS ? '⌥' : 'Alt',
    alias: 'RAlt',
    textAlign: 'left',
    size: 1.25,
  },
  MetaRight: {
    label: isMacOS ? '⌘' : 'Win',
    alias: 'RMeta',
    textAlign: 'left',
    size: 1.25,
  },
  ControlRight: {
    label: isMacOS ? '⌃' : 'Ctrl',
    alias: 'RCtrl',
    textAlign: 'left',
    size: 1.25,
  },
  Fn: { label: isMacOS ? 'fn' : 'Fn', textAlign: 'left', size: 1.25 },
  Menu: { label: isMacOS ? '⌥' : 'Menu', textAlign: 'left', size: 1.25 },
  // Edit
  Insert: { label: isMacOS ? 'ins' : 'Ins', textAlign: 'center', size: 1 },
  Delete: { label: isMacOS ? 'del' : 'Del', textAlign: 'center', size: 1 },
  Home: { label: isMacOS ? 'home' : 'Home', textAlign: 'center', size: 1 },
  End: { label: isMacOS ? 'end' : 'End', textAlign: 'center', size: 1 },
  PageUp: { label: isMacOS ? 'pgup' : 'PgUp', textAlign: 'center', size: 1 },
  PageDown: { label: isMacOS ? 'pgdn' : 'PgDn', textAlign: 'center', size: 1 },
  // Navigation
  ArrowUp: { label: '↑', textAlign: 'center', size: 1 },
  ArrowDown: { label: '↓', textAlign: 'center', size: 1 },
  ArrowLeft: { label: '←', textAlign: 'center', size: 1 },
  ArrowRight: { label: '→', textAlign: 'center', size: 1 },
  // System
  PrintScreen: {
    label: isMacOS ? 'prtsc' : 'PrtSc',
    textAlign: 'center',
    size: 1,
  },
  ScrollLock: {
    label: isMacOS ? 'scrlk' : 'ScrLk',
    textAlign: 'center',
    size: 1,
  },
  Pause: { label: isMacOS ? 'pause' : 'Pause', textAlign: 'center', size: 1 },
  // Numpad
  NumLock: { label: 'Num\nLock', textAlign: 'center', size: 1 },
  NumpadDivide: { label: '/', textAlign: 'center', size: 1 },
  NumpadMultiply: { label: '*', textAlign: 'center', size: 1 },
  NumpadSubtract: { label: '-', textAlign: 'center', size: 1 },
  Numpad7: { label: '7', textAlign: 'center', size: 1 },
  Numpad8: { label: '8', textAlign: 'center', size: 1 },
  Numpad9: { label: '9', textAlign: 'center', size: 1 },
  NumpadAdd: { label: '+', textAlign: 'center', size: 2 },
  Numpad4: { label: '4', textAlign: 'center', size: 1 },
  Numpad5: { label: '5', textAlign: 'center', size: 1 },
  Numpad6: { label: '6', textAlign: 'center', size: 1 },
  Numpad1: { label: '1', textAlign: 'center', size: 1 },
  Numpad2: { label: '2', textAlign: 'center', size: 1 },
  Numpad3: { label: '3', textAlign: 'center', size: 1 },
  NumpadEnter: {
    label: isMacOS ? 'return' : 'Enter',
    textAlign: 'center',
    size: 2,
  },
  Numpad0: { label: '0', textAlign: 'center', size: 2 },
  NumpadDecimal: { label: '.', textAlign: 'center', size: 1 },
}

// chrome.storage.local 的 key，用于跨上下文（CS/SW/newtab）共享 source=1 的 keymap
export const SYSTEM_KEYMAP_STORAGE_KEY = 'naive-tab-systemKeymap'

// chrome.storage.local 的 key，用于设备级持久化当前激活的书签层索引（不同步）
export const ACTIVE_LAYER_STORAGE_KEY = 'naive-tab-activeLayer'

// 键盘书签顶层文件夹名称（导出书签、层迁移默认值等统一使用此常量）
export const KEYBOARD_BOOKMARK_TOP_LEVEL_FOLDER = 'NaiveTab'

// 书签层默认 sourceFolderPath，基于 LAYER_FOLDER_NAMES 生成
export const DEFAULT_LAYER_SOURCE_FOLDER = `${KEYBOARD_BOOKMARK_TOP_LEVEL_FOLDER}/${LAYER_FOLDER_NAMES[0]}`

/** 导出书签时使用的层文件夹名称列表，与配置层一一对应 */
export const EXPORT_LAYERS = LAYER_FOLDER_NAMES

export const SPACE_KEYCODE_LIST = ['Space', 'SpaceSplit1', 'SpaceSplit2']

/**
 * 所有标准键位的 code 列表（key104 布局），作为 parseBookmarkFolder 的 keyboardLayout 参数。
 *
 * 为什么手动维护此列表而非从 layouts 目录动态聚合：
 * 1. 此列表由 SW 端（layer-keymap-builder.ts）使用，layouts 目录依赖 Vue 响应式，
 *    无法在 SW 环境中导入
 * 2. keymap 消费者只按 keymap[code] 查询，不需要知道实际键盘布局的渲染顺序
 * 3. 使用最大键位列表（key104 全集）可覆盖所有可能的 layout 变体（33/61/67/87/96/104 等）
 *
 * 维护原则：新增布局时，如果包含以下列表中不存在的标准键码，需要追加到此列表。
 * 注意：不包含 SpaceSplit1/SpaceSplit2，这两个是纯 UI 渲染虚拟码，
 * 浏览器的 KeyboardEvent.code 永远不会生成这两个值（按下空格始终生成 'Space'），
 * 因此不需要包含在此列表中。
 */
export const ALL_KEYBOARD_CODES = [
  'Escape',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
  'PrintScreen',
  'ScrollLock',
  'Pause',
  'Backquote',
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
  'Digit0',
  'Minus',
  'Equal',
  'Backspace',
  'Insert',
  'Home',
  'PageUp',
  'NumLock',
  'NumpadDivide',
  'NumpadMultiply',
  'NumpadSubtract',
  'Tab',
  'KeyQ',
  'KeyW',
  'KeyE',
  'KeyR',
  'KeyT',
  'KeyY',
  'KeyU',
  'KeyI',
  'KeyO',
  'KeyP',
  'BracketLeft',
  'BracketRight',
  'Backslash',
  'Delete',
  'End',
  'PageDown',
  'Numpad7',
  'Numpad8',
  'Numpad9',
  'NumpadAdd',
  'CapsLock',
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
  'KeyG',
  'KeyH',
  'KeyJ',
  'KeyK',
  'KeyL',
  'Semicolon',
  'Quote',
  'Enter',
  'Numpad4',
  'Numpad5',
  'Numpad6',
  'ShiftLeft',
  'KeyZ',
  'KeyX',
  'KeyC',
  'KeyV',
  'KeyB',
  'KeyN',
  'KeyM',
  'Comma',
  'Period',
  'Slash',
  'ShiftRight',
  'ArrowUp',
  'Numpad1',
  'Numpad2',
  'Numpad3',
  'NumpadEnter',
  'ControlLeft',
  'MetaLeft',
  'AltLeft',
  'Space',
  'AltRight',
  'MetaRight',
  'ContextMenu',
  'ControlRight',
  'ArrowLeft',
  'ArrowDown',
  'ArrowRight',
  'Numpad0',
  'NumpadDecimal',
]

/**
 * 允许作为快捷键主键的按键 code（ALL_KEYBOARD_CODES 的子集）。
 * 排除修饰键（Shift/Ctrl/Alt/Meta）和有浏览器默认行为的特殊键（Escape/Tab/Enter 等）。
 */
export const ALLOWED_MAIN_KEYS = [
  'KeyA',
  'KeyB',
  'KeyC',
  'KeyD',
  'KeyE',
  'KeyF',
  'KeyG',
  'KeyH',
  'KeyI',
  'KeyJ',
  'KeyK',
  'KeyL',
  'KeyM',
  'KeyN',
  'KeyO',
  'KeyP',
  'KeyQ',
  'KeyR',
  'KeyS',
  'KeyT',
  'KeyU',
  'KeyV',
  'KeyW',
  'KeyX',
  'KeyY',
  'KeyZ',
  'Digit0',
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
  'Digit9',
  'Comma',
  'Period',
  'Slash',
  'Minus',
  'Equal',
  'BracketLeft',
  'BracketRight',
  'Semicolon',
  'Quote',
  'Backquote',
  'Backslash',
  'IntlBackslash',
  'Numpad0',
  'Numpad1',
  'Numpad2',
  'Numpad3',
  'Numpad4',
  'Numpad5',
  'Numpad6',
  'Numpad7',
  'Numpad8',
  'Numpad9',
  'NumpadDecimal',
  'NumpadEnter',
  'NumpadAdd',
  'NumpadSubtract',
  'NumpadMultiply',
  'NumpadDivide',
  'F1',
  'F2',
  'F3',
  'F4',
  'F5',
  'F6',
  'F7',
  'F8',
  'F9',
  'F10',
  'F11',
  'F12',
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'Insert',
  'Delete',
]

export const ALLOWED_SET = new Set(ALLOWED_MAIN_KEYS)
