# 背景图系统架构

## 文件索引

| 文件 | 职责 |
|------|------|
| `src/logic/image/state.ts` | 响应式状态：图片库数据（bing/pexels）、图片渲染状态、加载标记 |
| `src/logic/image/service.ts` | 核心逻辑：DB 读写、加载/渲染、图库管理、watch 监听 |
| `src/newtab/layers/BackgroundImg.vue` | 渲染组件：双层渲染、视差效果、loading 指示器 |
| `src/setting/panes/general/BackgroundDrawer.vue` | 设置抽屉：图片列表展示、虚拟滚动 |
| `src/setting/panes/general/BackgroundDrawerImageElement.vue` | 图片原子组件：展示、选中、收藏、工具栏 |
| `src/logic/image/constants.ts` | 来源类型常量 |
| `src/logic/config/defaults.ts` | 背景相关默认配置字段 |

## 三种图片来源

| 来源 | 值 | 说明 | 存储表 |
|------|---|------|--------|
| LOCAL | 0 | 用户本地上传 | `localBackgroundImages` |
| NETWORK | 1 | Bing/Pexels 图库或自定义 URL | `currBackgroundImages` |
| BING_PHOTO | 2 | Bing 每日一图，自动同步双外观 | `currBackgroundImages` |

## 大小图分离策略

| 层级 | 存储 | 读取方式 | 用途 |
|------|------|----------|------|
| 小图（压缩 base64） | localStorage `l-firstScreen` | 同步读取 | 首屏秒开，避免白屏 |
| 大图（原始 File） | IndexedDB | 异步 decode | 高清渲染 |

### smallBase64 流转路径

`smallBase64` 是原图压缩后的 base64 缩略图，贯穿整个首屏加载链路：

**生成**
```
① 用户本地上传
   storeLocalBackgroundImage(file)
   → compressedImageUrlToBase64(objectUrl) → smallBase64

② 网络图片首次下载
   downloadAndStoreNetworkImage()
   → compressedImageUrlToBase64(imageUrl) → smallBase64

③ 自定义 URL
   downloadAndApplyCustomUrl(url)
   → urlToFile(url) → compressedImageUrlToBase64() → smallBase64
   → 缓存到 currBackgroundImages DB，与网络图片共用缓存表
```

**三处存储**
```
                    ┌─────────────────────────────────────┐
                    │           compressedImageUrlToBase64 │
                    └────────────────────┬────────────────┘
                                         │ smallBase64
            ┌────────────────────────────┼────────────────────┐
            ▼                            ▼                    ▼
    ┌──────────────────┐      ┌──────────────────┐   ┌──────────────────┐
    │ localStorage     │      │ IndexedDB        │   │ imageState       │
    │ 'l-firstScreen'  │      │ *.smallBase64    │   │ previewImageUrl  │
    └────────┬─────────┘      └────────┬─────────┘   └────────┬─────────┘
             │                         │                      │
             ▼                         ▼                      ▼
    模块加载时同步读取           权威数据源，异步覆盖         响应式驱动渲染
    （首屏恢复，零延迟）        localStorage 的旧值          CSS backgroundImage
```

| 存储位置 | 读取时机 | 为什么需要 |
|---------|---------|-----------|
| `localStorage['l-firstScreen']` | 模块顶层同步 `getItem` | IndexedDB 打开需异步，首屏不能等 |
| IndexedDB `{smallBase64}` | `initBackgroundImage()` 异步读取 | 权威数据源，覆盖可能过期的 localStorage |
| `imageState.previewImageUrl` | `BackgroundImg.vue` computed | 响应式驱动 CSS，模块加载时赋初值 |

**恢复与同步**

| 场景 | 操作 |
|------|------|
| 应用启动 | 模块加载 → 同步读 `l-firstScreen` 赋给 `previewImageUrl`；DB 打开后读 `smallBase64` 覆盖 |
| 大图 decode 成功 | `localStorage.setItem('l-firstScreen', dbData.smallBase64)` 确保下次刷新可用 |
| 来源切回 LOCAL | DB 读 `smallBase64` → 写 localStorage + 恢复 `previewImageUrl`（一次查询两处复用） |

## 双层渲染机制

