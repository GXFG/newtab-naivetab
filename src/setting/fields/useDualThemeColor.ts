import { type MaybeRefOrGetter, computed, toValue } from 'vue'
import { localState } from '@/logic/config/state'

/**
 * 双主题色值处理：自动根据当前外观（浅色/深色）取对应值
 * @param value 颜色值（字符串或 [浅色值, 深色值] 数组，支持 ref/getter）
 * @param onUpdate 更新回调，接收新值和完整的原值数组/字符串
 */
export const useDualThemeColor = (
  value: MaybeRefOrGetter<string | string[]>,
  onUpdate: (newValue: string | string[]) => void,
) => {
  const isDual = computed(() => Array.isArray(toValue(value)))

  const currentValue = computed(() => {
    const v = toValue(value)
    if (Array.isArray(v)) {
      return v[localState.value.currAppearanceCode]
    }
    return v as string
  })

  const updateValue = (newValue: string) => {
    const v = toValue(value)
    if (Array.isArray(v)) {
      const newArray = [...v]
      newArray[localState.value.currAppearanceCode] = newValue
      onUpdate(newArray)
    } else {
      onUpdate(newValue)
    }
  }

  return { isDual, currentValue, updateValue }
}
