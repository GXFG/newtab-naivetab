/**
 * Google Analytics 上报 — clientId/Session 管理 + gaProxy 事件发送 + 错误上报。
 *
 * ## gaProxy vs gaReportError 职责分离
 * - gaProxy：用户行为分析（click/view/move/delete/press），传 client_id，无去重/限频
 * - gaReportError：错误排查，固定 client_id，内置 5 分钟去重 + 单 session 30 条限频
 *
 * ## 运行环境
 * - gaProxy 被 page context（newtab/popup/content-script）和 SW 导入，
 *   但只有 page context 会调用 gaProxy；SW 仅调用 gaReportError
 * - gaReportError 被 page context 和 SW 调用。extVersion 使用 `__APP_VERSION__`
 *   编译时注入，两种上下文一致
 *
 * ## GA4 MP 参数值限制
 * - 每个参数值上限 100 字符，超过会被静默截断
 * - gaReportError 已对每个字段独立截断，调用方无需额外处理
 * - gaProxy 的 payload 不截断（调用方均为短值）
 * - 不要传完整 stack trace，拆成结构化字段（errorType/errorName/location）
 *
 * ## 事件命名规则
 * - 模块名与动作名之间用下划线分隔（如 `setting_open`、`focusMode_toggle`）
 * - 模块名和动作名自身保持 camelCase（如 `keyboardBookmark_openPage`）
 * - press 事件的键码放在 payload 的 code 字段中，不放在事件名里
 */
const getOrCreateClientId = async (): Promise<string> => {
  const result = await chrome.storage.local.get('clientId')
  let clientId = result.clientId as string | undefined
  if (!clientId) {
    // Generate a unique client ID, the actual value is not relevant
    clientId = self.crypto.randomUUID()
    await chrome.storage.local.set({ clientId })
  }
  return clientId
}

const SESSION_EXPIRATION_IN_MIN = 30

interface SessionData {
  session_id: string
  timestamp: string
}

const getOrCreateSessionId = async () => {
  // Store session in memory storage
  let { sessionData } = (await chrome.storage.session.get('sessionData')) as {
    sessionData: SessionData | null
  }
  // Check if session exists and is still valid
  const currentTimeInMs = Date.now()
  if (sessionData && sessionData.timestamp) {
    // Calculate how long ago the session was last updated
    const durationInMin =
      (currentTimeInMs - Number(sessionData.timestamp)) / 60000
    // Check if last update lays past the session expiration threshold
    if (durationInMin > SESSION_EXPIRATION_IN_MIN) {
      // Delete old session id to start a new session
      sessionData = null
    } else {
      // Update timestamp to keep session alive
      sessionData.timestamp = currentTimeInMs.toString()
      await chrome.storage.session.set({ sessionData })
    }
  }
  if (!sessionData) {
    // Create and store a new session
    sessionData = {
      session_id: currentTimeInMs.toString(),
      timestamp: currentTimeInMs.toString(),
    }
    await chrome.storage.session.set({ sessionData })
  }
  return sessionData.session_id
}

const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect'
const MEASUREMENT_ID = 'G-83GHS69B9N'
const API_SECRET = '4LhaOjgsQ4WK1zz5mkAmSQ'

type TGaProxyType = 'view' | 'click' | 'move' | 'delete' | 'press'

// ── gaProxy（事件分析）──────────────────────────────────────────────────

/**
 * 用户行为事件上报。
 * - 传 client_id + session_id，用于用户行为分析
 * - 无去重/限频：调用方确保在用户交互触发时调用，天然离散
 * - payload 不截断：所有调用方传入的 payload 均为短值（code、source、enabled 等）
 */
