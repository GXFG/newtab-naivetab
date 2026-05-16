/**
 * 统一消息类型定义
 *
 * SW ↔ CS / newtab 双向通信的消息类型与接口。
 * 集中管理避免字符串字面量散落在多个文件中。
 *
 * 架构概览：
 * - CS (contentScripts/) 注入 HTTP/HTTPS 页面，负责采集按键、执行 DOM 命令
 * - NewTab (newtab/) 是 chrome-extension:// 页面，通过 shortcut-executor.ts 注册 keydownTask
 * - SW (background/) 是中枢：接收 keydown → 查 keymap → 分发执行
 * - 所有连接使用 Port 长连接（name='naivetab-shortcut'），支持冷启动消息队列 + 指数退避重连
 *
 * 详见 docs/architecture/messaging.md
 */

// ── 消息类型常量 ─────────────────────────────────────────────────────────

export const MSG_KEYDOWN = 'NAIVETAB_KEYDOWN'
export const MSG_INIT_COMPLETE = 'NAIVETAB_INIT_COMPLETE'
export const MSG_HELLO = 'NAIVETAB_HELLO'
export const MSG_EXECUTE_COMMAND = 'NAIVETAB_EXECUTE_COMMAND'
export const MSG_SWITCH_BOOKMARK_LAYER = 'NAIVETAB_SWITCH_BOOKMARK_LAYER'
export const MSG_SWITCH_BOOKMARK_LAYER_UI = 'NAIVETAB_SWITCH_BOOKMARK_LAYER_UI'

// ── 消息接口 ─────────────────────────────────────────────────────────────

export interface CsToSwKeydownMessage {
  type: typeof MSG_KEYDOWN
  key: string
  source: 'bookmark' | 'command'
}

export interface SwToCsExecuteCommand {
  type: typeof MSG_EXECUTE_COMMAND
  command: string
}

export interface SwToCsInitComplete {
  type: typeof MSG_INIT_COMPLETE
}

export interface CsToSwHello {
  type: typeof MSG_HELLO
}

export interface SwToCsSwitchBookmarkLayer {
  type: typeof MSG_SWITCH_BOOKMARK_LAYER
  folderName: string
}

/**
 * UI（newtab / popup）→ SW 消息：请求切换书签层。
 * SW 收到后通过原子写入（keymap + activeLayer 一次 set）完成切换，
 * 避免两步写入的中间状态。
 */
export interface CsToSwSwitchBookmarkLayer {
  type: typeof MSG_SWITCH_BOOKMARK_LAYER_UI
  layerIndex: number
}

export type CsToSwMessage =
  | CsToSwKeydownMessage
  | CsToSwHello
  | CsToSwSwitchBookmarkLayer

export type SwToCsMessage =
  | SwToCsExecuteCommand
  | SwToCsInitComplete
  | SwToCsSwitchBookmarkLayer
