# 天气 Widget：四份缓存与共享 Key

> 接口地址、参数、字段含义见 `src/api/weather.ts` 各函数上方的官方文档链接；本文只记录「读单个文件看不全」的部分。

## 1. 五份缓存，四个过期时间

`weatherState`（`data-weather`）里有五个桶，其中四个在跑，`indices` 是空桶（见第 4 节）：

| 桶 | 内容 | 刷新门槛 | 消费点 |
|----|------|----------|--------|
| `now` | 实况：温度、体感、风向风力、能见度 | 1 小时 | 主信息区 |
| `warning` | 灾害预警列表 + `state.isWarningVisible` | 1 小时 | 图标旁警示 |
| `air` | 空气质量：AQI、PM2.5、各污染物 | 4 小时 | 展开区 |
| `forecast` | 逐日预报 | 4 小时 | `ForecastWeather.vue` |
| `indices` | 生活指数——**空桶，从未被写入**，见第 4 节 | —（未接入） | `NowWeather.vue` 悬停弹层 |

在跑的四份各自带 `syncTime`，`updateWeather` 逐个比较——**不是一次请求拉全部，也不是一个总开关**。

**Why 按桶分**：这四类数据在服务端本身的更新频率就差一个量级（实况逐小时、空气质量与预报按日滚动）。合成一份缓存只有一个 `syncTime`，要么按最频繁的那个把配额耗光，要么按最慢的那个让温度停在三小时前。分开之后每个桶按自己的节奏过期，页面上「温度是新的、空气是旧的」是可接受的状态，反过来不是。

## 2. 刷新时机分两种强度

| 入口 | 调用 | 行为 |
|------|------|------|
| 组件挂载 | `updateWeather` | 按 TTL 判断，只补过期的桶 |
| 主开关从关到开 | `refreshWeather` | 四个桶**全部强制重拉** |
| 城市 / 界面语言变更 | `refreshWeather` | 同上 |

**Why 换语言要强制重拉而不是等 TTL**：和风返回的天气现象、风向、预警文案都随 `lang` 参数变化，语言变了但 TTL 没到，用户会看到「界面切换成英文，天气文字还是中文」的割裂状态。城市同理——换了城市还显示旧城市的温度是明显的错误，等一小时更不可接受。

`handleWatchWeatherConfigChange` 在 `onMounted` 里注册、`onUnmounted` 里注销，与 Widget 的挂载生命周期绑定（注意这里不是 `watch(isRender)`：监听配置变更不依赖 Widget 是否可见，禁用了也应当继续跟随城市变化，否则重新启用的瞬间是旧城市数据）。

## 3. 默认 API Key 是共享的

`WIDGET_CONFIG.apiKey` 里写着一个默认 Key，用户没去设置面板填自己的 Key 时，**所有人都用它**。和风免费额度按调用次数计。

这解释了两件看起来奇怪的事：

- 为什么刷新门槛以「小时」而非「分钟」为单位——它首先是成本参数，其次才是体验参数
- 为什么四个桶不在一次刷新里全拉——合并成一次全量刷新等于把配额消耗速度乘以桶数

改刷新策略前先算配额：新增一个高频桶，等于给共享 Key 上再叠一层并发。

## 4. 已知缺口：生活指数没有数据

`weatherIndicesInfo` 读的是 `weatherState.value.indices.list`，而 `indices` 这个桶**从来没有被写入过**——`src/api/weather.ts` 里有 `getWeatherIndices` 的完整封装（含 `type` 参数），但 `logic.ts` 里没有它的调用点，`updateWeather` / `refreshWeather` 都不拉它。

后果是静默的，不会有任何报错：

- `weatherIndicesInfo` 恒为空字符串
- `NowWeather.vue` 里那个弹层用 `weatherIndicesInfo.length > 0` 作显示条件，所以**永远不会出现**——表现为悬停天气图标没有任何反应（点击图标仍是打开和风天气网页，那是不相关的另一个交互）

2026-11-21 复核：**这不是「从未接过」，git 历史里有明确节点**。

| 提交 | 时间 | 动作 |
|------|------|------|
| `d841777` | 2022-01-29 | `getIndicesData` 落地，`updateWeather` 与 `refreshWeather` 都真的调用 |
| `79e1bf9` | 2022-10-14（v1.8） | 把「生活指数最小刷新间隔 4 小时」分支和 refresh 里的调用一起注释掉，CHANGELOG 未提原因 |
| `afd58c9` | 2025-11-22（v1.27.0） | 重构 weather 目录时删掉注释代码，只剩空桶 |

关键推论：它原本就是与 `air` / `forecast` 同级的 **4 小时桶**，接回是「恢复一个桶」而不是「新增第五个请求桶、重新设计刷新层级」。当日仍决定**先保留结构与封装**、不接上也不删除：Key 是共享的（见上一节），需先确认和风套餐是否包含 indices 与配额余量。结论未变，依据从「不知道当初为什么停」变成「v1.8 主动停用、原因未留档」。

**商店文案已同步**：2026-11-22 把「生活指数」从 `docs/app-store/store-description-{zh,en}.txt` 与 `README.md` 的天气描述里删掉，避免对外承诺没有的功能。接回 `indices` 之后再连文案一起加回去。

## 5. 失败一律静默

每个 `get*Data` 都只判断 `data.code !== '200'` 后 `return`，异常由 `request` 层消化，没有 toast。

与资讯 Widget 一致：天气挂掉不该打断用户，保留上一次缓存比弹错误有用。代价是**配额耗尽时界面看不出异常**——数据停在旧值，用户只会觉得「天气不准」。排查这类反馈先看缓存里的 `syncTime`。

## 6. 文件索引

| 文件 | 职责 |
|------|------|
| `src/api/weather.ts` | 和风 API 封装（含未被调用的 `getWeatherIndices`） |
| `src/newtab/widgets/weather/logic.ts` | 四个桶、TTL 判定、强制刷新、配置监听 |
| `src/newtab/widgets/weather/config.ts` | 默认配置（含**共享的默认 apiKey**、默认城市） |
| `src/newtab/widgets/weather/NowWeather.vue` | 主信息区 + 预警 + 指数弹层（当前恒隐藏） |
| `src/newtab/widgets/weather/ForecastWeather.vue` | 逐日预报 |
| `src/setting/panes/weather/index.vue` | Key、城市、单位、开关 |
| `src/logic/constants/weather.ts` | 语言映射与单位换算常量 |