```
┌─────────────────────────────────┐
│ body (background-color:          │
│   --nt-bg-main, 用户配置色)      │  ← 首屏兜底，index.html 内联样式防止闪烁
│  ┌──────────────────────────┐   │
│  │ #background (透明容器)    │   │
│  │  ┌────────────────────┐  │   │
│  │  │ #background__       │  │   │ ← 第一层：previewImageUrl (base64 小图)，立即渲染
│  │  │  container           │  │   │   z-index: 1
│  │  └────────────────────┘  │   │
│  │  ┌────────────────────┐  │   │
│  │  │ #background__blob   │  │   │ ← 第二层：fullImageUrl (blob URL 大图)
│  │  │  z-index: 2,        │  │   │   opacity: 0→1, decode 后触发 0.6s CSS 淡入过渡
│  │  │  opacity: 0→1       │  │   │
│  │  └────────────────────┘  │   │
│  └──────────────────────────┘   │
└─────────────────────────────────┘
```

**背景色层级：** `#background` 容器本身透明，背景色由 `body` 的 `--nt-bg-main` CSS 变量提供（用户在 Setting 面板配置），来自 `src/logic/config/defaults.ts` 的 `backgroundColor` 字段。关闭背景图时，用户配置色直接可见。

## 加载流程

```
initBackgroundImage()
  ├── 1. 从 DB 读取 smallBase64 → 覆盖 previewImageUrl + 同步 localStorage
  ├── 2. 根据来源加载大图：
  │     ├── BING_PHOTO → refreshTodayImage()（检查今日图片是否更新）
  │     └── 其他 → renderRawBackgroundImage()
  │           ├── 自定义 URL 开启？→ downloadAndApplyCustomUrl()（缓存到 currBackgroundImages DB）
  │           ├── DB 无数据或缓存损坏？→ downloadAndStoreNetworkImage()
  │           ├── DB 有有效缓存？→ validateImageFile() 校验图片有效性
  │           ├── 创建 ObjectURL → Image().decode()
  │           ├── decode 成功 → fullImageUrl = blobUrl（CSS 淡入）
  │           └── 同步 smallBase64 到 localStorage
  └── 3. watch 监听：
        ├── currAppearanceCode → 切换主题时重新渲染
        ├── isBackgroundImageEnabled → 开启时重新加载当前来源图片
        └── backgroundImageSource / backgroundImageList / backgroundImageHighQuality /
            isBackgroundImageCustomUrlEnabled / backgroundImageCustomUrls → 来源或配置变化时重新加载
```

## 关键设计

### 切换守卫（pendingAppearanceCode）

快速切换浅色/深色主题时，前一个 decode 回调可能后于新的渲染完成。
`pendingAppearanceCode` 记录当前正在加载的图片所属外观码，decode 回调中检查
是否匹配，不匹配则丢弃结果并 revoke blob URL。

**为什么单变量不会出现竞态？** 当前系统仅有 2 个外观（0/1），每个外观码对应固定的图片内容。快速切换时多个 `renderRawBackgroundImage` 调用会覆盖 `pendingAppearanceCode`，但 `decodeAndApplyImage` 中的守卫确保只有与最新外观码匹配的回调才能更新 `imageState`。DB 写入按 `appearanceCode` 作为 keyPath 写入 IndexedDB，即使过期请求写入 DB，写入的也是对应外观码的正确图片，不会造成数据错乱。详见 `service.ts` 模块顶部注释。

**`pendingAppearanceCode` 在 `renderRawBackgroundImage` 入口处统一设置**（所有分支：LOCAL / NETWORK / BING_PHOTO / 自定义URL 均经过此处），
`decodeAndApplyImage` 的 `then` 和 `catch` 分支中均检查。这确保无论 decode 成功或失败，过期请求都不会污染新主题的背景图。

### 来源切换策略

切换来源时，**只删除网络缓存表 `currBackgroundImages`，不删除用户上传的本地图片表 `localBackgroundImages`**。

`localBackgroundImages` 是用户主动导入的持久数据，必须在来源切换时保留，否则从 NETWORK/BING_PHOTO 切回 LOCAL 时图片会丢失。

watch 监听 `backgroundImageSource`、`backgroundImageList`、`backgroundImageHighQuality`、
`isBackgroundImageCustomUrlEnabled`、`backgroundImageCustomUrls` 等字段。

