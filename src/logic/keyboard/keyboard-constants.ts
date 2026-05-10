import { isMacOS } from '@/env'

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

export const KEYBOARD_TYPE_OPTION = [
  { label: '33', value: 'key33' },
  { label: '45', value: 'key45' },
  { label: '47', value: 'key47' },
  { label: '53', value: 'key53' },
  { label: '61', value: 'key61' },
  { label: '64', value: 'key64' },
  { label: '66', value: 'key66' },
  { label: '67', value: 'key67' },
  { label: '68', value: 'key68' },
  { label: '80', value: 'key80' },
  { label: '81a', value: 'key81a' },
  { label: '81b', value: 'key81b' },
  { label: '84', value: 'key84' },
  { label: '87', value: 'key87' },
  { label: '96a', value: 'key96a' },
  { label: '96b', value: 'key96b' },
  { label: '98', value: 'key98' },
  { label: '104', value: 'key104' },
  { label: 'HHKB', value: 'hhkb' },
]

export const SPLIT_SPACE_OPTION = [
  { label: '1', value: 'space1' },
  { label: '2', value: 'space2' },
  { label: '3', value: 'space3' },
]

export const KEYCAP_TYPE_OPTION = [
  { label: 'GMK', value: 'gmk' },
  { label: 'DSA', value: 'dsa' },
  { label: 'FLAT', value: 'flat' },
]

export const KEYBOARD_CODE_TO_DEFAULT_CONFIG = {
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

export const KEYBOARD_NOT_ALLOW_KEYCODE_LIST_FOR_WIDGET = [
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'MetaLeft',
  'AltLeft',
  'Space',
  'AltRight',
  'MetaRight',
  'ControlRight',
]

// chrome.storage.local 的 key，用于跨上下文（CS/SW/newtab）共享 source=1 的 keymap
export const SYSTEM_KEYMAP_STORAGE_KEY = 'naive-tab-systemKeymap'

export const SPACE_KEYCODE_LIST = ['Space', 'SpaceSplit1', 'SpaceSplit2']
