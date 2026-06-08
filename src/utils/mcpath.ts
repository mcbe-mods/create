import type { McPaths } from '../types.js'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const WIN_STORE_PACKAGE = 'Microsoft.MinecraftUWP_8wekyb3d8bbwe'

function getDefaultMcPaths(): McPaths | null {
  if (process.platform !== 'win32') { return null }

  const localAppData = process.env.LOCALAPPDATA
  if (!localAppData) { return null }

  const basePath = join(localAppData, 'Packages', WIN_STORE_PACKAGE, 'LocalState', 'games', 'com.mojang')
  if (!existsSync(basePath)) { return null }

  return {
    developmentBehaviorPacks: join(basePath, 'development_behavior_packs'),
    developmentResourcePacks: join(basePath, 'development_resource_packs'),
  }
}

export function getMcPaths(_projectDir?: string): McPaths | null {
  const envPath = process.env.MCBE_DEV_PATH
  if (envPath) {
    return {
      developmentBehaviorPacks: join(envPath, 'development_behavior_packs'),
      developmentResourcePacks: join(envPath, 'development_resource_packs'),
    }
  }

  return getDefaultMcPaths()
}

export function getMcProjectDir(mcPaths: McPaths, projectName: string): { bpDir: string, rpDir?: string } {
  const bpDir = join(mcPaths.developmentBehaviorPacks, projectName)
  const rpDir = join(mcPaths.developmentResourcePacks, projectName)
  return { bpDir, rpDir }
}
