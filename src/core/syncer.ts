import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { watch } from 'chokidar'
import { copy, emptyDir, remove } from 'fs-extra/esm'
import { logFileChange } from '../utils/logger.js'

export interface SyncInstance {
  stop: () => Promise<void>
  fullSync: () => Promise<void>
}

async function copyFileOrDir(srcPath: string, destPath: string) {
  if (srcPath.endsWith('.ts')) { return }
  try {
    await copy(srcPath, destPath)
    logFileChange(srcPath, 'updated')
  }
  catch (err) {
    console.error(`  ✗ Failed to copy ${srcPath}:`, err)
  }
}

async function removeFileOrDir(destPath: string) {
  try {
    await remove(destPath)
    logFileChange(destPath, 'removed')
  }
  catch (err) {
    console.error(`  ✗ Failed to remove ${destPath}:`, err)
  }
}

export function startSync(
  srcDir: string,
  destDir: string,
  ignorePatterns: (RegExp | string)[] = [],
): SyncInstance {
  const watcher = watch(srcDir, {
    ignored: [/(^|[/\\])\../, ...ignorePatterns],
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: {
      stabilityThreshold: 100,
      pollInterval: 10,
    },
  })

  watcher
    .on('change', (srcPath) => {
      const destPath = join(destDir, srcPath.slice(srcDir.length))
      copyFileOrDir(srcPath, destPath)
    })
    .on('add', (srcPath) => {
      const destPath = join(destDir, srcPath.slice(srcDir.length))
      copyFileOrDir(srcPath, destPath)
    })
    .on('addDir', (srcPath) => {
      const destPath = join(destDir, srcPath.slice(srcDir.length))
      copyFileOrDir(srcPath, destPath)
    })
    .on('unlink', (srcPath) => {
      const destPath = join(destDir, srcPath.slice(srcDir.length))
      removeFileOrDir(destPath)
    })
    .on('unlinkDir', (srcPath) => {
      const destPath = join(destDir, srcPath.slice(srcDir.length))
      removeFileOrDir(destPath)
    })
    .on('error', error => console.error(`  ✗ Watcher error: ${error}`))

  return {
    stop: async () => {
      await watcher.close()
    },
    fullSync: async () => {
      if (!existsSync(srcDir)) { return }
      await emptyDir(destDir)
      await copy(srcDir, destDir)
    },
  }
}
