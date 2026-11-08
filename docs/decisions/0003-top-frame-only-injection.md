# 0003. Content Script 只注入顶层 frame，不支持 iframe

- 状态：已采纳
- 日期：2026-11-06
- 相关代码：`src/manifest.ts`（`allFrames: false`）

## 背景

`<all_urls>` 匹配的页面里大量存在 iframe。Vimium C 这类工具体验上"到处都能用"，是因为它开启了 `all_frames: true`。这个对比会让人本能地觉得 `allFrames: false` 是能力缺失。

## 决策

CS 只注入顶层 frame（`allFrames: false`）。iframe 内不响应快捷键。

## 被否的方案

**开启 `allFrames: true`。** 理由：

- 快捷键操作的对象都是顶层页面：切标签、刷新、打开书签，没有一条是 iframe 内的动作。
- 成本与收益倒挂：每个 iframe 都要一份 CS 实例、一条 Port、一次 gzip 配置解析。一个页面 5 个 iframe 就是 5 倍资源，换不到任何用户收益。
- 雪崩风险：多个 frame 同时检测到 keydown 会重复执行命令（例如连续切换好几次标签）。
- Vimium 之所以必须全 frame 注入，是它的 link hints 要在每个 frame 内渲染标记点。NaiveTab 没有跨 frame 需求，照搬只会引入 `vApi` 协调、MAIN world 拦截、frame 间 keymap 继承这一整套复杂度。

## 后果

- iframe 内的滚动、复制等 DOM 命令不生效。**这是有意接受的能力缺口，不是 bug。**
- 若将来真的要做跨 frame 能力（例如在 iframe 内高亮元素），需要重新评估这套结论，而不是直接把开关改成 `true`。
