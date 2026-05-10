# 项目踩坑记录

完整的踩坑清单见 [docs/conventions/pitfalls.md](docs/conventions/pitfalls.md)。

以下为高频触发的核心规则（便于 CLAUDE.md 直接加载）：

- **`&--modifier` 禁止：** `postcss-preset-env` 不支持 `&--xxx` BEM 拼接，modifier 必须写完整类名。
- **v-bind TDZ：** `v-bind()` 引用的变量声明必须放在 `<script setup>` 最顶部，imports 之后、任何逻辑代码之前。
- **Flexbox `min-width: 0`：** flex 链路上每一层都要有 `min-width: 0`。
- **CSS `rgba()` 不支持 `var()`：** alpha 通道必须写字面量。
- **Service Worker 异步：** `onChanged` 监听器必须返回 `Promise`。
- **WidgetWrap 限制：** `widget__wrap` div 的 style 由 WidgetWrap 自动注入，不可再 `:style` 绑定。
- **新增 Widget 检查 `@@@@`：** 全局搜索 `@@@@` 确认无遗漏。
- **handleAppUpdate 迁移：** 每次改配置结构都升 version 并新增迁移分支。
- **i18n 变量替换：** 必须用 `__key__` + `.replace()` 方式，禁止 vue-i18n 的 `{key}` 参数语法。即使 json 占位符写对了，调用端也要配套用 `.replace()`。
