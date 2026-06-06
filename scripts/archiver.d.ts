/**
 * archiver v8 最小类型声明
 *
 * archiver v8 是 ESM-only 包，无内置类型定义，且 @types/archiver 仅覆盖到 v7。
 * 本声明仅覆盖 pack-zip.ts 实际用到的 API，非完整类型。
 */
declare module 'archiver' {
  import type { Transform } from 'node:stream'

  interface ArchiverOptions {
    zlib?: { level: number }
  }

  class Archiver extends Transform {
    directory(dirPath: string, destPath: string): void
    file(filePath: string, options: { name: string }): void
    finalize(): void
    pointer(): number
  }

  export class ZipArchive extends Archiver {
    constructor(options?: ArchiverOptions)
  }
}
