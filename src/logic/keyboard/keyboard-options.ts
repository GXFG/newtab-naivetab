/**
 * 键盘 UI 选择器选项 — 键盘类型、空格拆分、键帽类型、Widget 禁用按键列表。
 */

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

export const KEYBOARD_NOT_ALLOW_KEYCODE_LIST_FOR_WIDGET = [
  // 顶层按键（键盘 shell 的外围按键，禁止设置书签以防误触）
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
]
