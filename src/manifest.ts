import fs from 'fs-extra'
import type { Manifest } from 'webextension-polyfill'
import type PkgType from '../package.json'
import { isDev, port, r } from '../scripts/utils'

export async function getManifest() {
  const pkg = (await fs.readJSON(r('package.json'))) as typeof PkgType

  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: 3,
    name: '__MSG_appName__',
    version: pkg.version,
    description: '__MSG_appDesc__',
    default_locale: 'zh_CN',
    action: {
      default_icon: '/assets/img/icon/icon.png',
      default_popup: '/dist/popup/index.html',
    },
    icons: {
      16: '/assets/img/icon/icon-16x16.png',
      48: '/assets/img/icon/icon-48x48.png',
      128: '/assets/img/icon/icon-128x128.png',
    },
    permissions: [
      'storage',
      'tabs',
      'scripting',
      'sessions',
      'tabGroups',
      'system.display',
    ],
    host_permissions: ['*://*/*'],
    optional_permissions: ['bookmarks', 'notifications'],
    chrome_url_overrides: {
      newtab: '/dist/newtab/index.html',
    },
    options_ui: {
      page: '/dist/options/index.html',
      open_in_tab: true,
    },
    background: {
      service_worker: '/dist/background/index.mjs',
      type: 'module',
    },
    content_scripts: [
      {
        matches: ['<all_urls>'],
        match_about_blank: true,
        js: ['dist/contentScripts/index.global.js'],
        run_at: 'document_start',
        // all_frames 默认为 false，仅注入顶层 frame。
        // 快捷键（标签切换、页面刷新、书签打开）都是顶层页面操作，
        // iframe（广告、支付、第三方嵌入）中不需要响应快捷键。
        // allFrames: true 会导致每个 iframe 都注入 CS + 建立 Port + 解析配置，
        // 多倍资源消耗却无实际用户收益，且可能引发按键重复执行。
      },
    ],
    // 一个扩展可以有很多命令，但只能指定 4 个建议的键。
    // commands: {},
    // web_accessible_resources: [
    //   {
    //     resources: ['dist/contentScripts/style.css'],
    //     matches: ['<all_urls>'],
    //   },
    // ],
    content_security_policy: {
      // this is required on dev for Vite script to load
      extension_pages: isDev
        ? `script-src 'self' http://localhost:${port}; object-src 'self'`
        : `script-src 'self'; object-src 'self'`,
    },
  }

  if (process.env.BROWSER === 'firefox') {
    manifest.background = {
      scripts: ['/dist/background/index.mjs'],
      type: 'module',
    }
    manifest.browser_specific_settings = {
      gecko: {
        id: 'gxfgim@outlook.com',
        strict_min_version: '130.0',
      },
    }
  } else {
    // favicon permission 仅 Chrome 支持
    manifest.permissions!.push('favicon')
  }
  return manifest
}
