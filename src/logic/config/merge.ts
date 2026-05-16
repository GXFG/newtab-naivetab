/**
 * @module merge
 * @description 递归配置合并函数。以 defaultConfig 为模板过滤未知/废弃字段。
 * @dependencies 无（纯函数）
 * @consumers upload.ts（上传前校验）、loader.ts（版本感知合并）、update.ts（updateSetting 写入）
 * @pitfalls
 *   - keymap 对象（Key/Digit/Numpad 开头的键名）和数组直接替换，不深合并
 *   - 嵌套对象新增字段不能依赖浅合并自动补全，必须在 handleAppUpdate 中手动赋值
 *   - 类型不同时使用默认值（处理旧版本类型变更），不会尝试转换
 * @see docs/architecture/config.md#mergeState-合并函数
 * @see .claude/rules/pitfalls.md#mergestate-合并陷阱
 */
export const mergeState = (state: unknown, acceptState: unknown): unknown => {
  // 规则1: acceptState 为空，使用默认值
  if (acceptState === undefined || acceptState === null) {
    return state
  }

  // 规则2: 类型不同时，使用默认值（处理新增字段的情况）
  // 例如：旧版本某字段是 string，新版本改为 object
  if (
    Object.prototype.toString.call(state) !==
    Object.prototype.toString.call(acceptState)
  ) {
    return state
  }

  // 规则3: 基础类型，直接使用 acceptState 的值
  if (
    typeof acceptState === 'string' ||
    typeof acceptState === 'number' ||
    typeof acceptState === 'boolean'
  ) {
    return acceptState
  }

  // 规则4: 数组等非纯 Object 类型，直接使用 acceptState 的值
  // 原因：数组的合并逻辑复杂，直接替换更安全
  if (Object.prototype.toString.call(acceptState) !== '[object Object]') {
    return acceptState
  }

  // 规则5: keymap 特殊对象检测
  // keymap 是 Record<string, { url, name }> 结构，不应深合并
  // 检测逻辑：如果存在键盘码格式的 key，认为是 keymap
  const acceptObj = acceptState as Record<string, unknown>
  const stateObj = state as Record<string, unknown>
  const hasKeymapPattern = Object.keys(acceptObj).some(
    (key) =>
      key.startsWith('Key') ||
      key.startsWith('Digit') ||
      key.startsWith('Numpad'),
  )
  if (hasKeymapPattern) {
    return acceptState
  }

  // 规则6: 普通对象，递归合并
  // 注意：只合并 state（默认配置）中已定义的字段，忽略 acceptState 中的未知字段
  const filterState: Record<string, unknown> = {}
  for (const field of Object.keys(stateObj)) {
    if (Object.prototype.hasOwnProperty.call(acceptObj, field)) {
      filterState[field] = mergeState(stateObj[field], acceptObj[field])
    } else {
      // acceptState 中不存在该字段，使用默认值
      filterState[field] = stateObj[field]
    }
  }

  return filterState
}
