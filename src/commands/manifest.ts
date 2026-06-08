import { existsSync } from 'node:fs'
import { join } from 'node:path'
import pc from 'picocolors'
import { patchManifest } from '../core/manifest.js'
import { getProjectDir } from '../core/project.js'

export async function manifestCommand() {
  const projectDir = getProjectDir()
  patchManifest(projectDir)

  for (const packType of ['behavior_pack', 'resource_pack'] as const) {
    const manifestPath = join(projectDir, 'src', packType, 'manifest.json')
    if (existsSync(manifestPath)) {
      console.log(pc.green(`  ✓ Manifest patched: ${manifestPath}`))
    }
  }
}