**陷阱：Vue 3 watch 对 reactive 内部数组的值比较失效。** 对 `reactive` 对象内部的数组使用 `watch`（无论是否设置 `deep: true`），回调的 `oldValue` 和 `newValue` 始终指向同一个代理引用，导致值比较永远相等。因此，数组 getter 必须使用 `JSON.stringify()` 序列化为字符串，使比较变为原始类型对比。原始值字段（如 `backgroundImageSource`、`backgroundImageHighQuality`）不受此影响。

**删除缓存条件：** 仅在**真正切换来源**（`oldSource !== newSource`）时才删除旧缓存。自定义 URL 开关/地址、画质开关等不删除缓存，避免误删有效数据。

**首次触发处理：** 首次触发时 `oldSource` 为 `undefined`，不删除任何数据（无需删除）。

**fullImageUrl 保留策略：** 来源切换时**不清空 `imageState.fullImageUrl`**。UX 上保留旧大图直到新图加载完成并覆盖，避免切换过程中出现背景色闪烁。`decodeAndApplyImage` 在设置新 blob URL 前会调用 `revokeOldBlobUrl()` 回收旧 URL 防止内存泄漏。关闭背景图开关时同理保留缓存，确保重新开启时旧图作为过渡画面立即显示。

切换流程：
```
来源切换 watch 触发
  ├── oldSource 存在且 newSource !== oldSource 且 oldSource !== LOCAL？
  │     ├── 是 → 删除 currBackgroundImages 两个 appearanceCode 的缓存数据
  │     └── 否 → 不删除任何数据（保留用户上传的本地图片 / 非来源切换场景）
  ├── 画质切换（highQuality 变化）？
  │     └── 是 → 删除 currBackgroundImages 两个 appearanceCode 的缓存（需以新质量参数重新下载）
  ├── 网络图片变更（backgroundImageList 深拷贝值变化）？
  │     └── 是 → 删除 currBackgroundImages 两个 appearanceCode 的缓存（用户选了新图片）
  ├── 自定义 URL 关闭？
  │     └── 是 → 删除 currBackgroundImages 两个 appearanceCode 的缓存
  │              设计取舍：无法从缓存中区分自定义 URL 图片 vs 网络图片，全量删除避免回退到自定义 URL 图片。
  │              网络图片缓存会在下次使用时自动重建，不影响功能正确性。
  ├── 新旧来源不同且旧来源为 LOCAL？
  │     └── 是 → 清空 imageState.previewImageUrl，避免显示过期 blob URL
  ├── newSource === LOCAL？
  │     └── 一次 DB 查询 → smallBase64 写入 localStorage + 恢复 previewImageUrl（两处复用结果）
  └── renderRawBackgroundImage() 重新加载并渲染新来源图片
      └── 仅渲染当前 appearanceCode（另一外观在用户切换主题时按需加载）
```

### isBackgroundImageEnabled 开关行为

`isBackgroundImageEnabled` 有独立的 watch：
- **关闭时**：不做任何操作，保留 `imageState` 缓存，Setting 面板仍可查看当前背景图
- **开启时**：调用 `renderRawBackgroundImage()` 重新加载当前来源的图片

这一设计确保：关闭背景图期间切换来源后，重新开启时能正确加载新来源的图片。

### Setting 面板当前背景图展示

`BackgroundDrawer.vue` 中的「当前背景图」预览不能直接使用 `imageState.previewImageUrl`，
因为该字段仅对 LOCAL 来源有效（base64 小图）。NETWORK/BING_PHOTO 来源在 `Image.decode()`
完成前 `previewImageUrl` 可能为空或显示旧来源残留。

组件通过 `currentBackgroundPreviewUrl` computed 根据来源类型动态计算正确 URL：

| 来源 | URL 来源 |
|------|----------|
| LOCAL (0) | `imageState.previewImageUrl`（上传时直接设置；从其他来源切回时从 DB 恢复 `smallBase64`） |
| NETWORK (1) + 自定义 URL | `localConfig.general.backgroundImageCustomUrls[appearanceCode]` |
| NETWORK (1) + Bing/Pexels | `getImageUrlFromName(backgroundImageList[appearanceCode].networkSourceType, backgroundImageList[appearanceCode].name)` |
| BING_PHOTO (2) | `getImageUrlFromName(BING, bing.list[0].name)`（每日一图） |

### 首屏优化

