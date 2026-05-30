---
name: config-migration
description: NaiveTab 浏览器扩展的配置迁移开发指南。当用户要修改持久化配置结构（新增/重命名/删除字段、修改类型）时使用。强制走 handleAppUpdate 迁移流程，防止破坏老用户数据。
---

# NaiveTab Config Migration

任何持久化配置结构修改都**不能破坏老用户数据**。本技能确保迁移流程正确执行。

## 迁移流程

### Step 1 — 修改默认配置

在 `src/logic/config/state.ts` 的 `defaultConfig` 或 `defaultState` 中添加/修改字段。

### Step 2 — 升版本号

修改 `package.json` 的 `version` 字段（由用户手动操作）。

### Step 3 — 添加迁移分支

在 `src/logic/config/update.ts` 的 `handleAppUpdate` 函数中添加迁移分支：

```ts
// 使用 if 而非 if-else，确保跨版本用户依次执行所有迁移
if (compareLeftVersionLessThanRightVersions('2.6.0', localVersion)) {
  // 迁移逻辑
  localConfig.value.newField = 'defaultValue'
  // 或使用 mergeState 合并
  mergeState(defaultConfig, localConfig.value)
}
```

## 迁移场景速查

| 场景 | 正确做法 | 错误做法 |
|------|----------|----------|
| 新增扁平字段 | 在 `handleAppUpdate` 中赋值 | 只改 `defaultConfig` |
| 新增嵌套对象 | 整体赋值 `defaultConfig.xxx` | 只依赖浅合并 |
| 重命名字段 | 新字段=旧字段值 → delete 旧字段 | 直接改字段名 |
| 删除字段 | 先 `delete` 旧值 → 再删 `defaultConfig` | 直接从 `defaultConfig` 删 |
| 修改类型 | 新增替代字段 + 迁移 | 直接改类型 |

## 关键规则

- `handleAppUpdate` 使用 `if` 而非 `if-else`，确保跨越多个版本的旧用户能依次执行所有迁移
- `mergeState` 以默认配置为模板过滤废弃字段；keymap 和数组直接替换不深合并
- 嵌套对象新增字段不能依赖浅合并，必须在迁移分支中手动赋值
- 修改 keyboard 配置时，重命名/删除字段必须同步修改 `src/background/config/cache.ts`

## 注意事项

- 完整规则见 [pitfalls-config.md](../.claude/rules/pitfalls-config.md)
- 架构说明见 [config.md](../../docs/architecture/config.md#配置迁移系统)
