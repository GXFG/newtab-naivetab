/**
 * @module keyboard/keyboard-layout
 * @description 键盘布局变换引擎：WKL 模式、macOS 修饰键交换、Space 键拆分、
 *   强调键注入。从 layouts/ 目录加载 19 种预设布局，运行时根据配置转换。
 * @dependencies keyboard/keyboard-constants.ts（强调键集合）、keyboard/layouts/（预设布局）
 * @consumers widgets/keyboardBookmark/logic.ts、components/KeyboardLayout.vue
 * @see docs/features/keyboard.md
 */
import { isMacOS } from '@/env'
import { localConfig } from '@/logic/config/state'
import { EMPHASIS_ONE_KEYS, EMPHASIS_TWO_KEYS } from './keyboard-constants'
import * as layouts from './layouts'

// ── 布局注册表 ─────────────────────────────────────────────
const KEYBOARD_PRESETS: Record<string, TKeyboardDefinition> = layouts

// ── 不可变变换函数 ──────────────────────────────────────────

/** WKL 模式：移除最后一行的 Win/Meta 键 */
function applyWklMode(keys: TKeyDefinition[]): TKeyDefinition[] {
  const maxY = Math.max(...keys.map((k) => k.y))
  return keys.filter(
    (k) => !(k.y === maxY && ['MetaLeft', 'MetaRight'].includes(k.code)),
  )
}

/** macOS 修饰键交换：Option ↔ Command（仅非 WKL 模式） */
function applyMacSwap(keys: TKeyDefinition[]): TKeyDefinition[] {
  if (!isMacOS) return keys
  const maxY = Math.max(...keys.map((k) => k.y))
  const lastRowKeys = keys.filter((k) => k.y === maxY)
  const swap = (a: string, b: string) => {
    const keyA = lastRowKeys.find((k) => k.code === a)
    const keyB = lastRowKeys.find((k) => k.code === b)
    if (keyA && keyB) {
      const xA = keyA.x
      keyA.x = keyB.x
      keyB.x = xA
    }
  }
  swap('MetaLeft', 'AltLeft')
  swap('MetaRight', 'AltRight')
  return keys
}

/** Space 键拆分：替换最后一行 Space 区域为变体键 */
function applySpaceSplit(
  keys: TKeyDefinition[],
  spaceVariants: TKeyboardDefinition['spaceVariants'],
  splitMode: string,
): TKeyDefinition[] {
  if (splitMode === 'space1') return keys
  const variants =
    spaceVariants?.[splitMode as keyof NonNullable<typeof spaceVariants>]
  if (!variants) return keys

  const maxY = Math.max(...keys.map((k) => k.y))
  const spaceKey = keys.find((k) => k.code === 'Space' && k.y === maxY)
  if (!spaceKey) return keys

  const filtered = keys.filter(
    (k) =>
      !(
        k.y === maxY && ['Space', 'SpaceSplit1', 'SpaceSplit2'].includes(k.code)
      ),
  )

  let currentX = spaceKey.x
  for (const vKey of variants) {
    filtered.push({
      code: vKey.code,
      x: currentX,
      y: maxY,
      w: vKey.w,
      h: 1,
    })
    currentX += vKey.w
  }

  return filtered
}

/** 基于预设构造新键盘定义（不可变，不修改原始预设） */
function buildKeyboardDefinition(
  preset: TKeyboardDefinition,
  wklMode: boolean,
  splitSpace: string,
): TKeyboardDefinition {
  let keys = preset.keys.map((k) => ({ ...k }))

  if (wklMode) {
    keys = applyWklMode(keys)
  } else {
    keys = applyMacSwap(keys)
  }

  keys = applySpaceSplit(keys, preset.spaceVariants, splitSpace)

  return {
    id: preset.id,
    name: preset.name,
    keys,
    emphasisOneCodes: [...EMPHASIS_ONE_KEYS],
    emphasisTwoCodes: [...EMPHASIS_TWO_KEYS],
  }
}

// ── 当前键盘配置 ───────────────────────────────────────────

export const currKeyboardConfig = computed((): TKeyboardDefinition => {
  const preset =
    KEYBOARD_PRESETS[localConfig.keyboardCommon.keyboardType] ??
    KEYBOARD_PRESETS.key61

  return buildKeyboardDefinition(
    preset,
    localConfig.keyboardCommon.keyboardWklMode,
    localConfig.keyboardCommon.splitSpace,
  )
})

export const keyboardCurrentModelAllKeyList = computed(() =>
  currKeyboardConfig.value.keys.map((k) => k.code),
)
