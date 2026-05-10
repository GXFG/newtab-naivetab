/**
 * 统一管理需要用户授权的浏览器权限
 *
 * notifications 作为 optional_permissions 动态申请，
 * 仅在用户首次使用相关功能时触发授权弹框。
 */

// ─── Notification ───

export interface NotificationOptions {
  title: string
  body?: string
  icon?: string
}

export const requestNotificationsPermission = (): Promise<boolean> => {
  return new Promise((resolve) => {
    chrome.permissions.request({ permissions: ['notifications'] }, resolve)
  })
}

/**
 * 通用 Chrome 可选权限请求（可能触发用户弹框）
 */
export const requestPermission = (field: OptionsPermission) => {
  return new Promise((resolve, reject) => {
    try {
      chrome.permissions.request({ permissions: [field] }, (granted) => {
        resolve(granted)
      })
    } catch (e) {
      reject(e)
    }
  })
}

/**
 * 静默检查权限是否已授予（不触发弹框，不需要用户手势）
 */
export const checkPermission = (field: OptionsPermission): Promise<boolean> => {
  return new Promise((resolve) => {
    chrome.permissions.contains({ permissions: [field] }, (result) => {
      resolve(result)
    })
  })
}

export const sendNotification = (options: NotificationOptions): void => {
  const iconUrl = chrome.runtime.getURL(
    options.icon ?? '/assets/img/icon/icon-128x128.png',
  )
  chrome.notifications.create({
    type: 'basic',
    iconUrl,
    title: options.title,
    message: options.body ?? '',
  })
}
