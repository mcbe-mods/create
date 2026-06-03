import { join } from 'node:path'
import pc from 'picocolors'
import { writeManifest } from '../core/manifest.js'
import { getProjectConfig, getProjectDir } from '../core/project.js'

export async function manifestCommand() {
  const projectDir = getProjectDir()
  if (!projectDir) {
    console.error(pc.red('  ✗ No mcbe.config.json found'))
    process.exit(1)
  }

  const config = getProjectConfig(projectDir)
  const bpDir = join(projectDir, 'src', 'behavior_pack')
  const rpDir = config.uuids.resourcePack
    ? join(projectDir, 'src', 'resource_pack')
    : undefined

  writeManifest(bpDir, 'behavior_pack', config)
  console.log(pc.green(`  ✓ Manifest generated: ${join(bpDir, 'manifest.json')}`))

  if (rpDir) {
    writeManifest(rpDir, 'resource_pack', config)
    console.log(pc.green(`  ✓ Manifest generated: ${join(rpDir, 'manifest.json')}`))
  }
}
