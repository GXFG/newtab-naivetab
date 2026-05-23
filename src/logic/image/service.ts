/**
 * @module image/service
 * @description 背景图生命周期管理：下载/存储/渲染/初始化、外观切换 watch 监听、缓存有效性校验。
 *   核心流程：从来源（本地/网络/Bing/自定义URL）获取图片 → IndexedDB 缓存 →
 *   解码为 Blob → 写入 DOM CSS 变量。双外观（浅色/深色）同步处理。
 *   新增 validateImageFile() 对缓存 File 进行两级校验（size + 实际图片加载），
 *   避免缓存损坏导致渲染失败。
 * @dependencies image/state.ts（响应式状态）、image/utils.ts（图片工具）、
 *   utils/database.ts（IndexedDB）、config/state.ts（配置）
 * @consumers newtab/layers/BackgroundImg.vue、setting/panes/general/BackgroundDrawer.vue
 * @see docs/architecture/background.md
 */
import {
  urlToFile,
  compressedImageUrlToBase64,
  downloadImageByUrl,
  getImageUrlFromName,
} from './utils'
import { databaseStore } from '@/logic/utils/database'
import { localConfig, localState } from '@/logic/config/state'
import {
  BACKGROUND_IMAGE_SOURCE,
  IMAGE_NETWORK_SOURCE,
} from '@/logic/image/constants'
import { imageState, imageLocalState, isImageLoading } from './state'
import { updateBingImages } from './gallery'

export const getCurrBackgroundImageStoreName = (): DatabaseStore => {
  return localConfig.general.backgroundImageSource ===
    BACKGROUND_IMAGE_SOURCE.LOCAL
    ? 'localBackgroundImages'
    : 'currBackgroundImages'
}

/**
 * 从 IndexedDB 读取当前来源、当前外观码的背景图数据。
 *
 * 类型说明：`as any` 用于绕过 databaseStore 的联合类型签名。
 * 根本原因：payload 对象字面量与 DatabaseLocalBackgroundImages 类型不完全匹配，
 * 且 storeName/type 传字符串字面量时 TS 无法精确收窄分支。
 * 消除方式：将 databaseStore 改为函数重载（区分 get/add/put/delete 分支）。
 */
const getCurrBackgroundImageFromDB =
  async (): Promise<DatabaseLocalBackgroundImages | null> => {
    const storeName = getCurrBackgroundImageStoreName()
    return (databaseStore as any)(
      storeName,
      'get',
      localState.value.currAppearanceCode,
    )
  }

export const getCurrNetworkBackgroundImageUrl = (
  applyToAppearanceCode = localState.value.currAppearanceCode,
): string => {
  const quality = localConfig.general.backgroundImageHighQuality
    ? 'high'
    : 'medium'
  if (
    localConfig.general.backgroundImageSource ===
    BACKGROUND_IMAGE_SOURCE.BING_PHOTO
  ) {
    const todayImage = imageLocalState.value.bing.list[0]
    const name = todayImage?.name
    return name
      ? getImageUrlFromName(IMAGE_NETWORK_SOURCE.BING, name, quality)
      : ''
  }
  const config = (localConfig.general.backgroundImageList as any)[
    applyToAppearanceCode
  ]
  if (!config?.name) return ''
  return getImageUrlFromName(config.networkSourceType, config.name, quality)
}

/**
 * 记录当前正在加载的图片所属外观码，用于在快速切换主题时丢弃过期回调。
 *
 * 【安全性说明】为什么单变量不会出现竞态？
 * 当前系统仅有 2 个外观（0/1），每个外观码对应固定的图片内容。
 * 快速切换时，多个 renderRawBackgroundImage 调用会覆盖 pendingAppearanceCode，
 * 但 decodeAndApplyImage 中的守卫确保：只有与最新外观码匹配的回调才能更新 imageState。
 *
 * 例：用户连续切换 0→1→0，三次调用都将 pendingAppearanceCode 设为各自的目标值。
 * - 调用0 完成时，若 pendingAppearanceCode 已被覆盖为 1，0 !== 1，结果被丢弃 ✓
 * - 调用1 完成时，若 pendingAppearanceCode 被覆盖为 0，1 !== 0，结果被丢弃 ✓
 * - 调用2 完成时，pendingAppearanceCode === 0，结果被应用 ✓
 * 最终用户看到的是最后一次切换（appearanceCode=0）的图片，行为正确。
 *
 * DB 写入方面：downloadAndStoreNetworkImage 按 appearanceCode 作为 keyPath 写入 IndexedDB，
 * 即使过期请求写入 DB，写入的也是对应外观码的正确图片（因为图片由 appearanceCode 决定），
 * 不会造成数据错乱。
 *
 * 设置位置：renderRawBackgroundImage 入口处统一赋值（覆盖所有分支）。
 * 检查位置：decodeAndApplyImage 的 then 和 catch 分支中均检查。
 */
