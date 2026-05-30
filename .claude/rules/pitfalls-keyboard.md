# 快捷键系统踩坑

## 无修饰键模式必须检查 keymap 绑定

`matchShortcut` 在 `noModifierMode=true` 时，对 `ALLOWED_SET` 中所有键都返回 `e.code`（包括方向键、字母、数字、功能键等）。但 keymap 中可能**没有实际绑定**该键的命令或书签。

**Why：** 如果只看 `matchShortcut` 返回值就调用 `preventDefault()` + `stopPropagation()`，会吞掉页面原生的按键行为。例如视频网站的方向键控制进度、F 键全屏等。

**How to apply：** 在 `handleKeydown` 中，`matchShortcut` 返回后必须**额外检查 keymap 中是否存在对应绑定**（`commandKeymap[code]?.command` / `bookmarkKeymap[code]?.url`），只有真正绑定了才发送消息和拦截事件。Content Script 和 newtab executor 两端都要遵守。

## 输入框检测：`activeElement` 优先 + `composedPath()` 兜底

`isInInputElement(e)` 采用双路径检测：

| 检测源 | 覆盖场景 |
|--------|---------|
| `document.activeElement`（优先） | 焦点转移竞态：点击输入框后立即按键，focus 事件先于 keydown，`activeElement` 已更新 |
| `e.composedPath()`（兜底） | Shadow DOM 穿透：当 `activeElement` 指向 Shadow Host 时，`composedPath` 包含 Shadow Root 内实际 input |

**Why：**
- 仅用 `composedPath()`：点击输入框后立即按键时，keydown 事件的 target 可能仍是旧元素，漏判
- 仅用 `activeElement`：Shadow DOM 内输入框可能指向 host 而非实际 input
- Vimium C 以 `activeElement` 为主要检测手段（`findNewEditable`），原始 Vimium 同时检查 `event.target` 和 `activeElement`

**How to apply：**
- 检测 `contenteditable` 时使用 `element.isContentEditable`（DOM 只读属性，自动处理继承链），而非 `getAttribute('contenteditable')`
- `<input>` 必须区分 type：`button`/`checkbox`/`radio`/`file`/`hidden`/`image`/`submit`/`reset`/`color`/`range` 不属于可编辑输入
- 额外检测 `<embed>` 和 `<object>`（可聚焦的嵌入式内容）
