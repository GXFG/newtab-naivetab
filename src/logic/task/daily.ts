/**
 * @module task/daily
 * @description 日切任务 — 跨过本地午夜时触发一次，供「按天刷新」的 Widget 共用。
 *
 * 内部不新增定时器：向 timer 任务（rAF + 1s 节流）注册一个比较函数，
 * 每秒比较一次本地日期键，真正跨天才回调消费者。N 个消费者只付一次比较成本。
 *
 * 为什么不各 Widget 自己 addTimerTask + 比日期：
 *   - 日期键格式化、补零、跨年判定容易各写一份，口径迟早分叉
 *   - date 这类只需要按天刷新的 Widget 会被迫每秒重新格式化一遍（实测 1.2 µs → 0）
 *
 * 为什么不挂 visibilitychange：合盖恢复、或标签页一直可见只是窗口失焦时不会触发它；
 * timer 在后台暂停、恢复后立即补跑一次，能覆盖这些路径（见 ./timer.ts）。
 *
 * 注册即执行一次，与 addTimerTask 语义一致，消费者不必在 onMounted 里重复调用。
 *
 * @dependencies ./timer
 * @consumers newtab/widgets/{calendar,date,yearProgress}
 * @see docs/architecture/task.md#5-daily-任务
 */
import { addTimerTask, removeTimerTask } from './timer'

/** 共享 timer 的 key：带前缀，避免与 Widget 的 WIDGET_CODE 撞车 */
const DAILY_TIMER_KEY = '__task:daily'

/** 本地日期键（YYYY-MM-DD，补零）；本地时间口径，与日历/日期的取值一致 */
const toLocalDayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`

/** 日切回调。now 为本次触发时刻，所有消费者共享同一个 Date，只读 */
type DailyTask = (now: Date) => void

const dailyTasks = new Map<string, DailyTask>()

/** 上一次触发（或建立基线）时的本地日期键 */
let lastDayKey = ''

/**
 * 执行单个消费者并隔离异常。
 *
 * 这一层**不能**由 timer 的 try/catch 代替，两者保护的是不同边界：
 *   - timer 保证「一个 timer 任务崩了不影响其它任务和后续帧」
 *   - 这里保证「daily 内部一个消费者崩了不影响同批次的其它消费者」。
 *     checkDayChange 在 timer 眼里只是**一个**任务：它抛错时 timer 只跳过这一次调用，
 *     同批次里排在后面的消费者当天就漏了更新，要等到明天
 *   - 注册时的首次调用发生在组件 setup 里，根本不经过 timer，必须自己兜住，
 *     否则会被 WidgetErrorBoundary 当成渲染失败
 */
const runTask = (key: string, task: DailyTask, now: Date) => {
  try {
    task(now)
  } catch (error) {
    console.error(`[task:daily] daily task "${key}" failed:`, error)
  }
}

/**
 * 由 timer 每秒调用一次。
 */
const checkDayChange = () => {
  const now = new Date()
  const key = toLocalDayKey(now)
  if (key === lastDayKey) return
  lastDayKey = key

  for (const [taskKey, task] of dailyTasks) {
    runTask(taskKey, task, now)
  }
}

/**
 * 注册日切任务：**立即执行一次**（初始化），之后每个本地午夜执行一次。
 *
 * 首次执行是初始化，不是「日切」：组件挂载时总得先把内容画出来，否则要等到
 * 明天零点才有内容。由这里统一负责，调用方就不必在 onMounted 里再写一遍——
 * 漏写的后果（卡片空白到第二天）比多渲染一次严重得多。
 *
 * 消费者**不会**被执行两次：`addTimerTask` 内部虽然会立即跑一次 checkDayChange，
 * 但注册前已经把 lastDayKey 立成了今天，那次比较相同、直接 return；
 * 真正调用消费者的只有末尾这一行 runTask。两次取时间之间若正好跨过午夜，
 * 那次比较会被判成跨天、消费者连跑两次——窗口在微秒级，不再额外加锁。
 *
 * 首次执行传的是**各自 new 的 Date**（与「跨天批次共享同一时刻」是两回事：
 * 那里共享是为了不在午夜边界上算出两个日期，这里没有边界语义）。
 *
 * 同一 key 重复注册按「替换」处理（`Map.set` 语义）。Widget 是单实例，
 * 正常不会出现两个消费者抢同一个 key；真要区分实例得换 key 口径。
 *
 * @param key 唯一标识，建议直接传 WIDGET_CODE
 */
export const addDailyTask = (key: string, task: DailyTask) => {
  dailyTasks.set(key, task)

  if (dailyTasks.size === 1) {
    // 先立基线再注册：否则 addTimerTask 立即执行的那次 checkDayChange 会把
    // 「基线为空」误判成跨天，导致消费者被连调两次
    lastDayKey = toLocalDayKey(new Date())
    addTimerTask(DAILY_TIMER_KEY, checkDayChange)
  }

  runTask(key, task, new Date())
}

/**
 * 注销日切任务；确实删掉最后一个消费者时，连同共享 timer 一起摘掉。
 *
 * `removed` 这个判断不能省：key 不存在时若仍然调 removeTimerTask，
 * 而此刻 timer 的 task map 恰好为空（App 调过 `startTimer()`、首个 timer 任务
 * 还没注册），removeTimerTask 会把这个**不属于 daily 的** rAF 循环停掉。
 * 注销一个没注册过的 key 必须是彻底的空操作。
 */
export const removeDailyTask = (key: string) => {
  const removed = dailyTasks.delete(key)
  if (removed && dailyTasks.size === 0) removeTimerTask(DAILY_TIMER_KEY)
}
