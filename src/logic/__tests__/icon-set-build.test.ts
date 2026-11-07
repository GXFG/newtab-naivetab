import { describe, it, expect } from 'vitest'
import {
  buildIconMap,
  type IconifyCollectionData,
} from '@/logic/constants/icon-set-build'

/**
 * 图标集整理逻辑。
 *
 * 解析（别名、旋转/翻转、集合级默认尺寸）由 `@iconify/utils` 的 getIconData 完成 —— 规则与
 * `@iconify/vue` 运行时一致（但不是同一份实现），这里不重复测它的合并算法，只钉住两件事：
 *
 * 1. **我们依赖的语义没变** —— 摊平错了的后果是图标空白，且没有任何运行时告警；
 * 2. **产物形状稳定** —— 键排序、字段顺序，否则每次重生成都会整文件 diff。
 */
const makeCollection = (
  data: Partial<IconifyCollectionData>,
): IconifyCollectionData => ({ icons: {}, ...data })

describe('buildIconMap', () => {
  it('实体图标补齐集合级默认尺寸', () => {
    const collections = new Map([
      [
        'set',
        makeCollection({
          width: 24,
          height: 24,
          icons: { close: { body: 'A' } },
        }),
      ],
    ])

    const { icons, missing } = buildIconMap(collections, ['set:close'])

    expect(missing).toEqual([])
    expect(icons['set:close']).toEqual({ body: 'A', width: 24, height: 24 })
  })

  it('别名解析成实体图标，产物里不留 aliases', () => {
    const collections = new Map([
      [
        'set',
        makeCollection({
          width: 24,
          height: 24,
          icons: { close: { body: 'A' } },
          aliases: { remove: { parent: 'close', width: 12 } },
        }),
      ],
    ])

    const { icons } = buildIconMap(collections, ['set:remove'])

    expect(icons['set:remove']).toEqual({ body: 'A', width: 12, height: 24 })
    expect(icons['set:remove']).not.toHaveProperty('parent')
  })

  it('别名链断裂与成环都记为缺失，不死循环', () => {
    const collections = new Map([
      [
        'set',
        makeCollection({
          aliases: {
            broken: { parent: 'nope' },
            x: { parent: 'y' },
            y: { parent: 'x' },
          },
        }),
      ],
    ])

    const { icons, missing } = buildIconMap(collections, [
      'set:broken',
      'set:x',
    ])

    expect(icons).toEqual({})
    expect(missing.map((item) => item.reason)).toEqual(['icon', 'icon'])
  })

  it('多父级别名记为缺失 —— 与 Iconify 运行时一致', () => {
    // 运行时解析不了 parent 数组（getIconsTree 用它做键查询），产物里就不该有它。
    const collections = new Map([
      [
        'set',
        makeCollection({
          icons: {
            a: { body: 'A', width: 10 },
            b: { body: 'B', width: 20 },
          },
          aliases: { both: { parent: ['a', 'b'] } },
        }),
      ],
    ])

    const { icons, missing } = buildIconMap(collections, ['set:both'])

    expect(icons).toEqual({})
    expect(missing).toEqual([
      { name: 'set:both', prefix: 'set', reason: 'icon' },
    ])
  })

  it('集合数据源缺失与图标名不存在区分报错', () => {
    const missingCollection = buildIconMap(new Map([['set', null]]), [
      'set:close',
    ])
    const missingIcon = buildIconMap(
      new Map([['set', makeCollection({ icons: { close: { body: 'A' } } })]]),
      ['set:nope'],
    )

    expect(missingCollection.missing).toEqual([
      { name: 'set:close', prefix: 'set', reason: 'collection' },
    ])
    expect(missingIcon.missing).toEqual([
      { name: 'set:nope', prefix: 'set', reason: 'icon' },
    ])
  })

  it('键按名称排序、字段顺序固定，保证 diff 稳定', () => {
    const collections = new Map([
      [
        'b',
        makeCollection({
          width: 24,
          icons: { z: { body: 'Z' }, a: { body: 'A', rotate: 2 } },
        }),
      ],
    ])

    const { icons } = buildIconMap(collections, ['b:z', 'b:a'])

    expect(Object.keys(icons)).toEqual(['b:a', 'b:z'])
    expect(Object.keys(icons['b:a'])).toEqual(['body', 'width', 'rotate'])
  })
})
