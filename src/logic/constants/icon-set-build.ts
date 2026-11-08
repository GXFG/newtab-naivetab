/**
 * @module icon-set-build
 * @description 把 Iconify 集合数据整理成可逐条 `addIcon` 的形状 —— 生成器与单测共用。
 *
 * 为什么需要这一步：`@iconify/vue/offline` 的 `addCollection` 先整包校验，任何一条别名
 * 父级解析不到就**整包静默丢弃**（返回 void，调用方无法察觉）；`addIcon` 逐条写入，坏一个
 * 只坏一个。因此在生成期就把别名解析成实体图标、合并集合级默认尺寸，产物里只剩实体图标，
 * 运行时只调 `addIcon`。
 *
 * 解析规则不自己实现：直接用 `@iconify/utils` 的 `getIconData`（Iconify 官方工具包）—— 别名可
 * 指向别名、`rotate` 相加取模 4、`hFlip`/`vFlip` 异或、合并集合级默认尺寸，规则与 `@iconify/vue`
 * 运行时一致。注意两者是各自独立的实现（`@iconify/vue` 只依赖 `@iconify/types`），所以升级
 * Iconify 版本后仍需重跑 `pnpm gen:icons` 让产物跟上数据。
 * 手写过一版的代价是 152 行解析 + 173 行合成数据测试，而当时 151 个图标里 0 个走别名。
 *
 * @dependencies @iconify/utils（devDependency；只有生成脚本与单测会 import，运行时不加载）
 * @pitfalls
 *   - `getIconData` 不解析 `parent` 为数组的多父级别名（Iconify 运行时的别名树同样不解析），
 *     这类图标会被判为缺失。全量包 281 个集合里 0 例 —— 别为它写自定义合并，产物里躺一份
 *     运行时渲染不出来的数据，比直接报错更糟。
 *   - 产物字段顺序固定（`FIELD_ORDER`），否则每次重生成都会整文件 diff。
 * @see docs/architecture/icons.md
 */
import { getIconData } from '@iconify/utils'

/** 单个图标的数据（Iconify 的 IconifyIcon，只声明渲染用得到的字段） */
export interface IconifyIconData {
  body: string
  left?: number
  top?: number
  width?: number
  height?: number
  rotate?: number
  hFlip?: boolean
  vFlip?: boolean
}

/** 别名：声明一个或多个父级，并可覆盖父级的尺寸与变换 */
export type IconifyAliasData = {
  parent: string | string[]
} & Partial<Omit<IconifyIconData, 'body'>>

/** 图标集：摊平只需要 icons 与 aliases，前缀等元信息与结果无关 */
export interface IconifyCollectionData {
  left?: number
  top?: number
  width?: number
  height?: number
  icons: Record<string, IconifyIconData>
  aliases?: Record<string, IconifyAliasData>
}

/**
 * 产物里的字段顺序 —— 固定下来，重生成才不会整文件 diff。
 * 只收渲染用得到的字段：集合里的 `hidden` 只影响 Iconify 的图标浏览与搜索，不参与渲染。
 */
const FIELD_ORDER = [
  'body',
  'left',
  'top',
  'width',
  'height',
  'rotate',
  'hFlip',
  'vFlip',
] as const

/** 库函数要求 IconifyJSON（含 prefix）；前缀只用于报错信息，解析本身不读它 */
type CollectionJson = Parameters<typeof getIconData>[0]

/** 只保留渲染用得到的字段，并按固定顺序排列 */
const toStoredIcon = (icon: object): IconifyIconData => {
  const stored: Record<string, unknown> = {}
  for (const key of FIELD_ORDER) {
    const value = (icon as Record<string, unknown>)[key]
    if (value !== undefined) stored[key] = value
  }
  return stored as unknown as IconifyIconData
}

export type MissingIconReason = 'collection' | 'icon'

export interface MissingIcon {
  /** 完整的图标名 */
  name: string
  prefix: string
  /** collection：图标集数据源没装；icon：图标名不存在或别名链解析不到 */
  reason: MissingIconReason
}

/**
 * 把一批图标名解析成扁平的「图标名 → 图标数据」映射，键按名称排序以保证 diff 稳定。
 *
 * `collections` 中缺失的前缀放 `null`，与「图标名不存在」区分开报错。
 */
export function buildIconMap(
  collections: Map<string, IconifyCollectionData | null>,
  iconNames: Iterable<string>,
): { icons: Record<string, IconifyIconData>; missing: MissingIcon[] } {
  const icons: Record<string, IconifyIconData> = {}
  const missing: MissingIcon[] = []

  for (const name of [...new Set(iconNames)].sort()) {
    const [prefix, iconName] = name.split(':')
    const collection = collections.get(prefix)
    if (!collection) {
      missing.push({ name, prefix, reason: 'collection' })
      continue
    }

    // 别名（含别名链、旋转/翻转叠加、集合级默认尺寸）全部由 Iconify 自己解析
    const resolved = getIconData(
      collection as unknown as CollectionJson,
      iconName,
    )
    if (!resolved) {
      missing.push({ name, prefix, reason: 'icon' })
      continue
    }
    icons[name] = toStoredIcon(resolved)
  }

  return { icons, missing }
}
