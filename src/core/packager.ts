import { createWriteStream, existsSync, mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import archiver from 'archiver'

export interface PackageOptions {
  behaviorPackDir: string
  resourcePackDir?: string
  outputFile: string
}

export async function createMcAddon(options: PackageOptions): Promise<void> {
  const { behaviorPackDir, resourcePackDir, outputFile } = options

  mkdirSync(dirname(outputFile), { recursive: true })

  return new Promise((resolve, reject) => {
    const output = createWriteStream(outputFile)
    const archive = archiver('zip', { zlib: { level: 9 } })

    output.on('close', resolve)
    archive.on('error', reject)

    archive.pipe(output)

    if (existsSync(behaviorPackDir)) {
      archive.directory(behaviorPackDir, 'behavior_pack')
    }

    if (resourcePackDir && existsSync(resourcePackDir)) {
      archive.directory(resourcePackDir, 'resource_pack')
    }

    archive.finalize()
  })
}
