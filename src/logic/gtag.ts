const getOrCreateClientId = async () => {
  const result = await chrome.storage.local.get('clientId')
  let clientId = result.clientId
  if (!clientId) {
    // Generate a unique client ID, the actual value is not relevant
    clientId = self.crypto.randomUUID()
    await chrome.storage.local.set({ clientId })
  }
  return clientId
}

const SESSION_EXPIRATION_IN_MIN = 30

const getOrCreateSessionId = async () => {
  // Store session in memory storage
  let { sessionData } = await chrome.storage.session.get('sessionData')
  // Check if session exists and is still valid
  const currentTimeInMs = Date.now()
  if (sessionData && sessionData.timestamp) {
    // Calculate how long ago the session was last updated
    const durationInMin = (currentTimeInMs - sessionData.timestamp) / 60000
    // Check if last update lays past the session expiration threshold
    if (durationInMin > SESSION_EXPIRATION_IN_MIN) {
      // Delete old session id to start a new session
      sessionData = null
    } else {
      // Update timestamp to keep session alive
      sessionData.timestamp = currentTimeInMs
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

type TGaProxyType = 'view' | 'click' | 'move' | 'press' | 'error'

export const gaProxy = async (type: TGaProxyType, names: string[], payload = {}) => {
  const params = {
    client_id: await getOrCreateClientId(),
    events: [
      {
        name: `${type}_${names.join('_')}`,
        params: {
          session_id: await getOrCreateSessionId(),
          engagement_time_msec: DEFAULT_ENGAGEMENT_TIME_IN_MSEC,
          ...payload,
        },
      },
    ],
  }

  fetch(`${GA_ENDPOINT}?measurement_id=${MEASUREMENT_ID}&api_secret=${API_SECRET}`, {
    method: 'POST',
    body: JSON.stringify(params),
  })
}
