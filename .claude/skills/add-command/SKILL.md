---
name: add-command
description: NaiveTab 浏览器扩展的全局命令快捷键开发指南。当用户要新增/修改命令快捷键（如新增 tab 操作、页面滚动、窗口操作等命令）时使用。涵盖需要修改的完整文件清单、执行环境分类、类型注册等，防止遗漏关键步骤。
---

# NaiveTab Add Command

新增命令快捷键需按以下步骤完成。核心原则：**`COMMAND_CATEGORIES` 是单一数据源**，所有命令类型从它派生。

## 决策树：你的命令在哪执行？

```
新增命令 → 确定执行环境：
  └─ 'sw'      → Service Worker 执行（chrome.tabs 等浏览器 API）
  └─ 'cs'      → Content Script 执行（DOM 操作：滚动、复制、刷新页面）
  └─ 'newtab'  → NaiveTab 页面执行（localConfig / globalState 操作）
```

## 必须修改的文件

### Step 1 — `src/logic/icons.ts`

在 `COMMAND_ICONS` 中定义图标：

```ts
export const COMMAND_ICONS = {
  // ... 已有图标 ...
  myCommand: 'mdi:some-valid-icon',   // ← 先在这里定义
}
```

> 图标来自 [Iconify](https://icon-sets.iconify.design/)，需验证图标名存在。可以复用已有图标（如多个命令共用 `mdi:pin-outline`）。

### Step 2 — `src/logic/globalShortcut/shortcut-command.ts` ⚠️ 核心文件

**2-A：在 `COMMAND_CATEGORIES` 对应分类中添加命令**

```ts
{
  categoryKey: 'commandCategory.tabManagement',
  commands: [
    // ... 已有命令 ...
    { command: 'myCommand', iconName: COMMAND_ICONS.myCommand },
    // 如果非 SW 执行，需标注 execEnv：
    // { command: 'myDomCommand', execEnv: 'cs' as const, iconName: COMMAND_ICONS.myDomCommand },
  ],
}
```

**2-B：如果是新分类，新建一个分类对象：**

```ts
{
  categoryKey: 'commandCategory.myCategory',
  commands: [
    { command: 'myCommand', iconName: COMMAND_ICONS.myCommand },
  ],
}
```

**2-C：根据 `execEnv` 更新类型约束（仅在需要时）：**

| 执行环境 | 需要更新的类型 | 说明 |
|---------|--------------|------|
| `'cs'` | `TCsCommandName` | 新增联合类型成员 |
| `'newtab'` | `TNewtabCommandName` | 新增联合类型成员 |
| `'sw'`（默认） | 无需额外操作 | 自动从 `TCommandName` 排除 CS/newtab 命令后派生 |

> `TCommandName`、`TSwCommandName` 会从 `COMMAND_CATEGORIES` 自动派生，无需手动维护。

**2-D：（可选）添加默认 keymap 绑定**

在 `KEYBOARD_COMMAND_CONFIG.keymap` 中添加默认按键绑定：

```ts
keymap: {
  // ... 已有绑定 ...
  KeyX: { command: 'myCommand' },   // ← 新增
}
```

**2-E：（仅滚动命令）添加到 `REPEATABLE_SCROLL_COMMANDS`**

如果命令支持按住持续触发（如 scrollUp/Down/Left/Right）：

```ts
export const REPEATABLE_SCROLL_COMMANDS = new Set([
  'scrollUp',
  'scrollDown',
  'scrollLeft',
  'scrollRight',
  'myRepeatableCommand',   // ← 新增
] as const)
```

### Step 3 — 根据 `execEnv` 实现命令逻辑

#### SW 命令（`execEnv: 'sw'`，默认值）

在 `src/background/command-registry.ts` 中：

```ts
// 3-A：实现 handler 函数
const myCommand = (tabId: number) => {
  chrome.tabs.update(tabId, { /* ... */ }).catch(logLastError)
}

// 3-B：在 COMMAND_HANDLERS Record 中注册
const COMMAND_HANDLERS: Record<TSwCommandName, CommandHandler> = {
  // ... 已有条目 ...
  myCommand,
}
```

> ⚠️ 缺少 `COMMAND_HANDLERS` 注册项会导致 TS 编译报错（`TSwCommandName` 类型约束）。

#### CS 命令（`execEnv: 'cs'`）

在 `src/contentScripts/index.ts` 的 `commandExecutors` 中添加：

```ts
const commandExecutors: Record<string, () => void> = {
  // ... 已有执行器 ...
  myCommand: () => {
    // DOM 操作，例如：
    document.body.style.background = 'red'
  },
}
```

如果是滚动类命令，还需在 `src/contentScripts/scroll.ts` 中实现滚动逻辑，并在 `src/logic/globalShortcut/shortcut-command.ts` 的 `REPEATABLE_SCROLL_COMMANDS` 中注册（见 Step 2-E）。

#### NaiveTab 本地命令（`execEnv: 'newtab'`）

在 `src/logic/globalShortcut/shortcut-executor.ts` 中添加执行器：

```ts
// 控制类命令（操作 localConfig / globalState）
const newtabControlExecutors: Record<string, () => void> = {
  // ... 已有执行器 ...
  myCommand: () => {
    localState.value.isFocusMode = !localState.value.isFocusMode
  },
}
```

> `newtabCommandExecutors` 用于 CS 命令在 newtab 页面的执行（或静默忽略）。如果命令在 newtab 页面无意义，在 `newtabCommandExecutors` 中添加空函数 `() => {}` 静默忽略。

### Step 4 — `src/types/messages.ts`

消息类型通常**不需要修改**。`MSG_KEYDOWN`、`MSG_EXECUTE_COMMAND`、`MSG_INIT_COMPLETE`、`MSG_HELLO` 已覆盖所有场景。

仅在需要新增消息类型时才修改此文件。

### Step 5 — i18n：`src/locales/zh-CN.json` 和 `en-US.json`

**命令名称（必须）：**

```json
{
  "command": {
    "myCommand": "我的命令"
  }
}
```

**分类名称（如果新建了分类）：**

```json
{
  "commandCategory": {
    "myCategory": "我的分类"
  }
}
```

> ⚠️ zh-CN.json 和 en-US.json 必须同步更新。

---

## 新增命令的完整检查清单

| 检查项 | SW 命令 | CS 命令 | Newtab 命令 |
|-------|--------|--------|-----------|
| `COMMAND_ICONS` 定义图标 | ✅ | ✅ | ✅ |
| `COMMAND_CATEGORIES` 注册 | ✅ | ✅ | ✅ |
| `execEnv` 标注（非 SW 时） | 不需要 | ✅ `execEnv: 'cs'` | ✅ `execEnv: 'newtab'` |
| 类型联合更新（TCs/TNewtab） | 不需要 | ✅ | ✅ |
| SW handler 实现 | ✅ | 不需要 | 不需要 |
| CS executor 实现 | 不需要 | ✅ | 不需要 |
| newtab executor 实现 | 不需要 | 可选（或空函数忽略） | ✅ |
| keymap 默认绑定 | 可选 | 可选 | 可选 |
| REPEATABLE_SCROLL_COMMANDS | 仅滚动命令 | 仅滚动命令 | 不需要 |
| i18n 命令名称 | ✅ | ✅ | ✅ |
| i18n 分类名称（新分类时） | ✅ | ✅ | ✅ |

---

## 无需手动修改（自动处理）

| 文件 | 机制 |
|------|------|
| `shortcut-command.ts` 中的 `TCommandName`、`TSwCommandName` | 从 `COMMAND_CATEGORIES` 自动派生 |
| `SW_COMMANDS`、`CS_COMMANDS`、`NEWTAB_COMMANDS` 运行时列表 | 从 `COMMAND_CATEGORIES` 过滤派生 |
| `getCommandExecEnv()` | 遍历 `COMMAND_CATEGORIES` 查找 |
| Setting 面板的命令选择器 | 遍历 `COMMAND_CATEGORIES` 分组渲染 |
