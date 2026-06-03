import { existsSync } from 'node:fs'
import { join } from 'node:path'
import pc from 'picocolors'
import { getProjectConfig, getProjectDir } from '../core/project.js'
import { getMcPaths, getMcProjectDir } from '../utils/mcpath.js'

export async function syncCommand() {
  const projectDir = getProjectDir()
  if (!projectDir) {
    console.error(pc.red('  ✗ No mcbe.config.json found'))
    process.exit(1)
  }

  const config = getProjectConfig(projectDir)
  const mcPaths = getMcPaths(projectDir)
  if (!mcPaths) {
    console.error(pc.red('  ✗ Minecraft path not found'))
    process.exit(1)
  }

  const { bpDir: mcBpDir, rpDir: mcRpDir } = getMcProjectDir(mcPaths, config.name)
  const bpOutDir = join(projectDir, 'dist', 'behavior_pack')
  const rpOutDir = join(projectDir, 'dist', 'resource_pack')

  if (!existsSync(bpOutDir)) {
    console.error(pc.red('  ✗ No built output found. Run "mcbe-create build" first'))
    process.exit(1)
  }

  const { copy } = await import('fs-extra/esm')

  console.log(pc.cyan(`  Syncing ${config.name} to Minecraft...`))

  await copy(bpOutDir, mcBpDir)
  console.log(`  ✓ ${pc.dim('BP:')} ${mcBpDir}`)

  if (config.uuids.resourcePack && existsSync(rpOutDir)) {
    await copy(rpOutDir, mcRpDir!)
    console.log(`  ✓ ${pc.dim('RP:')} ${mcRpDir}`)
  }

  console.log(pc.green('  ✓ Sync complete'))
}
