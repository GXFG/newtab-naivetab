import { log } from './util'

/**
 * 埋点
 * @param category 类型
 * @param action 操作
 * @param opt_label 标签
 * @param opt_value 数值
 * @param opt_noninteraction 为true时，表示将不会在跳出率计算中使用事件命中
 */
export const gaEvent = (category: string, action: string, opt_label: string, opt_value?: number, opt_noninteraction?: boolean) => {
  if (import.meta.env.DEV) {
    return
  }
  const param: any = ['_trackEvent', category, action, opt_label]

  if (opt_value !== undefined) {
    param.push(opt_value)
  }
  if (opt_noninteraction !== undefined) {
    param.push(opt_noninteraction)
  }
  log('ga', param.slice(1).join(','))
  window._gaq.push(param)
}
