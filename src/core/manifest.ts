import type { QuickStartConfig } from '../types.js'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseVersion } from './project.js'

export function generateBpManifest(config: QuickStartConfig): object {
  const scriptModule = config.hasScripts
    ? {
        type: 'script' as const,
        language: 'javascript' as const,
        uuid: config.uuids.module,
        entry: 'scripts/main.js',
        version: [1, 0, 0] as [number, number, number],
      }
    : undefined

  const manifest: Record<string, unknown> = {
    format_version: 2,
    header: {
      description: 'pack.description',
      name: 'pack.name',
      uuid: config.uuids.behaviorPack,
      version: parseVersion(config.version),
      min_engine_version: config.minEngineVersion,
    },
    modules: scriptModule ? [scriptModule] : [],
    dependencies: [],
  }

  if (scriptModule) {
    (manifest.dependencies as Array<Record<string, unknown>>).push({
      module_name: '@minecraft/server',
      version: '*',
    })
  }

  if (config.uuids.resourcePack) {
    (manifest.dependencies as Array<Record<string, unknown>>).push({
      uuid: config.uuids.resourcePack,
      version: [1, 0, 0],
    })
  }

  if (config.author) {
    manifest.metadata = {
      authors: [config.author],
    }
  }

  return manifest
}

export function generateRpManifest(config: QuickStartConfig): object {
  if (!config.uuids.resourcePack) {
    throw new Error('Resource pack UUID not configured')
  }

  const manifest: Record<string, unknown> = {
    format_version: 2,
    header: {
      description: 'pack.description',
      name: 'pack.name',
      uuid: config.uuids.resourcePack,
      version: parseVersion(config.version),
      min_engine_version: config.minEngineVersion,
    },
    modules: [
      {
        type: 'resources',
        version: [1, 0, 0],
        uuid: config.uuids.module,
      },
    ],
    dependencies: [],
  }

  if (config.uuids.behaviorPack) {
    (manifest.dependencies as Array<Record<string, unknown>>).push({
      uuid: config.uuids.behaviorPack,
      version: [1, 0, 0],
    })
  }

  return manifest
}

export function writeManifest(dir: string, type: 'behavior_pack' | 'resource_pack', config: QuickStartConfig): void {
  const manifest = type === 'resource_pack'
    ? generateRpManifest(config)
    : generateBpManifest(config)

  const manifestPath = join(dir, 'manifest.json')
  mkdirSync(dirname(manifestPath), { recursive: true })
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
}