export const gaProxy = async (
  type: TGaProxyType,
  names: string[],
  payload = {},
) => {
  if (__DEV__) return
  let clientId: string = ''
  let sessionId: string = ''
  try {
    clientId = await getOrCreateClientId()
    sessionId = await getOrCreateSessionId()
  } catch {
    // SW 重启期间 chrome.storage 不可用，静默跳过
    return
  }

  const params = {
    client_id: clientId,
    events: [
      {
        name: `${type}_${names.join('_')}`,
        params: {
          session_id: sessionId,
          ...payload,
        },
      },
    ],
  }

  fetch(
    `${GA_ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      keepalive: true,
    },
  ).catch(() => {})
}

// ── gaReportError（错误上报）───────────────────────────────────────────

/** 错误去重窗口（毫秒）：相同 errorHash 在此时间内只上报一次 */
const ERROR_DEDUP_WINDOW_MS = 5 * 60 * 1000 // 5 min
/** 单 session 最大错误上报数 */
const MAX_ERRORS_PER_SESSION = 30

interface ErrorRecord {
  timestamp: number
  count: number
}

/**
 * 错误去重映射：errorHash → { timestamp, count }。
 * 不清理：SW 重启自动 GC，页面上下文错误罕见，积累量可忽略。
 */
const errorDedupMap = new Map<string, ErrorRecord>()
/** 当前 session 已上报错误数。达到上限后静默忽略，避免雪崩。 */
let errorCountThisSession = 0

/**
 * 生成错误去重标识。
 * 取 message 前 80 字符 + location 组合作为指纹，
 * 不依赖完整堆栈（GA 参数有 100 字符限制）。
 */
const buildErrorHash = (
  type: string,
  location: string,
  message: string,
): string => {
  const truncated = message.slice(0, 80)
  return `${type}:${location}:${truncated}`
}

/** 检查是否应该上报此错误（去重 + 限频） */
const shouldReportError = (hash: string): boolean => {
  if (errorCountThisSession >= MAX_ERRORS_PER_SESSION) return false

  const now = Date.now()
  const record = errorDedupMap.get(hash)

  if (record && now - record.timestamp < ERROR_DEDUP_WINDOW_MS) {
    record.count++
    return false
  }

  errorDedupMap.set(hash, { timestamp: now, count: 1 })
  errorCountThisSession++
  return true
}

/** 从错误对象中提取简短类型名 */
const extractErrorName = (error: unknown): string => {
  if (error instanceof Error) return error.name
  if (typeof error === 'string') return 'StringError'
  return 'UnknownError'
}

/** 截断字符串到指定长度 */
const truncate = (str: string, maxLen: number): string => {
  return str.length > maxLen ? str.slice(0, maxLen) + '…' : str
}

/**
 * 错误上报函数。
 *
 * 与 gaProxy 的区别：
 * - 不传 client_id（错误排查不需要追踪个体用户）
 * - 不传 session_id
 * - 内置去重（相同错误 5 分钟内只上报一次）和限频（单 session 最多 30 条）
 * - 结构化拆分错误信息，适配 GA 参数 100 字符限制
 * - extVersion 使用 __APP_VERSION__，编译时注入，page context 和 SW 一致
 *
 * @param type 错误来源类型
 * @param location 发生位置（模块名或 widget code）
 * @param error 错误对象或消息
 * @param context 额外上下文（可选，截断到 100 字符）
 */
export const gaReportError = async (
  type: 'uncaught' | 'unhandledrejection' | 'vue' | 'sw',
  location: string,
  error: unknown,
  context?: string,
) => {
  if (__DEV__) return
  const errorName = extractErrorName(error)
  const message = error instanceof Error ? error.message : String(error)
  const hash = buildErrorHash(type, location, message)

  if (!shouldReportError(hash)) return

  // GA4 MP 参数值上限 100 字符，每个字段独立截断
  const payload = {
    errorType: type,
    location: truncate(location, 100),
    errorName: truncate(errorName, 100),
    errorMsg: truncate(message, 100),
    extVersion: __APP_VERSION__,
    ...(context ? { context: truncate(context, 100) } : {}),
  }

  const params = {
    client_id: 'error_report', // 固定标识，不追踪用户
    events: [
      {
        name: `error_${type}`,
        params: {
          ...payload,
        },
      },
    ],
  }

  fetch(
    `${GA_ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      keepalive: true,
    },
  ).catch(() => {
    // console.log('GA error report failed', e)
  })
}
