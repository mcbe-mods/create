#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { program } from 'commander'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'))

program
  .name('mcbe-create')
  .description('Minecraft Bedrock Edition addon development CLI')
  .version(pkg.version)

program
  .command('init')
  .description('Create a new Minecraft BE addon project, or add packs to existing project')
  .argument('<project-name>', 'Project name (ignored when run in existing project)')
  .option('-t, --template <template>', 'Template to use (default, explosive-bow)')
  .option('-y, --yes', 'Skip prompts, use defaults')
  .option('--no-install', 'Skip dependency installation')
  .action(async (name: string, options: { template?: string, yes?: boolean, install?: boolean }) => {
    const { initCommand } = await import('./commands/init.js')
    await initCommand(name, options)
  })

program
  .command('dev')
  .description('Start development mode')
  .option('--sync', 'Also sync changes to Minecraft development packs')
  .action(async (options: { sync?: boolean }) => {
    const { devCommand } = await import('./commands/dev.js')
    await devCommand(options)
  })

program
  .command('build')
  .description('Build and package for production')
  .option('--no-package', 'Skip .mcaddon packaging')
  .action(async (options: { package?: boolean }) => {
    const { buildCommand } = await import('./commands/build.js')
    await buildCommand(options)
  })

program
  .command('sync')
  .description('Sync built output to Minecraft development packs')
  .action(async () => {
    const { syncCommand } = await import('./commands/sync.js')
    await syncCommand()
  })

program
  .command('manifest')
  .description('Regenerate manifest.json from project config')
  .action(async () => {
    const { manifestCommand } = await import('./commands/manifest.js')
    await manifestCommand()
  })

program
  .command('info')
  .description('Show project information')
  .action(async () => {
    const { infoCommand } = await import('./commands/info.js')
    await infoCommand()
  })

program.parse()
