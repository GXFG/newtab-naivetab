/**
 * @module icon-scan
 * @description 图标名的形式规则 —— 生成器与守卫测试共用。
 *
 *   本模块只管「长什么样算一个图标名」，不负责收集。图标清单的唯一来源是
 *   `icons.ts` 的 ICONS / COMMAND_ICONS；这里的正则只做**守卫**：除 icons.ts
 *   外，源码里不应再出现图标名字面量（规则见 `.claude/rules/no-hardcode.md`）。
 *
 *   历史：曾用这套正则从源码里「猜」出用了哪些图标（扫描 + 生成）。那个做法自带
 *   三类误判 —— 注释里带引号的图标名会被打进产物、数字开头的图标名扫不到、
 *   未知前缀要靠一张手工白名单挡。改为常量表驱动后，正则退回守卫角色，
 *   白名单也随之删除：只有「已出现在常量表里的前缀」才算图标。
 *
 * @dependencies 无（纯字符串处理，可在任意上下文运行）
 * @why-self-built 没有库能做这件事：Iconify 的工具包只处理「给定的集合数据」，
 *   「扫本项目源码、判断哪些字面量像图标名」是本项目自己的规则（见 no-hardcode.md），
 *   不属于任何库的能力范围。
 * @pitfalls
 *   - 前缀过滤依赖调用方传入 knownPrefixes，不要再加「前缀黑名单」：黑名单永远追不上
 *     源码里出现的下一个 `xx:yy` 字面量。
 *   - 本文件自身也会被守卫扫描，注释里不要写出带引号的前缀冒号名称。
 * @see docs/architecture/icons.md
 */

/** 前缀：小写字母开头，允许连字符（chrome-extension 这类） */
const PREFIX = '[a-z][a-z0-9-]*'

/** 名称：Iconify 允许数字开头（360、3d-rotation 这类），首字符不能是连字符 */
const NAME = '[a-z0-9][a-z0-9-]*'

/** 完整图标名，用于校验常量表里的值 */
export const ICON_NAME_RE = new RegExp(`^${PREFIX}:${NAME}$`)

/**
 * 匹配被引号完整包住的图标名。第 1 个捕获组是引号本身，反向引用 `\1` 保证两侧
 * 引号一致，因此缺右引号、或跨引号拼接的写法都不会命中。
 */
export const ICON_LITERAL_RE = new RegExp(
  `(['"\`])(${PREFIX}):(${NAME})\\1`,
  'g',
)

export interface IconLiteral {
  /** 前缀冒号名称 */
  icon: string
  /** 命中位置（0 基），调用方据此换算行号 */
  index: number
}

/**
 * 扫描一段源码里「像图标」的字面量。
 *
 * 只返回被引号完整包住、且前缀在 `knownPrefixes` 中的字面量。前缀过滤替代了旧的
 * 黑名单：`hh:mm`、`update:show`、`https://` 这类字面量的前缀不在图标集里，自然被排除。
 */
export function* findIconLiterals(
  source: string,
  knownPrefixes: Set<string>,
): Generator<IconLiteral> {
  for (const match of source.matchAll(ICON_LITERAL_RE)) {
    const [, , prefix, name] = match
    if (!knownPrefixes.has(prefix)) continue
    yield {
      icon: `${prefix}:${name}`,
      // match.index 一定存在（matchAll 的每个结果都带）
      index: match.index ?? 0,
    }
  }
}

/** 字符下标 → 1 基行号，供报错定位用 */
export const lineOf = (source: string, index: number): number =>
  source.slice(0, index).split('\n').length
