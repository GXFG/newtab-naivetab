---
name: config-migration
description: NaiveTab 浏览器扩展的配置迁移开发指南。当用户要修改持久化配置结构（新增/重命名/删除字段、修改类型）时使用。强制走 MIGRATION_STEPS 迁移步骤表，防止破坏老用户数据。
---

# NaiveTab Config Migration

任何持久化配置结构修改都**不能破坏老用户数据**。

## 核心前提

迁移知识只有**一份**：`src/logic/config/migrations.ts` 的 `MIGRATION_STEPS`。

本机升级（`handleAppUpdate`）与导入备份（`importSetting`）共用这张表，区别只在 `ctx.mode` 与是否注入 `ctx.host`。

> **禁止在 `handleAppUpdate` 里写 `if (version < X)` 迁移分支。** 导入路径不经过它，旧备份会静默丢掉字段——这是本项目已经发生过的事故。

## 迁移流程

### Step 1 — 修改默认配置

在 `src/logic/config/defaults.ts` 的 `defaultConfig` / `defaultLocalState` 中新增或修改字段。

> 注意是 `defaults.ts`，**不是 `state.ts`**——后者只导出响应式实例 `localConfig` / `localState`。

### Step 2 — 在 `MIGRATION_STEPS` 追加步骤

`src/logic/config/migrations.ts` 数组末尾追加（顺序即执行顺序）：

```ts
{
  version: '2.8.0',          // 生效门限：源版本低于此值时执行
  summary: 'xxx 字段迁移到新结构',  // 日志与测试标题用，必填
  apply({ config }) {
    config.xxx.newField = oldValue
    delete config.xxx.oldField
  },
},
```

**步骤约束**（`migration-chain.test.ts` 会强制校验前三条）：

- 按 `version` **严格升序**；后一步可以依赖前一步产出的结构
- 步骤内**禁止** import `localConfig` / `localState`，只许读写 `ctx.config`；需要本机副作用时走 `ctx.host`（导入模式下 `host` 不存在，这类逻辑自动跳过）
- 步骤**不写版本号、不弹 toast、不记统计**——这些属于入口收尾
- 缺字段不必在这里赋值，`updateSetting` 的 `mergeState` 会按默认值补齐；只有「必须与默认值解耦」的字段才显式赋值
- 删除字段一定要 `delete`：漏掉的老字段会被当作合法数据继续向上传播

### Step 3 — 补测试（必做）

在 `src/logic/__tests__/migration-chain.test.ts` 追加一条「旧结构 → 新结构」用例：

```ts
it('2.8.0：xxx 字段从旧结构迁移到新结构', () => {
  const config = seed({ xxx: { oldField: 1 } })
  runMigrations(
    { mode: 'upgrade', config, defaults: defaultConfig, host: noopHost() },
    '2.7.0',
    '2.8.0',
  )
  expect(config.xxx.newField).toBe(1)
  expect(config.xxx.oldField).toBeUndefined()
})
```

若改动了默认值，`config-snapshot.test.ts` 的快照会失败——确认差异是**有意为之**后再更新快照。

### Step 4 — 版本号由用户手动修改

`package.json` 的 `version` 只能由用户改，AI 不要动。

## 迁移场景速查

| 场景 | 正确做法 | 错误做法 |
|------|----------|----------|
| 新增扁平字段 | `MIGRATION_STEPS` 追加步骤，或依赖 `mergeState` 补默认 | 只改 `defaultConfig` |
| 新增嵌套对象 | 在步骤中整体赋值 | 只依赖浅合并 |
| 重命名字段 | 新字段 = 旧字段值 → `delete` 旧字段 | 直接改字段名 |
| 删除字段 | 先 `delete` 旧值 → 再从 `defaults` 删 | 直接从 `defaults` 删 |
| 修改类型 | 新增替代字段 + 迁移 | 直接改类型 |
| 顶层 key 改名 | `migrate.ts` 的 `TOP_LEVEL_RENAME_MAP` | 在步骤里手写 |

## 关键规则

- `MIGRATION_STEPS` 严格升序，`migration-chain.test.ts` 校验升序、无超前版本、必须有 `summary`
- `mergeState` 以默认配置为模板过滤废弃字段；keymap 和数组直接替换、不深合并
- 嵌套对象新增字段不能依赖浅合并，必须在步骤中手动赋值
- 修改 keyboard 配置时，重命名/删除字段必须同步修改 `src/background/config/cache.ts`

## 测试相关

测试 mock `@/logic/config/defaults` 时，必须同时提供 `KEYBOARD_COMMON_CONFIG` 与 `defaultFocusVisibleWidgetMap`——迁移步骤在模块作用域读取它们，缺了会直接报错。

## 注意事项

- 完整踩坑见 [pitfalls-config.md](../../rules/pitfalls-config.md)
- 架构说明见 [config.md](../../../docs/architecture/config.md#配置迁移系统)
- 步骤表源码注释（`migrations.ts` 顶部）本身就是最准确的规则说明，改之前先读