let pendingAppearanceCode: number | null = null

/**
 * 获取对立外观码。当前系统仅有 0/1 两个外观，此函数集中管理互反逻辑。
 * 若未来支持多外观（>2），此处需同步改造。
 */
export const getOppositeAppearanceCode = (code: number): number => {
  return +!code
}

/**
 * 安全写入 localStorage，避免超出配额时抛出未捕获异常
 */
const safeSetFirstScreen = (base64: string) => {
  try {
    localStorage.setItem('l-firstScreen', base64)
  } catch {
    console.warn(
      'Failed to save first screen image to localStorage (quota exceeded)',
    )
  }
}

/** 释放旧的 blob URL，避免内存泄漏 */
const revokeOldBlobUrl = () => {
  if (imageState.fullImageUrl && imageState.fullImageUrl.startsWith('blob:')) {
    URL.revokeObjectURL(imageState.fullImageUrl)
  }
}

/**
 * 验证 IndexedDB 中缓存的 File 对象是否为有效图片。
 * 仅检查 size 不够（size > 0 的非图片数据也会通过），
 * 必须实际尝试加载为 <img> 才能确认。
 */
const validateImageFile = (file: File): Promise<boolean> => {
  return new Promise((resolve) => {
    const blobUrl = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(blobUrl)
      resolve(true)
    }
    img.onerror = () => {
      URL.revokeObjectURL(blobUrl)
      resolve(false)
    }
    img.src = blobUrl
  })
}

export const downloadCurrentWallpaper = async () => {
  if (!localConfig.general.isBackgroundImageEnabled) return

  // 来源=0：本地上传，从 DB 重新创建 ObjectURL 用于下载（ObjectURL 刷新后失效，不能依赖 previewImageUrl）
  if (
    localConfig.general.backgroundImageSource === BACKGROUND_IMAGE_SOURCE.LOCAL
  ) {
    const dbData = await getCurrBackgroundImageFromDB()
    if (!dbData || !dbData.file) return
    const objectUrl = URL.createObjectURL(dbData.file)
    const filename =
      dbData.file.name ||
      imageState.currBackgroundImageFileName ||
      'wallpaper.jpg'
    const link = document.createElement('a')
    link.href = objectUrl
    link.download = filename
    link.click()
    URL.revokeObjectURL(objectUrl)
    return
  }

  // 来源=1或2：网络/每日一图，构造 URL
  // 自定义 URL 仅在网络来源下生效
  if (
    localConfig.general.backgroundImageSource ===
      BACKGROUND_IMAGE_SOURCE.NETWORK &&
    localConfig.general.isBackgroundImageCustomUrlEnabled
  ) {
    const customUrl =
      localConfig.general.backgroundImageCustomUrls[
        localState.value.currAppearanceCode
      ]
    const url = customUrl || getCurrNetworkBackgroundImageUrl()
    if (!url) return
    const filename = customUrl ? 'custom-wallpaper.jpg' : 'wallpaper.jpg'
    await downloadImageByUrl(url, filename)
    return
  }

  const url = getCurrNetworkBackgroundImageUrl(
    localState.value.currAppearanceCode,
  )

  if (!url) return

  // 从 URL 中提取文件名
  let filename = 'wallpaper.jpg'
  try {
    const u = new URL(url)
    const idParam = u.searchParams.get('id')
    if (idParam) {
      filename = idParam
    } else {
      const pathName = u.pathname.split('/').pop() || ''
      filename = pathName.split('?')[0] || 'wallpaper.jpg'
    }
  } catch {
    // noop
  }

  await downloadImageByUrl(url, filename)
}

