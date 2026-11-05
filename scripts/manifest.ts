import fs from 'fs-extra'
import { getManifest } from '../src/manifest'
import { BROWSER_DIR, log, r } from './utils'

export async function writeManifest() {
  await fs.writeJSON(r(`${BROWSER_DIR}/manifest.json`), await getManifest(), {
    spaces: 2,
  })
  log('PRE', `write ${BROWSER_DIR}/manifest.json`)
}

writeManifest()
