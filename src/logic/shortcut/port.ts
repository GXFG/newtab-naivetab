/**
 * @module shortcut/port
 * @description 共享 Port 长连接 — 书签和命令快捷键共用同一 Port（name='naivetab-shortcut'），
 *   避免 SW 端 portMap 覆盖。提供 getSharedPort() 单例和 isSwReady() 状态检测，
 *   内置指数退避自动重连。
 * @dependencies types/messages.ts（MSG_INIT_COMPLETE）
 * @consumers shortcut/matcher.ts、shortcut/shortcut-executor.ts、contentScripts/index.ts
 * @see docs/features/global-shortcut.md
 * @see docs/architecture/messaging.md
 */
import { MSG_INIT_COMPLETE } from '@/types/messages'

let port: chrome.runtime.Port | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectDelay = 100
const MAX_RECONNECT_DELAY = 1000

let swReady = false

const scheduleReconnect = () => {
  if (reconnectTimer) return
  reconnectDelay = Math.min(reconnectDelay * 2, MAX_RECONNECT_DELAY)
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    reconnectDelay = 100
    getSharedPort()
  }, reconnectDelay)
}

export const isSwReady = () => swReady

export const getSharedPort = (): chrome.runtime.Port => {
  if (!port) {
    port = chrome.runtime.connect({ name: 'naivetab-shortcut' })
    reconnectDelay = 100
    port.onMessage.addListener((msg: { type: string }) => {
      if (msg.type === MSG_INIT_COMPLETE) {
        swReady = true
      }
    })
    port.onDisconnect.addListener(() => {
      void chrome.runtime.lastError
      swReady = false
      port = null
      scheduleReconnect()
    })
  }
  return port
}