/**
 * 从自定义 URL 下载图片并缓存到 DB（与网络图片共用 currBackgroundImages 表）
 */
const downloadAndApplyCustomUrl = async (
  customUrl: string,
  targetAppearanceCode: number,
  start: number,
) => {
  const file = await urlToFile(customUrl, 'custom-wallpaper')
  const objectUrl = URL.createObjectURL(file)
  const smallBase64 = await compressedImageUrlToBase64(objectUrl)
  URL.revokeObjectURL(objectUrl)
  // 写入 DB 缓存
  await (databaseStore as any)('currBackgroundImages', 'put', {
    appearanceCode: targetAppearanceCode,
    file,
    smallBase64,
  })
  safeSetFirstScreen(smallBase64)
  decodeAndApplyImage(file, targetAppearanceCode, start, smallBase64)
}

/**
 * 从网络下载图片并存入 IndexedDB（网络来源首次访问时调用）
 * - BING_PHOTO 来源会同时写入两个 appearanceCode（强制双外观同步）
 */
const downloadAndStoreNetworkImage = async (
  appearanceCode: typeof localState.value.currAppearanceCode,
): Promise<DatabaseLocalBackgroundImages | null> => {
  const imageUrl = getCurrNetworkBackgroundImageUrl(appearanceCode)
  if (!imageUrl) return null
  const file = await urlToFile(imageUrl, imageUrl)
  // 从已下载的 File 生成缩略图，避免对同一 URL 发起第二次请求
  const objectUrl = URL.createObjectURL(file)
  const smallBase64 = await compressedImageUrlToBase64(objectUrl)
  URL.revokeObjectURL(objectUrl)
  const dbData = {
    appearanceCode,
    file,
    smallBase64,
  }
  await (databaseStore as any)('currBackgroundImages', 'put', dbData)
  // 每日一图：同时写入另一外观码
  if (
    localConfig.general.backgroundImageSource ===
    BACKGROUND_IMAGE_SOURCE.BING_PHOTO
  ) {
    await (databaseStore as any)('currBackgroundImages', 'put', {
      ...dbData,
      appearanceCode: getOppositeAppearanceCode(appearanceCode),
    })
  }
  return dbData
}

/**
 * 渲染原始背景图（核心方法）
 *
 * 流程：
 * 1. 从 IndexedDB 读取对应来源、对应 appearanceCode 的图片数据
 * 2. 若 DB 无数据（网络来源首次访问），则从 URL 下载 → 压缩 → 写入 DB
 * 3. 创建 ObjectURL → new Image() → decode() 预解码
 * 4. decode 成功 → 赋值 imageState.fullImageUrl（由组件控制 CSS opacity 淡入）
 * 5. decode 失败 → 直接赋值 blob URL 回退
 *
 * 关键设计：
 * - pendingAppearanceCode 守卫：等待期间用户切换主题时丢弃本次结果
 * - 同步 smallBase64 到 localStorage：确保下次刷新首屏能秒开
 */

/**
 * 解码图片并应用为背景图
 */
const decodeAndApplyImage = (
  file: File,
  targetAppearanceCode: number,
  start: number,
  smallBase64?: string,
  fileName?: string,
) => {
  if (pendingAppearanceCode !== targetAppearanceCode) return

  if (fileName != null) {
    imageState.currBackgroundImageFileName = fileName
  }

  const blobUrl = URL.createObjectURL(file)
  const img = new Image()
  img.src = blobUrl
  img
    .decode()
    .then(() => {
      if (pendingAppearanceCode !== targetAppearanceCode) {
        URL.revokeObjectURL(blobUrl)
        return
      }
      revokeOldBlobUrl()
      imageState.fullImageUrl = blobUrl
      if (smallBase64) {
        safeSetFirstScreen(smallBase64)
      }
      isImageLoading.value = false
      console.log(`RenderRawImage: ${(performance.now() - start).toFixed(2)}ms`)
    })
    .catch(() => {
      if (pendingAppearanceCode !== targetAppearanceCode) {
        URL.revokeObjectURL(blobUrl)
        return
      }
      revokeOldBlobUrl()
      imageState.fullImageUrl = blobUrl
      isImageLoading.value = false
    })
}

