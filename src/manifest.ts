import fs from 'fs-extra'
import type { Manifest } from 'webextension-polyfill'
import type PkgType from '../package.json'
import { isDev, port, r } from '../scripts/utils'

export async function getManifest() {
  const pkg = await fs.readJSON(r('package.json')) as typeof PkgType

  // update this file to update this manifest.json
  // can also be conditional based on your need
  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: 2,
    name: '__MSG_appName__',
    version: pkg.version,
    description: '__MSG_appDesc__',
    default_locale: 'zh_CN',
    browser_action: {
      default_icon: './assets/img/icon/icon.png',
    },
    icons: {
      16: './assets/img/icon/icon-16x16.png',
      48: './assets/img/icon/icon-48x48.png',
      128: './assets/img/icon/icon-128x128.png',
    },
    permissions: [
      'storage',
      'chrome://favicon/',
      'https://cn.bing.com/', // image
      'https://*.qweather.com/', // weather
      'https://*.baidu.com/', // search, news
      'https://*.zhihu.com/', // news
      'https://*.weibo.com/', // news
      'https://*.v2ex.com/', // news
    ],
    optional_permissions: [
      'bookmarks',
    ],
    chrome_url_overrides: {
      newtab: './dist/newtab/index.html',
    },
    // options_ui: {
    //   page: './dist/options/index.html',
    //   open_in_tab: true,
    //   chrome_style: false,
    // },
    // background: {
    //   page: './dist/background/index.html',
    //   persistent: false,
    // },
    // content_scripts: [{
    //   matches: ['http://*/*', 'https://*/*'],
    //   js: ['./dist/contentScripts/index.global.js'],
    // }],
    // web_accessible_resources: [
    //   'dist/contentScripts/style.css',
    // ],
    // content_security_policy: 'script-src \'self\' https://www.googletagmanager.com; object-src \'self\'',
    content_security_policy: 'script-src \'self\' https://ssl.google-analytics.com; object-src \'self\'',
  }

  if (isDev) {
    // for content script, as browsers will cache them for each reload,
    // we use a background script to always inject the latest version
    // see src/background/contentScriptHMR.ts
    // delete manifest.content_scripts
    // manifest.permissions?.push('webNavigation')

    // this is required on dev for Vite script to load
    // manifest.content_security_policy = `script-src \'self\' https://www.googletagmanager.com http://localhost:${port}; object-src \'self\'`
    manifest.content_security_policy = `script-src \'self\' https://ssl.google-analytics.com http://localhost:${port}; object-src \'self\'`
  }

  return manifest
}
