import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import pc from 'picocolors'
import { resolveEntry, runWatchBuild } from '../core/builder.js'
import { getProjectConfig, getProjectDir } from '../core/project.js'
import { startSync } from '../core/syncer.js'
import { spinnerFail, spinnerStart, spinnerSucceed } from '../utils/logger.js'
import { getMcPaths, getMcProjectDir } from '../utils/mcpath.js'

interface DevOptions {
  sync?: boolean
}

const TS_FILTER = (src: string) => !src.endsWith('.ts')

function syncDir(src: string, dest: string, label: string) {
  if (!existsSync(src)) { return }
  spinnerStart(`Syncing ${label}...`)
  startSync(src, dest, ['**/*.ts'])
  spinnerSucceed(`Watching ${label}`)
}

export async function devCommand(options: DevOptions = {}) {
  const projectDir = getProjectDir()
  if (!projectDir) {
    console.error(pc.red('  ✗ No quick-start.json found'))
    process.exit(1)
  }

  const config = getProjectConfig(projectDir)
  const distDir = join(projectDir, 'dist')

  console.log(pc.cyan(`  Developing: ${config.name}`))
  console.log()

  // Mirror behavior_pack → dist/behavior_pack
  const bpSrc = join(projectDir, 'src', 'behavior_pack')
  const bpOut = join(distDir, 'behavior_pack')
  if (existsSync(bpSrc)) {
    spinnerStart('Mirroring behavior_pack...')
    const { copy } = await import('fs-extra/esm')
    await copy(bpSrc, bpOut, { filter: TS_FILTER })
    spinnerSucceed('Initial sync: behavior_pack')
    syncDir(bpSrc, bpOut, 'behavior_pack')
  }

  // Mirror resource_pack → dist/resource_pack
  const rpSrc = join(projectDir, 'src', 'resource_pack')
  const rpOut = join(distDir, 'resource_pack')
  if (existsSync(rpSrc)) {
    spinnerStart('Mirroring resource_pack...')
    const { copy } = await import('fs-extra/esm')
    await copy(rpSrc, rpOut, { filter: TS_FILTER })
    spinnerSucceed('Initial sync: resource_pack')
    syncDir(rpSrc, rpOut, 'resource_pack')
  }

  // Start Vite watch if TypeScript scripts
  if (config.hasScripts && config.language === 'typescript') {
    const resolved = resolveEntry(projectDir)
    if (resolved) {
      try {
        spinnerStart('Starting Vite build in watch mode...')
        await runWatchBuild({
          entry: resolved.entry,
          projectDir,
          outputDir: distDir,
          entryFileNames: resolved.entryFileNames,
          mode: 'development',
        })
      }
      catch (err) {
        spinnerFail('Build failed')
        console.error(err)
        process.exit(1)
      }
    }
  }

  // --sync: mirror dist → MC dev packs
  if (options.sync) {
    const mcPaths = getMcPaths(projectDir)
    if (!mcPaths) {
      console.error(pc.red('  ✗ Minecraft path not found. Set MC_DEV_PATH'))
      process.exit(1)
    }

    const { bpDir: mcBpDir, rpDir: mcRpDir } = getMcProjectDir(mcPaths, config.name)

    console.log()
    console.log(`  ${pc.dim('MC BP:')} ${mcBpDir}`)

    if (existsSync(bpOut)) {
      spinnerStart('Syncing to Minecraft...')
      const { copy } = await import('fs-extra/esm')
      await copy(bpOut, mcBpDir, { filter: TS_FILTER })
      spinnerSucceed('Sync: BP to Minecraft')
      startSync(bpOut, mcBpDir, ['**/*.ts'])
    }

    if (existsSync(rpOut) && config.uuids.resourcePack) {
      spinnerStart('Syncing to Minecraft...')
      const { copy } = await import('fs-extra/esm')
      await copy(rpOut, mcRpDir!, { filter: TS_FILTER })
      spinnerSucceed('Sync: RP to Minecraft')
      startSync(rpOut, mcRpDir!, ['**/*.ts'])
    }

    console.log()
    console.log(pc.green('  ✓ Dev mode with MC sync active'))
  }
}
