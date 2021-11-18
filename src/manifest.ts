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
    name: pkg.displayName || pkg.name,
    version: pkg.version,
    description: pkg.description,
    browser_action: {
      default_icon: './assets/img/icon.png',
      // default_popup: './dist/popup/index.html',
    },
    icons: {
      16: './assets/img/icon.png',
      48: './assets/img/icon.png',
      128: './assets/img/icon.png',
    },
    permissions: [
      'tabs',
      'storage',
      'activeTab',
      'chrome://favicon/',
      'http://*/',
      'https://*/',
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
    web_accessible_resources: [
      'dist/contentScripts/style.css',
    ],
    content_security_policy: 'script-src \'self\' \'unsafe-eval\'; object-src \'self\'',
  }

  if (isDev) {
    // for content script, as browsers will cache them for each reload,
    // we use a background script to always inject the latest version
    // see src/background/contentScriptHMR.ts
    delete manifest.content_scripts
    manifest.permissions?.push('webNavigation')

    // this is required on dev for Vite script to load
    manifest.content_security_policy = `script-src \'self\' \'unsafe-eval\' http://localhost:${port}; object-src \'self\'`
  }

  return manifest
}
