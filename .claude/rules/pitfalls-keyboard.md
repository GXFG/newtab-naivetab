# 快捷键系统踩坑

## 无修饰键模式必须检查 keymap 绑定

`matchShortcut` 在 `noModifierMode=true` 时，对 `ALLOWED_SET` 中所有键都返回 `e.code`（包括方向键、字母、数字、功能键等）。但 keymap 中可能**没有实际绑定**该键的命令或书签。

**Why：** 如果只看 `matchShortcut` 返回值就调用 `preventDefault()` + `stopPropagation()`，会吞掉页面原生的按键行为。例如视频网站的方向键控制进度、F 键全屏等。

**How to apply：** 在 `handleKeydown` 中，`matchShortcut` 返回后必须**额外检查 keymap 中是否存在对应绑定**（`commandKeymap[code]?.command` / `bookmarkKeymap[code]?.url`），只有真正绑定了才发送消息和拦截事件。Content Script 和 newtab executor 两端都要遵守。


