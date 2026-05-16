/**
 * Google Analytics 上报 — clientId/Session 管理 + gaProxy 事件发送。
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
const DEFAULT_ENGAGEMENT_TIME_IN_MSEC = 100

type TGaProxyType = 'view' | 'click' | 'move' | 'delete' | 'press' | 'error'

export const gaProxy = async (
  type: TGaProxyType,
  names: string[],
  payload = {},
) => {
  // SW 重启期间（如扩展更新/重载）chrome.storage 不可用，
  // chrome.storage.session.get() 会直接抛 Error: No SW。
  // GA 上报为可选操作，静默跳过即可。
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
          engagement_time_msec: DEFAULT_ENGAGEMENT_TIME_IN_MSEC,
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
    },
  ).catch((e) => {
    // console.log('GA event failed', e)
  })
}
