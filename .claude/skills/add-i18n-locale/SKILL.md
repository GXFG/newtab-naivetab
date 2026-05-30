---
name: add-i18n-locale
description: NaiveTab 浏览器扩展的 i18n 国际化开发指南。当用户要新增/修改翻译文本、添加多语言 key 时使用。涵盖中英文同步更新规则、变量替换模式等，防止遗漏或格式错误。
---

# NaiveTab Add i18n Locale

新增或修改 i18n 翻译文本需遵守以下规则。

## 文件位置

- 中文：`src/locales/zh-CN.json`
- 英文：`src/locales/en-US.json`

**两个文件必须同步更新**，不能只改一个。

## Key 命名规范

采用扁平嵌套结构，按功能分组：

```json
{
  "common": {
    "save": "保存",
    "cancel": "取消"
  },
  "setting": {
    "group": {
      "myPane": "我的面板"
    }
  }
}
```

引用方式：`window.$t('common.save')` 或模板中 `$t('setting.group.myPane')`。

## 变量替换

使用 `__key__` 占位符 + `.replace()` 方式，**禁止**使用 vue-i18n 默认的 `{key}` 语法：

```vue
<!-- 正确 -->
{{ $t('key.xxx').replace('__n__', value) }}

<!-- 错误 -->
{{ $t('key.xxx', { n: value }) }}
```

```ts
// 正确
window.$t('key.xxx').replace('__count__', String(count))
```

## 覆盖范围

所有面向用户的文本都必须 i18n，包括但不限于：
- Dialog 的 `title`/`content`/`positiveText`/`negativeText`
- `showToast` / `$notification` 文案
- `placeholder`、按钮文案
- Setting 面板的 `labelKey`

## 注意事项

- 写代码时先想 i18n key，再写实现
- 不要因为"只是 dialog 文案"就跳过 i18n
- 完整规则见 [no-hardcode.md](../.claude/rules/no-hardcode.md)
