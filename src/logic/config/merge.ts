/**
 * 配置合并函数（递归）
 *
 * 合并策略说明：
 * ┌─────────────────────────────────────────────────────────────────────────────┐
 * │  参数说明                                                                   │
 * │  - state: 默认配置（来自 defaultConfig）                                   │
 * │  - acceptState: 待合并的配置（来自云端/导入/本地）                          │
 * │                                                                             │
 * │  合并规则（按优先级）：                                                     │
 * │  1. acceptState 为空 → 使用默认值 state                                     │
 * │  2. 类型不同 → 使用默认值 state（处理新增字段）                             │
 * │  3. 基础类型 → 直接使用 acceptState 的值                                    │
 * │  4. 数组等非纯Object → 直接使用 acceptState 的值                            │
 * │  5. keymap 特殊对象 → 直接使用 acceptState 的值（避免深合并破坏结构）        │
 * │  6. 普通对象 → 递归合并，只合并 state 中已定义的字段                        │
 * │                                                                             │
 * │  设计目标：                                                                 │
 * │  - 保留用户新版本新增字段的默认值                                           │
 * │  - 删除旧版本废弃的字段                                                     │
 * │  - 避免合并破坏特殊数据结构（如 keymap）                                    │
 * └─────────────────────────────────────────────────────────────────────────────┘
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
