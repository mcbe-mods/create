import { existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import pc from 'picocolors'
import { resolveEntry, runBuild } from '../core/builder.js'
import { createMcAddon } from '../core/packager.js'
import { getProjectConfig, getProjectDir } from '../core/project.js'
import { spinnerFail, spinnerStart, spinnerSucceed } from '../utils/logger.js'

const TS_FILTER = (src: string) => !src.endsWith('.ts')

export async function buildCommand(options: { package?: boolean }) {
  const projectDir = getProjectDir()
  if (!projectDir) {
    console.error(pc.red('  ✗ No mcbe.config.json found'))
    process.exit(1)
  }

  const config = getProjectConfig(projectDir)
  const distDir = join(projectDir, 'dist')
  const bpOut = join(distDir, 'behavior_pack')
  const rpOut = join(distDir, 'resource_pack')

  // Mirror src/behavior_pack → dist/behavior_pack
  const bpSrc = join(projectDir, 'src', 'behavior_pack')
  if (existsSync(bpSrc)) {
    spinnerStart('Copying behavior_pack...')
    const { copy } = await import('fs-extra/esm')
    await copy(bpSrc, bpOut, { filter: TS_FILTER })
    spinnerSucceed('Behavior pack copied')
  }

  // Mirror src/resource_pack → dist/resource_pack
  const rpSrc = join(projectDir, 'src', 'resource_pack')
  const hasRp = config.uuids.resourcePack != null
  if (existsSync(rpSrc) && hasRp) {
    spinnerStart('Copying resource_pack...')
    const { copy } = await import('fs-extra/esm')
    await copy(rpSrc, rpOut, { filter: TS_FILTER })
    spinnerSucceed('Resource pack copied')
  }

  // TypeScript build
  if (config.hasScripts && config.language === 'typescript') {
    const resolved = resolveEntry(projectDir)
    if (resolved) {
      spinnerStart('Building TypeScript...')
      try {
        await runBuild({
          entry: resolved.entry,
          projectDir,
          outputDir: distDir,
          entryFileNames: resolved.entryFileNames,
          mode: 'production',
        })
        spinnerSucceed('Build complete')
      }
      catch (err) {
        spinnerFail('Build failed')
        console.error(err)
        process.exit(1)
      }
    }
  }

  // Package .mcaddon
  if (options.package !== false && existsSync(bpOut)) {
    spinnerStart('Packaging...')
    const packDir = join(projectDir, 'pack')
    mkdirSync(packDir, { recursive: true })
    const outputFile = join(packDir, `${config.name}-v${config.version}.mcaddon`)

    try {
      await createMcAddon({
        behaviorPackDir: bpOut,
        resourcePackDir: hasRp && existsSync(rpOut) ? rpOut : undefined,
        outputFile,
      })
      spinnerSucceed(`Packaged: ${outputFile}`)
    }
    catch (err) {
      spinnerFail('Packaging failed')
      console.error(err)
      process.exit(1)
    }
  }

  console.log()
  console.log(pc.green(`  ✓ Build complete: ${config.name} v${config.version}`))
  console.log()
}