export const renderRawBackgroundImage = async () => {
  const start = performance.now()
  isImageLoading.value = true
  const targetAppearanceCode = localState.value.currAppearanceCode
  pendingAppearanceCode = targetAppearanceCode

  try {
    const source = localConfig.general.backgroundImageSource

    // 本地上传来源
    if (source === BACKGROUND_IMAGE_SOURCE.LOCAL) {
      const dbData = await getCurrBackgroundImageFromDB()
      // 校验 File 有效性，避免浏览器升级/数据损坏导致显示破损图片
      if (dbData && dbData.file && dbData.file.size > 0) {
        const isValid = await validateImageFile(dbData.file)
        if (isValid) {
          decodeAndApplyImage(
            dbData.file,
            targetAppearanceCode,
            start,
            dbData.smallBase64,
            dbData.file?.name,
          )
        } else {
          imageState.previewImageUrl = ''
          revokeOldBlobUrl()
          imageState.fullImageUrl = ''
          isImageLoading.value = false
        }
      } else {
        imageState.previewImageUrl = ''
        revokeOldBlobUrl()
        imageState.fullImageUrl = ''
        isImageLoading.value = false
      }
      return
    }

    // 网络 / 每日一图 / 自定义 URL 来源
    // 自定义 URL 仅在网络来源下生效（UI 上开关只在 NETWORK 来源下展示）
    if (
      source === BACKGROUND_IMAGE_SOURCE.NETWORK &&
      localConfig.general.isBackgroundImageCustomUrlEnabled
    ) {
      const customUrl =
        localConfig.general.backgroundImageCustomUrls[targetAppearanceCode]
      if (customUrl) {
        await downloadAndApplyCustomUrl(customUrl, targetAppearanceCode, start)
        return
      }
      // 自定义 URL 开启但当前外观码 URL 为空，回退到网络图片
    }

    const dbData = await getCurrBackgroundImageFromDB()

    // 网络来源已有缓存：先校验 File 是否为有效图片，避免浏览器升级/下载中断
    // 导致缓存了非图片数据（size > 0 但无法解码）
    if (dbData && dbData.file && dbData.file.size > 0) {
      const isValid = await validateImageFile(dbData.file)
      if (!isValid) {
        // 缓存损坏，删除后重新下载
        await deleteCurrRawBackgroundImageInDB()
      } else {
        decodeAndApplyImage(
          dbData.file,
          targetAppearanceCode,
          start,
          dbData.smallBase64,
        )
        return
      }
    }

    // 缓存为空或已损坏：下载并缓存
    const newDbData = await downloadAndStoreNetworkImage(targetAppearanceCode)
    if (!newDbData) {
      isImageLoading.value = false
      return
    }
    decodeAndApplyImage(
      newDbData.file,
      targetAppearanceCode,
      start,
      newDbData.smallBase64,
    )
  } catch (e) {
    console.error('renderRawBackgroundImage error:', e)
    isImageLoading.value = false
  }
}

/**
 * 存储用户本地上传的背景图（统一入口）
 *
 * 流程：
 * 1. 释放旧的 ObjectURL
 * 2. 压缩生成 smallBase64 → 写入 localStorage 首屏秒开
 * 3. 写入 localBackgroundImages DB（当前 appearanceCode）
 * 4. 若另一外观码无数据，自动同步相同图片（双外观一致）
 * 5. 触发大图渲染
 */
export const storeLocalBackgroundImage = async (file: File) => {
  // 释放旧的 ObjectURL（仅 blob: 协议需要 revoke）
  if (
    imageState.previewImageUrl &&
    imageState.previewImageUrl.startsWith('blob:')
  ) {
    URL.revokeObjectURL(imageState.previewImageUrl)
  }
  const imageUrl = URL.createObjectURL(file)
  imageState.currBackgroundImageFileName = file.name
  imageState.previewImageUrl = imageUrl
  const smallBase64 = await compressedImageUrlToBase64(imageUrl)
  safeSetFirstScreen(smallBase64)
  // store DB — put 是 upsert，不存在时插入、存在时更新
  await (databaseStore as any)('localBackgroundImages', 'put', {
    appearanceCode: localState.value.currAppearanceCode,
    file,
    smallBase64,
  })
  // 当只单独设置了浅色或深色外观时，默认同步另一外观为相同的背景
  const oppositeAppearanceImage = await (databaseStore as any)(
    'localBackgroundImages',
    'get',
    getOppositeAppearanceCode(localState.value.currAppearanceCode),
  )
  if (!oppositeAppearanceImage) {
    await (databaseStore as any)('localBackgroundImages', 'put', {
      appearanceCode: getOppositeAppearanceCode(
        localState.value.currAppearanceCode,
      ),
      file,
      smallBase64,
    })
  }
  // 触发大图渲染
  renderRawBackgroundImage()
}

