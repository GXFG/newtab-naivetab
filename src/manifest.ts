import fs from 'fs-extra'
import type { Manifest } from 'webextension-polyfill'
import type PkgType from '../package.json'
import { isDev, port, r } from '../scripts/utils'

export async function getManifest() {
  const pkg = await fs.readJSON(r('package.json')) as typeof PkgType

  const manifest: Manifest.WebExtensionManifest = {
    manifest_version: 3,
    name: '__MSG_appName__',
    version: pkg.version,
    description: '__MSG_appDesc__',
    default_locale: 'zh_CN',
    action: {
      default_icon: './assets/img/icon/icon.png',
      default_popup: './dist/popup/index.html',
    },
    icons: {
      16: './assets/img/icon/icon-16x16.png',
      48: './assets/img/icon/icon-48x48.png',
      128: './assets/img/icon/icon-128x128.png',
    },
    permissions: [
      'storage',
      'favicon',
      'tabs',
    ],
    host_permissions: [
      '*://*/*',
    ],
    optional_permissions: [
      'bookmarks',
    ],
    chrome_url_overrides: {
      newtab: './dist/newtab/index.html',
    },
    background: {
      service_worker: './dist/background/index.mjs',
    },
    // 一个扩展可以有很多命令，但只能指定 4 个建议的键。
    commands: {
      1: {
        description: '__MSG_command1__',
      },
      2: {
        description: '__MSG_command2__',
      },
      3: {
        description: '__MSG_command3__',
      },
      4: {
        description: '__MSG_command4__',
      },
      5: {
        description: '__MSG_command5__',
      },
      6: {
        description: '__MSG_command6__',
      },
      7: {
        description: '__MSG_command7__',
      },
      8: {
        description: '__MSG_command8__',
      },
      9: {
        description: '__MSG_command9__',
      },
      0: {
        description: '__MSG_command0__',
      },
      q: {
        suggested_key: {
          default: 'Alt+Q',
        },
        description: '__MSG_commandQ__',
      },
      w: {
        suggested_key: {
          default: 'Alt+W',
        },
        description: '__MSG_commandW__',
      },
      e: {
        description: '__MSG_commandE__',
      },
      r: {
        description: '__MSG_commandR__',
      },
      t: {
        description: '__MSG_commandT__',
      },
      y: {
        description: '__MSG_commandY__',
      },
      u: {
        description: '__MSG_commandU__',
      },
      i: {
        description: '__MSG_commandI__',
      },
      o: {
        description: '__MSG_commandO__',
      },
      p: {
        description: '__MSG_commandP__',
      },
      a: {
        suggested_key: {
          default: 'Alt+A',
        },
        description: '__MSG_commandA__',
      },
      s: {
        suggested_key: {
          default: 'Alt+S',
        },
        description: '__MSG_commandS__',
      },
      d: {
        description: '__MSG_commandD__',
      },
      f: {
        description: '__MSG_commandF__',
      },
      g: {
        description: '__MSG_commandG__',
      },
      h: {
        description: '__MSG_commandH__',
      },
      j: {
        description: '__MSG_commandJ__',
      },
      k: {
        description: '__MSG_commandK__',
      },
      l: {
        description: '__MSG_commandL__',
      },
      z: {
        description: '__MSG_commandZ__',
      },
      x: {
        description: '__MSG_commandX__',
      },
      c: {
        description: '__MSG_commandC__',
      },
      v: {
        description: '__MSG_commandV__',
      },
      b: {
        description: '__MSG_commandB__',
      },
      n: {
        description: '__MSG_commandN__',
      },
      m: {
        description: '__MSG_commandM__',
      },
      Comma: {
        description: '__MSG_commandComma__',
      },
      Period: {
        description: '__MSG_commandPeriod__',
      },
    },
    // options_ui: {
    //   page: './dist/options/index.html',
    //   open_in_tab: true,
    // },
    // content_scripts: [
    //   {
    //     matches: ['http://*/*', 'https://*/*'],
    //     js: ['./dist/contentScripts/index.global.js'],
    //   },
    // ],
    // web_accessible_resources: [
    //   {
    //     resources: ['dist/contentScripts/style.css'],
    //     matches: ['<all_urls>'],
    //   },
    // ],
    // content_security_policy: 'script-src \'self\' https://ssl.google-analytics.com; object-src \'self\'',
    content_security_policy: {
      extension_pages: isDev
        // this is required on dev for Vite script to load
        ? `script-src 'self' http://localhost:${port}; object-src 'self' http://localhost:${port}`
        : 'script-src \'self\'; object-src \'self\'',
    },
  }

  if (isDev) {
    // for content script, as browsers will cache them for each reload,
    // we use a background script to always inject the latest version
    // see src/background/contentScriptHMR.ts

    // delete manifest.content_scripts
    // manifest.permissions?.push('webNavigation')

    // this is required on dev for Vite script to load

    // manifest.content_security_policy = `script-src \'self\' https://ssl.google-analytics.com http://localhost:${port}; object-src \'self\'`
  }

  return manifest
}
