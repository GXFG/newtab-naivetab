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
      16: './assets/img/icon/icon-16.png',
      48: './assets/img/icon/icon-48.png',
      128: './assets/img/icon/icon-128.png',
    },
    permissions: [
      'tabs',
      'storage',
      'chrome://favicon/',
      'https://cn.bing.com/', // image
      'https://api.weatherapi.com/', // weather
      'https://www.baidu.com/', // search
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
    content_security_policy: 'script-src \'self\' https://ssl.google-analytics.com; object-src \'self\'',
  }

  if (isDev) {
    // for content script, as browsers will cache them for each reload,
    // we use a background script to always inject the latest version
    // see src/background/contentScriptHMR.ts
    // delete manifest.content_scripts
    // manifest.permissions?.push('webNavigation')

    // this is required on dev for Vite script to load
    manifest.content_security_policy = `script-src \'self\' https://ssl.google-analytics.com http://localhost:${port}; object-src \'self\'`
  }

  return manifest
}
