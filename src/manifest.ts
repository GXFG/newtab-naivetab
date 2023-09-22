/* eslint-disable import/no-extraneous-dependencies */
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
      default_icon: './assets/img/icon/icon.png',
      default_popup: './dist/popup/index.html',
    },
    icons: {
      16: './assets/img/icon/icon-16x16.png',
      48: './assets/img/icon/icon-48x48.png',
      128: './assets/img/icon/icon-128x128.png',
    },
    permissions: ['storage', 'favicon', 'tabs'],
    host_permissions: ['*://*/*'],
    optional_permissions: ['bookmarks'],
    chrome_url_overrides: {
      newtab: './dist/newtab/index.html',
    },
    background: {
      service_worker: './dist/background/index.mjs',
    },
    // 一个扩展可以有很多命令，但只能指定 4 个建议的键。
    commands: {
      Digit1: {
        description: '__MSG_command1__',
      },
      Digit2: {
        description: '__MSG_command2__',
      },
      Digit3: {
        description: '__MSG_command3__',
      },
      Digit4: {
        description: '__MSG_command4__',
      },
      Digit5: {
        description: '__MSG_command5__',
      },
      Digit6: {
        description: '__MSG_command6__',
      },
      Digit7: {
        description: '__MSG_command7__',
      },
      Digit8: {
        description: '__MSG_command8__',
      },
      Digit9: {
        description: '__MSG_command9__',
      },
      Digit0: {
        description: '__MSG_command0__',
      },
      KeyQ: {
        suggested_key: {
          default: 'Alt+Q',
        },
        description: '__MSG_commandQ__',
      },
      KeyW: {
        suggested_key: {
          default: 'Alt+W',
        },
        description: '__MSG_commandW__',
      },
      KeyE: {
        description: '__MSG_commandE__',
      },
      KeyR: {
        description: '__MSG_commandR__',
      },
      KeyT: {
        description: '__MSG_commandT__',
      },
      KeyY: {
        description: '__MSG_commandY__',
      },
      KeyU: {
        description: '__MSG_commandU__',
      },
      KeyI: {
        description: '__MSG_commandI__',
      },
      KeyO: {
        description: '__MSG_commandO__',
      },
      KeyP: {
        description: '__MSG_commandP__',
      },
      KeyA: {
        suggested_key: {
          default: 'Alt+A',
        },
        description: '__MSG_commandA__',
      },
      KeyS: {
        suggested_key: {
          default: 'Alt+S',
        },
        description: '__MSG_commandS__',
      },
      KeyD: {
        description: '__MSG_commandD__',
      },
      KeyF: {
        description: '__MSG_commandF__',
      },
      KeyG: {
        description: '__MSG_commandG__',
      },
      KeyH: {
        description: '__MSG_commandH__',
      },
      KeyJ: {
        description: '__MSG_commandJ__',
      },
      KeyK: {
        description: '__MSG_commandK__',
      },
      KeyL: {
        description: '__MSG_commandL__',
      },
      KeyZ: {
        description: '__MSG_commandZ__',
      },
      KeyX: {
        description: '__MSG_commandX__',
      },
      KeyC: {
        description: '__MSG_commandC__',
      },
      KeyV: {
        description: '__MSG_commandV__',
      },
      KeyB: {
        description: '__MSG_commandB__',
      },
      KeyN: {
        description: '__MSG_commandN__',
      },
      KeyM: {
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
    //     matches: [
    //       '<all_urls>',
    //     ],
    //     js: [
    //       'dist/contentScripts/index.global.js',
    //     ],
    //   },
    // ],
    // web_accessible_resources: [
    //   {
    //     resources: ['dist/contentScripts/style.css'],
    //     matches: ['<all_urls>'],
    //   },
    // ],
    content_security_policy: {
      extension_pages: isDev
        ? // this is required on dev for Vite script to load
          `script-src 'self' http://localhost:${port}; object-src 'self'`
        : "script-src 'self'; object-src 'self'",
    },
  }

  // not work in MV3
  // if (isDev) {
  //   // for content script, as browsers will cache them for each reload,
  //   // we use a background script to always inject the latest version
  //   // see src/background/contentScriptHMR.ts

  //   // delete manifest.content_scripts
  //   // manifest.permissions?.push('webNavigation')

  //   // this is required on dev for Vite script to load

  //   // manifest.content_security_policy = `script-src \'self\' https://ssl.google-analytics.com http://localhost:${port}; object-src \'self\'`
  // }

  return manifest
}