const deleteCurrRawBackgroundImageInDB = async () => {
  // 删除两个 appearanceCode 的缓存（当前仅 0/1）
  await (databaseStore as any)(
    'currBackgroundImages',
    'delete',
    localState.value.currAppearanceCode,
  )
  await (databaseStore as any)(
    'currBackgroundImages',
    'delete',
    getOppositeAppearanceCode(localState.value.currAppearanceCode),
  )
}

const refreshTodayImage = async () => {
  const oldTodayImage = imageLocalState.value.bing.list[0]?.name
  await updateBingImages()
  const newTodayImage = imageLocalState.value.bing.list[0]?.name
  // updateBingImages 内部有缓存判断，若未过期则不会刷新 API，
  // 此时 newTodayImage === oldTodayImage，不会误删缓存，行为正确。
  if (newTodayImage !== oldTodayImage) {
    await deleteCurrRawBackgroundImageInDB()
  }
  renderRawBackgroundImage()
}

/**
 * 初始化背景图（应用启动时调用）
 *
 * 1. 优先从 localStorage 'l-firstScreen' 同步读取小图（模块加载时已执行，此处为 DB 数据覆盖）
 * 2. 从 IndexedDB 读取对应来源的 DB 数据，若有 smallBase64 则覆盖 previewImageUrl 并同步到 localStorage
 * 3. 根据来源加载大图：
 *    - BING_PHOTO → refreshTodayImage()（先检查今日图片是否更新，更新则删除旧缓存再加载）
 *    - 其他 → renderRawBackgroundImage()
 */
export const initBackgroundImage = async () => {
  // 渲染缩略图：仅在当前来源的 DB 有数据时才设置，避免显示过期图片导致闪烁
  if (localConfig.general.isBackgroundImageEnabled) {
    const dbData = await getCurrBackgroundImageFromDB()
    if (dbData && dbData.smallBase64) {
      imageState.previewImageUrl = dbData.smallBase64
      safeSetFirstScreen(dbData.smallBase64)
    }
  }
  // 渲染原图
  if (
    localConfig.general.backgroundImageSource ===
    BACKGROUND_IMAGE_SOURCE.BING_PHOTO
  ) {
    refreshTodayImage()
  } else {
    renderRawBackgroundImage()
  }
}

// 不涉及资源变化，仅切换外观主题（浅色/深色），直接从 DB 取对应 appearanceCode 的数据
watch(
  () => localState.value.currAppearanceCode,
  async () => {
    if (!localConfig.general.isBackgroundImageEnabled) {
      return
    }
    renderRawBackgroundImage()
  },
)

// 背景图开关：关闭时重置加载状态，避免重新开启时 loading 状态残留
// 开启时重新加载当前来源的图片，确保关闭期间切换的来源能正确生效。
// 设计取舍：关闭开关时不清空 fullImageUrl / previewImageUrl，
// 目的是关闭期间切换来源后重新开启时，旧图作为过渡画面避免闪烁，
// renderRawBackgroundImage 完成后新图自动覆盖旧图。
watch(
  () => localConfig.general.isBackgroundImageEnabled,
  async (enabled) => {
    if (enabled) {
      renderRawBackgroundImage()
    } else {
      // 关闭时重置加载状态，避免下次开启时显示残留的 loading 指示器
      isImageLoading.value = false
    }
  },
)

