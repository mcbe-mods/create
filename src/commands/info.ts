import { existsSync } from 'node:fs'
import { join } from 'node:path'
import pc from 'picocolors'
import { getProjectConfig, getProjectDir } from '../core/project.js'
import { getMcPaths, getMcProjectDir } from '../utils/mcpath.js'

export async function infoCommand() {
  const projectDir = getProjectDir()
  const config = getProjectConfig(projectDir)
  const mcPaths = getMcPaths(projectDir)
  const distDir = join(projectDir, 'dist')
  const packDir = join(projectDir, 'pack')

  const hasDist = existsSync(distDir)
  const hasRp = config.uuids.resourcePack != null
  const mcConnected = mcPaths != null

  let mcInfo = 'Not found'
  if (mcConnected) {
    const { bpDir } = getMcProjectDir(mcPaths!, config.name)
    const bpExists = existsSync(bpDir)
    mcInfo = bpExists ? `✓ ${bpDir}` : 'Not synced'
  }

  const line = pc.dim('─'.repeat(50))

  console.log()
  console.log(pc.bold(pc.blue('  @mcbe-mods/create project')))
  console.log(line)
  console.log(`  ${pc.bold('Name:')}       ${config.name}`)
  console.log(`  ${pc.bold('Version:')}    ${config.version}`)
  if (config.author) { console.log(`  ${pc.bold('Author:')}    ${config.author}`) }
  if (config.description) { console.log(`  ${pc.bold('Desc:')}      ${config.description}`) }
  console.log(`  ${pc.bold('License:')}   ${config.license || '-'}`)
  console.log(`  ${pc.bold('Scripts:')}   ${config.hasScripts ? '✓' : '✗'} ${config.language || '-'}`)
  console.log(`  ${pc.bold('Resource:')}  ${hasRp ? '✓' : '✗'}`)
  console.log(`  ${pc.bold('Minecraft:')} ${mcConnected ? '✓' : '✗'} ${mcInfo}`)
  console.log(`  ${pc.bold('Dist:')}      ${hasDist ? '✓' : '✗'} ${hasDist ? distDir : ''}`)
  console.log(`  ${pc.bold('Pack:')}      ${existsSync(packDir) ? '✓' : '✗'}`)
  console.log(line)
  console.log()
}
