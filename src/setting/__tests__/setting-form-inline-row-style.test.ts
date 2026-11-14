import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { compileStyle, parse } from '@vue/compiler-sfc'

// 用 import.meta.dirname 定位：vitest 的 root 是 src/，process.cwd() 依赖启动目录，不可靠
const SFC_PATH = resolve(
  import.meta.dirname,
  '../components/SettingFormInlineRow.vue',
)

/** 编译该组件唯一的 scoped 样式块，返回编译后的 CSS */
const compileScopedStyle = () => {
  const source = readFileSync(SFC_PATH, 'utf8')
  const { descriptor } = parse(source, { filename: SFC_PATH })
  const style = descriptor.styles.find((s) => s.scoped)
  if (!style) throw new Error('SettingFormInlineRow 缺少 scoped 样式块')

  return compileStyle({
    source: style.content,
    id: 'data-v-test',
    scoped: true,
    filename: SFC_PATH,
  }).code
}

/**
 * 取出所有声明了指定属性的规则：`{ 选择器, 声明体 }`。
 * 只做「单层花括号」匹配，够用且不依赖嵌套形态。
 */
const rulesWithDeclaration = (css: string, declaration: RegExp) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter((m) => declaration.test(m[2]!))
    .map((m) => ({ selector: m[1]!.trim(), body: m[2]! }))

describe('SettingFormInlineRow 同行等分布局', () => {
  /**
   * 回归保护：`.inline-row` 的子元素是父组件传入的 slot 内容，不带本组件的 data-v 标记。
   * 若等分规则被写成普通 scoped 选择器（`> *`），会编译成 `*[data-v-xxx]` 而永不匹配，
   * 表现为字段按内容宽度排列、不能各占 50% 铺满整行。
   *
   * 断言只针对「规则选择器不得带本组件水印」这一失效条件，不锁定具体写法：
   * 通配符（`> *`）与 `:slotted()`（编译出 `[data-v-xxx-s]`）都能命中 slot 内容，都放行。
   */
  it('等分规则的选择器不带本组件 watermarks，能命中 slot 内容', () => {
    const rules = rulesWithDeclaration(compileScopedStyle(), /flex:\s*1 1 0/)

    expect(rules.length).toBeGreaterThan(0)
    for (const { selector } of rules) {
      // `[data-v-test]` 不含 -s；`[data-v-test-s]` 是 :slotted 水印，不会触发此断言
      expect(
        selector,
        `选择器 "${selector}" 限定了本组件 data-v，无法命中 slot 内容`,
      ).not.toContain('[data-v-test]')
    }
  })

  it('等分规则同时收敛最小宽度，避免长内容撑破等分', () => {
    const rules = rulesWithDeclaration(compileScopedStyle(), /flex:\s*1 1 0/)

    expect(rules.some((r) => r.body.includes('min-width: 0'))).toBe(true)
  })

  it('相邻项之间有垂直分割线，且同样不限定本组件子节点', () => {
    const rules = rulesWithDeclaration(
      compileScopedStyle(),
      /border-right:\s*1px solid var\(--nt-gray-light\)/,
    ).filter((r) => r.selector.includes(':not(:last-child)'))

    expect(rules.length).toBeGreaterThan(0)
    for (const { selector } of rules) {
      expect(selector).not.toContain('[data-v-test]')
    }
  })
})
