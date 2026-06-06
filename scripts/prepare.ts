// generate stub index.html files for dev entry
import { execSync } from 'node:child_process'
import fs from 'fs-extra'
import chokidar from 'chokidar'
import { isDev, log, port, r, BROWSER_DIR } from './utils'

/**
 * Stub index.html to use Vite in development
 */
async function stubIndexHtml() {
  const views = ['newtab', 'popup', 'background', 'options']

  for (const view of views) {
    await fs.ensureDir(r(`${BROWSER_DIR}/dist/${view}`))
    let data = await fs.readFile(r(`src/${view}/index.html`), 'utf-8')

    data = data
      .replace('"./main.ts"', `"http://localhost:${port}/${view}/main.ts"`)
      .replace(
        '<div id="app"></div>',
        '<div id="app">Vite server did not start</div>',
      )

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
    await fs.writeFile(
      r(`${BROWSER_DIR}/dist/${view}/index.html`),
      data,
      'utf-8',
    )
    log('PRE', `stub ${view}`)
  }
}

function writeManifest() {
  execSync('tsx ./scripts/manifest.ts', { stdio: 'inherit' })
}

function writeLocales() {
  execSync('tsx ./scripts/locale.ts', { stdio: 'inherit' })
}

fs.ensureDirSync(r(BROWSER_DIR))
fs.copySync(r('assets'), r(`${BROWSER_DIR}/assets`), {
  filter: (src) => !src.endsWith('.DS_Store'),
})

writeManifest()
writeLocales()

if (isDev) {
  stubIndexHtml()
  chokidar.watch(r('src/**/*.html')).on('change', () => {
    stubIndexHtml()
  })
  chokidar.watch([r('src/manifest.ts'), r('package.json')]).on('change', () => {
    writeManifest()
  })
  chokidar.watch(r('src/_locales')).on('change', () => {
    writeLocales()
  })
}