// 涉及资源变化：切换来源、更换网络图片、画质开关、自定义 URL 开关/地址
// 策略：仅在真正切换来源（oldSource !== newSource）时删除旧缓存，
// 自定义 URL 开关/地址、画质开关等不删除缓存。
// 注意：数组 getter 使用 JSON.stringify 序列化。若直接返回数组引用，
// 由于 Vue 3 watch 对 reactive 内部数组的 oldValue 和 newValue 始终指向同一代理引用，
// 回调中做值比较会永远相等，导致变化检测失效。JSON.stringify 将数组转为字符串，
// 回调中比较的是原始类型字符串，能正确检测变化。
watch(
  [
    () => localConfig.general.backgroundImageSource,
    () => JSON.stringify(localConfig.general.backgroundImageList),
    () => localConfig.general.backgroundImageHighQuality,
    () => localConfig.general.isBackgroundImageCustomUrlEnabled,
    () => JSON.stringify(localConfig.general.backgroundImageCustomUrls),
  ],
  async (
    [newSource, _newNames, newHighQuality, newCustomUrlEnabled],
    [oldSource, _oldNames, oldHighQuality, oldCustomUrlEnabled],
  ) => {
    // 注意：_newNames / _oldNames 是 JSON.stringify 序列化的字符串，非数组本身
    if (!localConfig.general.isBackgroundImageEnabled) {
      return
    }
    // 仅在真正切换来源时删除旧来源的 DB 缓存（非 LOCAL 来源才删除）
    // 自定义 URL 开关/地址不删除缓存，避免误删有效数据
    if (
      oldSource != null &&
      newSource !== oldSource &&
      oldSource !== BACKGROUND_IMAGE_SOURCE.LOCAL
    ) {
      // 只删除网络缓存表（currBackgroundImages），不删除用户上传的本地图片（localBackgroundImages）
      // localBackgroundImages 是用户主动导入的持久数据，切换来源时应保留，否则切回本地时图片丢失
      await deleteCurrRawBackgroundImageInDB()
    }
    // 画质切换：URL 中的质量参数变了，需要重新下载新质量图片
    if (oldHighQuality != null && newHighQuality !== oldHighQuality) {
      await deleteCurrRawBackgroundImageInDB()
    }
    // 切换网络图片（同来源换图或 Bing↔Pexels）：删除旧缓存，下载新图
    if (_oldNames != null && _oldNames !== _newNames) {
      await deleteCurrRawBackgroundImageInDB()
    }
    // 自定义 URL 关闭时：删除 DB 中残留的自定义 URL 缓存，避免回退到网络图片时误用。
    // 设计取舍：此处删除 currBackgroundImages 表中两个 appearanceCode 的全部缓存，
    // 而非仅删除自定义 URL 对应的外观码。原因是无法从缓存记录中区分哪些来自自定义 URL、
    // 哪些来自网络图片。删除后网络图片会在下次使用时自动重建缓存，代价是短暂重新下载。
    // 不影响功能正确性（旧图会自动重新下载），且避免了回退到自定义 URL 图片的风险。
    if (oldCustomUrlEnabled && !newCustomUrlEnabled) {
      await deleteCurrRawBackgroundImageInDB()
    }
    // 来源切换时：清理旧来源残留的预览图，避免短暂显示过期图片
    if (oldSource != null && newSource !== oldSource) {
      // 离开 LOCAL 来源时清空预览和首屏缓存
      // 预览图是旧来源的 blob URL，不应继续显示；l-firstScreen 中的旧图 base64 也会在下次刷新页面时误导 previewImageUrl
      if (oldSource === BACKGROUND_IMAGE_SOURCE.LOCAL) {
        imageState.previewImageUrl = ''
        safeSetFirstScreen('')
      }
    }
    // 来源为 LOCAL 时，从 DB 恢复 smallBase64，用于：
    //   1. 写入 localStorage（首屏秒开）
    //   2. 恢复 previewImageUrl（避免被其他来源覆盖的旧 localStorage 误导）
    // 一次 DB 查询，两处复用结果。
    if (
      localConfig.general.backgroundImageSource ===
      BACKGROUND_IMAGE_SOURCE.LOCAL
    ) {
      const dbData = await getCurrBackgroundImageFromDB()
      if (dbData?.smallBase64) {
        safeSetFirstScreen(dbData.smallBase64)
        imageState.previewImageUrl = dbData.smallBase64
      }
    }
    // 仅渲染当前 appearanceCode 对应的图片。
    // 另一外观的图片在用户切换主题时由 currAppearanceCode watch 触发加载（按需延迟加载），
    // 不必在此预加载，避免下载用户可能永远看不到的图片。
    renderRawBackgroundImage()
  },
)
