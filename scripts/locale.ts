import fs from 'fs-extra'
import { r, log } from './utils'

export async function writeLocales() {
  await fs.copy(r('src/_locales'), r('extension/_locales'))
  log('PRE', 'write _locales')
}

writeLocales()
