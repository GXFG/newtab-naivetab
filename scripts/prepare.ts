// generate stub index.html files for dev entry
import { execSync } from 'child_process'
import fs from 'fs-extra'
import chokidar from 'chokidar'
import { r, isDev, log } from './utils'

/**
 * Stub index.html to use Vite in development
 */
async function stubIndexHtml() {
  const views = [
    'newtab',
    'popup',
    // 'options',
  ]

  for (const view of views) {
    await fs.ensureDir(r(`extension/dist/${view}`))
    let data = await fs.readFile(r(`src/${view}/index.html`), 'utf-8')

    data = data
      .replace('"./main.ts"', `"/${view}/main.ts.js"`)
      .replace('<div id="app"></div>', '<div id="app">Vite server did not start</div>')

    data += `<style type="text/css">
        @media (prefers-color-scheme: dark) {
          body {
            background: #35363A;
            color: #fff;
          }
        }
        @media (prefers-color-scheme: light) {
          body {
            background: #fff;
            color: #35363A;
          }
        }
      </style>`
    await fs.writeFile(r(`extension/dist/${view}/index.html`), data, 'utf-8')
    log('PRE', `stub ${view}`)
  }
}

function writeManifest() {
  execSync('npx esno ./scripts/manifest.ts', { stdio: 'inherit' })
}

function writeLocales() {
  execSync('npx esno ./scripts/locale.ts', { stdio: 'inherit' })
}

fs.ensureDirSync(r('extension'))
fs.copySync(r('assets'), r('extension/assets'))

writeManifest()
writeLocales()

if (isDev) {
  stubIndexHtml()
  chokidar.watch(r('src/**/*.html'))
    .on('change', () => {
      stubIndexHtml()
    })
  chokidar.watch([r('src/manifest.ts'), r('package.json')])
    .on('change', () => {
      writeManifest()
    })
  chokidar.watch(r('src/_locales'))
    .on('change', () => {
      writeLocales()
    })
}
