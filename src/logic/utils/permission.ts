/**
 * 统一管理需要用户授权的浏览器权限。
 *
 * bookmarks 和 notifications 均为必需权限（permissions），安装时即授予。
 * requestPermission 对必需权限直接返回 true，不弹窗。
 * 保留 checkPermission/requestPermission 封装以兼容未来权限变更。
 */

// ─── Notification ───

export interface NotificationOptions {
  title: string
  body?: string
  icon?: string
}

/**
 * 通用非阻塞权限请求（fire-and-forget）。
 * 不等待用户响应，不阻塞调用方后续逻辑。
 * 适用于通知等"授权失败也可降级运行"的场景。
 */
export const requestPermissionAsync = (field: OptionsPermission): void => {
  requestPermission(field).catch(() => {
    // 静默忽略拒绝，调用方无需处理
  })
}

/**
 * 通用 Chrome 可选权限请求（可能触发用户弹框）
 */
export const requestPermission = (
  field: OptionsPermission,
): Promise<boolean> => {
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