- 模块加载时同步读取 `localStorage.getItem('l-firstScreen')` 初始化 `previewImageUrl`
- Vue 挂载前即可恢复背景图，不依赖 IndexedDB 异步打开
- `src/newtab/index.html` 内联 `<style>` 设置首屏 `body` 背景色（浅色 `#e8ecf1` / 深色 `#1a1a2e`），与默认配置一致，消除浏览器默认白/黑背景跳变。JS 加载后 `--nt-bg-main` 变量通过 `global.css` 覆盖此值
- `#background` 容器本身透明，背景色由 `body` 的 CSS 变量提供
- **`l-firstScreen` 安全写入：** 所有 `localStorage.setItem('l-firstScreen', ...)` 均通过 `safeSetFirstScreen` 封装，`catch` 静默处理 `QuotaExceededError`，避免超出 5MB 配额时抛出未捕获异常
- **来源切换清理：** 离开 LOCAL 来源时，同时清空 `imageState.previewImageUrl` 和 `l-firstScreen`，避免刷新页面时显示旧来源的过期预览图

### IndexedDB 数据校验

从 IndexedDB 读取背景图 File 后，进行**两级校验**：

1. **size 校验**：检查 `file.size > 0`，过滤空数据
2. **图片有效性校验**：通过 `validateImageFile()` 创建 blob URL 并用 `<img>` 尝试加载，确认 File 是否为有效图片

仅检查 size 不够——size > 0 的非图片数据（如 HTTP 200 返回的 HTML 错误页、下载中断的残缺数据、浏览器升级导致的 IndexedDB blob 损坏）也会通过 size 检查，但 `img.decode()` 时会失败。

**处理策略：**
- **LOCAL 来源**：校验失败则清空预览和大图，终止渲染
- **网络来源**：校验失败则删除 `currBackgroundImages` 中对应 appearanceCode 的缓存，走下载流程重新获取图片

### 本地图片上传统一入口

**禁止在组件中直接操作 IndexedDB 存储背景图。** 所有本地上传逻辑必须通过 `image.ts` 中的 `storeLocalBackgroundImage(file)` 方法统一处理：

```
storeLocalBackgroundImage(file)
  ├── 1. 压缩生成 smallBase64 → 写入 localStorage 首屏秒开
  ├── 2. 写入 localBackgroundImages DB（当前 appearanceCode）
  ├── 3. 若另一外观码无数据 → 自动同步相同图片（双外观一致）
  └── 4. renderRawBackgroundImage() 触发大图渲染
```

### imageState 响应式约束

`imageState` 使用 `reactive()` 包裹，**禁止在任何地方解构**（如 `const { fullImageUrl } = imageState`），
否则响应性断裂。应始终通过 `imageState.xxx` 的方式访问属性。

### 双外观同步约束

BING_PHOTO 和 LOCAL 上传场景使用 `getOppositeAppearanceCode(code)` 同步另一外观的背景图。
该函数集中管理 `0 → 1` / `1 → 0` 的互反逻辑，依赖 `currAppearanceCode` 仅有 `0` 和 `1` 两个值。
**若未来支持多外观（>2），此函数及所有双外观同步逻辑需同步改造。**

### Bing 本地壁纸列表

Bing 每日一图的壁纸列表通过 `fetch('/assets/bing-wallpaper.md')` 读取本地打包的 Markdown 文件（打包时注入扩展），使用 `requestIdleCallback` 分批解析避免阻塞主线程。该文件仅加载一次，内容不变。

## 配置字段

| 字段 | 类型 | 说明 |
|------|------|------|
| `isBackgroundImageEnabled` | boolean | 是否启用背景图 |
| `backgroundImageSource` | 0/1/2 | 图片来源 |
| `backgroundImageHighQuality` | boolean | UHD 画质 |
| `backgroundImageList` | `[{networkSourceType, name}, ...]` | 浅色/深色模式图片配置（各含来源类型+图片名） |
| `isBackgroundImageCustomUrlEnabled` | boolean | 自定义 URL 开关 |
| `backgroundImageCustomUrls` | [string, string] | 浅色/深色自定义 URL |
| `bgOpacity` | number | 背景图不透明度 |
| `bgBlur` | number | 背景图模糊度(px) |
| `isParallaxEnabled` | boolean | 视差效果开关 |
| `parallaxIntensity` | number | 视差强度 |
| `favoriteImageList` | Array | 收藏图片列表 |
