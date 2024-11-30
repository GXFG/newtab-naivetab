import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { bgCyan, black } from 'kolorist'

export const port = parseInt(process.env.PORT || '', 10) || 3303
export const isDev = process.env.NODE_ENV !== 'production'

// temp  __dirname is not defined in ES module scope
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
export const r = (...args: string[]) => resolve(__dirname, '..', ...args)

export function log(name: string, message: string) {
  console.log(black(bgCyan(` ${name} `)), message)
}
