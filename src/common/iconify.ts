/**
 * iconify 图标集离线注册
 *
 * `@iconify/vue` 默认在遇到未注册的图标名时请求 `api.iconify.design`。
 * 扩展的 UI 图标不应该依赖外部网络（离线/网络受限时界面会缺图标，且每个
 * 图标多一次网络往返），因此约定：
 *
 * 1. 所有图标组件从 `@iconify/vue/offline` 引入 —— 该构建不含任何远程加载逻辑；
 * 2. 构建期由 `pnpm gen:icons` 从 ICONS / COMMAND_ICONS 抽取图标数据，
 *    产出 `src/logic/constants/icon-set.json`（需提交），在此逐条注册。
 *
 * 为什么用 `addIcon` 而不是 `addCollection`：后者会先整包校验，任何一条别名
 * 父级解析不到就丢掉整个集合，且返回 void，调用方察觉不到；`addIcon` 逐条写入，
 * 一个图标的数据有问题只影响它自己。别名已在生成期摊平，这里拿到的都是实体图标。
 *
 * @see scripts/gen-icon-set.ts
 */
import { addIcon } from '@iconify/vue/offline'
import iconSet from '@/logic/constants/icon-set.json'

type IconData = Parameters<typeof addIcon>[1]

for (const [name, data] of Object.entries(iconSet)) {
  addIcon(name, data as IconData)
}
