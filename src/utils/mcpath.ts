import type { McPaths, QuickStartConfig } from '../types.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const WIN_STORE_PACKAGE = 'Microsoft.MinecraftUWP_8wekyb3d8bbwe'
const WIN_GAMEPASS_PACKAGE = 'Microsoft.4297127D64EC1_8wekyb3d8bbwe'

function getWinPackageName(): string | null {
  const candidates = [WIN_STORE_PACKAGE, WIN_GAMEPASS_PACKAGE]
  const localAppData = process.env.LOCALAPPDATA
  if (!localAppData) { return null }

  for (const pkg of candidates) {
    const basePath = join(localAppData, 'Packages', pkg, 'LocalState', 'games', 'com.mojang')
    if (existsSync(join(basePath, 'development_behavior_packs'))) {
      return pkg
    }
    if (existsSync(basePath)) {
      return pkg
    }
  }
  return null
}

function getDefaultMcPaths(): McPaths | null {
  if (process.platform !== 'win32') { return null }

  const pkg = getWinPackageName()
  if (!pkg) { return null }

  const localAppData = process.env.LOCALAPPDATA!
  const comMojang = join(localAppData, 'Packages', pkg, 'LocalState', 'games', 'com.mojang')

  return {
    developmentBehaviorPacks: join(comMojang, 'development_behavior_packs'),
    developmentResourcePacks: join(comMojang, 'development_resource_packs'),
  }
}

export function getMcPaths(projectDir?: string): McPaths | null {
  const envPath = process.env.MC_DEV_PATH
  if (envPath) {
    return {
      developmentBehaviorPacks: join(envPath, 'development_behavior_packs'),
      developmentResourcePacks: join(envPath, 'development_resource_packs'),
    }
  }

  if (projectDir) {
    const configPath = join(projectDir, 'mcbe.config.json')
    if (existsSync(configPath)) {
      try {
        const config: QuickStartConfig = JSON.parse(readFileSync(configPath, 'utf-8'))
        if (config.minecraft?.developmentPath) {
          return {
            developmentBehaviorPacks: join(config.minecraft.developmentPath, 'development_behavior_packs'),
            developmentResourcePacks: join(config.minecraft.developmentPath, 'development_resource_packs'),
          }
        }
      }
      catch {}
    }
  }

  return getDefaultMcPaths()
}

export function getMcProjectDir(mcPaths: McPaths, projectName: string): { bpDir: string, rpDir?: string } {
  const bpDir = join(mcPaths.developmentBehaviorPacks, projectName)
  const rpDir = join(mcPaths.developmentResourcePacks, projectName)
  return { bpDir, rpDir }
}
