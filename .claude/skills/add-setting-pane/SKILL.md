---
name: add-setting-pane
description: NaiveTab 浏览器扩展的 Setting 面板开发指南。当用户要新增 Setting 设置面板、添加新的设置页时使用。涵盖需要修改的完整文件清单、注册规范等，防止遗漏关键步骤。
---

# NaiveTab Add Setting Pane

新增 Setting 面板需按顺序完成以下步骤。

## 必须修改的文件

### Step 1 — `src/setting/registry.ts`：注册面板

在 `SETTING_GROUPS` 对应分组中追加：

```ts
{
  code: 'myPane',        // settingPanes 类型中的有效 code
  labelKey: 'setting.group.myPane',  // i18n key
}
```

- `code` 必须与 `src/setting/panes/{code}/index.vue` 路径一致
- `labelKey` 需要同步添加到 i18n 文件（见 Step 3）

### Step 2 — `src/setting/panes/{code}/index.vue`：面板组件

创建面板组件，必须：

- 使用 `<script setup lang="ts">`
- 使用 `src/setting/fields/` 中的原子组件，**禁止自行封装**
- 需要图标时在 `src/logic/constants/icons.ts` 的 `SETTING_ICON_META` 中注册

### Step 3 — i18n：添加翻译 key

在 `src/locales/zh-CN.json` 和 `src/locales/en-US.json` 中同步添加 `labelKey` 对应的翻译。

### Step 4（可选）— 关联 Widget

如果面板供特定 Widget 使用，在 `src/common/widget-constants.ts` 的 `WIDGET_SETTING_PANE_MAP` 中注册映射：

```ts
myWidget: 'myPane',
```

## 注意事项

- 禁止硬编码图标和文本（见 [no-hardcode.md](../.claude/rules/no-hardcode.md)）
- 面板内颜色使用双元素数组 `[浅色, 深色]`
- 完整规范见 [setting.md](../../docs/architecture/setting.md)
