# 搜索 Widget：引擎标识、模板与联想

> 引擎清单、模板、建议接口都在 `src/logic/constants/search.ts`；解析分支在 `src/api/search.ts`。本文只记录「读单个文件看不全」的部分。

## 1. 一次搜索由三样东西决定

| 字段 | 作用 | 缺了会怎样 |
|------|------|-----------|
| `localConfig.search.urlName` | 引擎标识：`SEARCH_ENGINE_LIST` 里的 `label`，或字面量 `'custom'` | 回退百度（图标、联想都按「未匹配」处理） |
| `localConfig.search.urlValue` | 搜索地址模板，**必须含 `{query}`** | 搜索词被丢弃，跳到固定地址，无报错 |
| `suggestUrl`（引擎条目上） | 联想接口地址，可选 | 联想回退百度 |

提交时由 `buildSearchUrl` 替换占位符并 `encodeURIComponent`，拿到地址后再决定当前标签页还是新标签页打开；返回 `null` 表示模板不合法，中止并提示。

## 2. `label` 是双重身份，这是最大的隐患

`label` 看起来只是个显示名，实际上它是**四条依赖链的分发键**：

1. 设置面板下拉的选项值
2. `localConfig.search.urlName` 的取值
3. `getSearchSuggestion` 里选择解析分支的匹配键
4. `currEngineIcon` 里查 `faviconUrl` 的匹配键

后果是**改名字不会报错，只会静默降级**：把 `Bing` 改成 `bing`，下拉照样能选、搜索照样能跳，但联想会落到函数末尾的百度分支——用户看到的是「Bing 里弹出的建议词是百度给的」，没有任何错误提示可循。

新增引擎时必须同时做三件事：加条目、加 `suggestUrl`、在 `getSearchSuggestion` 里加对应的解析分支。只加条目会走进同一个静默回退。Github / Qwant 这类没有公开建议接口的引擎**有意**不给 `suggestUrl`，回退百度是设计选择而不是遗漏——但这条区别只写在注释里，加新引擎的人很容易看不出。

这个设计的历史价值在于「一个字符串同时当 id 和文案」很省事；代价是任何展示层的措辞调整都可能变成功能缺陷。要根治得给引擎加独立 `id` 字段，属于跨设置面板、常量、API 三处的重构，值不值得另议。

## 3. 自定义引擎的开放边界

`urlName === 'custom'` 时 `urlValue` 完全由用户输入，设置面板只给了 `placeholder="https://example/search?q={query}"` 作提示，**不在输入时校验**。校验放在提交路径上：`buildSearchUrl`（`search/logic.ts`）判定模板是否含 `{query}`，不合法则中止跳转并弹 toast 说明原因与格式示例。

放在提交而不是输入时，是因为 `urlValue` 有三个来源：设置面板手输、导入配置、云同步下发。只在面板校验拦不住后两者。

三种曾经静默、现在会被拦下的输入错误：

- **漏写 `{query}`**：搜索跳到固定地址，输入的字丢掉。最容易发生，因为用户常直接粘贴一个搜索结果页 URL
- **空字符串**：`location.href = ''` 会重载当前页，用户看到的是「点了搜索什么都没发生」，比报错更难排查
- **写成两次 `{query}`**：已改用 `replaceAll`。此前用 `String.replace`，只替换第一个匹配，第二个原样留在地址里

自定义引擎的联想固定走百度（`engine?.label ?? 'Baidu'`），与「无 suggestUrl 回退」是同一条路径。

## 4. 联想能跨域，是因为扩展有 host 权限

各引擎的建议接口都没有 CORS 头，普通网页 `fetch` 取不到。Content Script 和扩展页面持有所声明的 host 权限，所以直接请求可行——**这是扩展独有的能力，不是搜索引擎开放了接口**。把这段逻辑搬到落地页或普通网页会直接失败。

约束：

- 输入超过 20 个字符直接返回空（超长词没有有意义的建议，省一次请求）
- 输入防抖 300ms 后再发
- 请求失败只 `log` + 清空列表，不弹 toast——联想挂了不该拦住用户按回车
- 结果按 `dropdownMaxItems` 截断

## 5. 新标签页打开后为什么要清空输入

`isNewTabOpen` 为真时，新标签页打开后**当前页面不会跳走**，用户切回来还能看到输入框。所以提交后立刻清空输入，同时保持 `isSearching` 约 600ms 让输入框处于禁用态——覆盖标签页切换的视觉过渡期，否则用户可能在已经提交过的输入框里继续打字，形成「以为在改上一次搜索、实际上是新一次」的误解。

当前标签页打开时没有这个处理：页面直接被搜索结果替换，残留状态无意义。

## 6. 文件索引

| 文件 | 职责 |
|------|------|
| `src/logic/constants/search.ts` | 引擎清单、模板、`suggestUrl`、favicon |
| `src/api/search.ts` | 联想接口与按 `label` 分发的解析分支 |
| `src/newtab/widgets/search/config.ts` | 默认配置（默认 Bing、默认引擎是 `urlName`） |
| `src/newtab/widgets/search/logic.ts` | `buildSearchUrl`：模板校验 + 占位符替换（提交路径的唯一入口） |
| `src/newtab/widgets/search/index.vue` | 提交、联想下拉、引擎图标、打开方式 |
| `src/setting/panes/search/index.vue` | 引擎选择、自定义地址输入、外观 |
| `src/newtab/widgets/search/__tests__/search-url.test.ts` | 三种非法输入与多次占位符的回归用例 |
| `src/logic/__tests__/api-search.test.ts` | 联想接口的占位符替换与编码 |
