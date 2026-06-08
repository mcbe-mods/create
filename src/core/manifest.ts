import type { QuickStartConfig } from '../types.js'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { getMcDependencyVersion, getProjectConfig, parseVersion } from './project.js'

export function generateBpManifest(config: QuickStartConfig, minecraftServerVersion = '1.18.0'): object {
  const hasScripts = config.hasScripts && config.uuids.module != null
  const scriptModule = hasScripts
    ? {
        type: 'script' as const,
        language: 'javascript' as const,
        uuid: config.uuids.module,
        entry: 'scripts/main.js',
        version: parseVersion(config.version) as [number, number, number],
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
      version: minecraftServerVersion,
    })
  }

  if (config.uuids.resourcePack) {
    (manifest.dependencies as Array<Record<string, unknown>>).push({
      uuid: config.uuids.resourcePack,
      version: parseVersion(config.version),
    })
  }

  manifest.metadata = buildMetadata(config)

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
        version: parseVersion(config.version),
        uuid: config.uuids.module || config.uuids.resourcePack,
      },
    ],
    dependencies: [],
  }

  if (config.uuids.behaviorPack) {
    (manifest.dependencies as Array<Record<string, unknown>>).push({
      uuid: config.uuids.behaviorPack,
      version: parseVersion(config.version),
    })
  }

  manifest.metadata = buildMetadata(config)

  return manifest
}

function buildMetadata(config: QuickStartConfig): Record<string, unknown> {
  const metadata: Record<string, unknown> = {}
  if (config.author) { metadata.authors = [config.author] }
  if (config.license) { metadata.license = config.license }
  else { metadata.license = 'MIT' }
  if (config.homepage) { metadata.url = config.homepage }
  else { metadata.url = 'https://github.com/mcbe-mods' }
  return metadata
}

export function writeManifest(
  dir: string,
  type: 'behavior_pack' | 'resource_pack',
  config: QuickStartConfig,
  minecraftServerVersion?: string,
): void {
  const manifest = type === 'resource_pack'
    ? generateRpManifest(config)
    : generateBpManifest(config, minecraftServerVersion)

  const manifestPath = join(dir, 'manifest.json')
  mkdirSync(dirname(manifestPath), { recursive: true })
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
}

export function patchManifest(projectDir: string): void {
  const config = getProjectConfig(projectDir)
  const version = parseVersion(config.version)

  for (const packType of ['behavior_pack', 'resource_pack'] as const) {
    const dir = join(projectDir, 'src', packType)
    const manifestPath = join(dir, 'manifest.json')
    if (!existsSync(manifestPath)) { continue }

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

    const packKey = packType === 'behavior_pack' ? 'behaviorPack' : 'resourcePack'
    if (config.uuids[packKey]) {
      manifest.header.uuid = config.uuids[packKey]
    }
    manifest.header.version = version
    manifest.header.min_engine_version = config.minEngineVersion

    if (packType === 'behavior_pack' && config.uuids.module && config.hasScripts) {
      const scriptModule = manifest.modules?.find((m: { type: string }) => m.type === 'script')
      if (scriptModule) {
        scriptModule.uuid = config.uuids.module
        scriptModule.version = version
      }
    }

    if (manifest.dependencies) {
      for (const dep of manifest.dependencies) {
        if (dep.module_name?.startsWith('@minecraft/')) {
          const pkgVersion = getMcDependencyVersion(projectDir, dep.module_name)
          if (pkgVersion) {
            dep.version = pkgVersion
          }
        }
        else if (dep.uuid === config.uuids.behaviorPack || dep.uuid === config.uuids.resourcePack) {
          dep.version = version
        }
      }
    }

    const pkg = JSON.parse(readFileSync(join(projectDir, 'package.json'), 'utf-8'))
    if (!manifest.metadata) { manifest.metadata = {} }
    if (pkg.author) { manifest.metadata.authors = [pkg.author] }
    manifest.metadata.license = pkg.license || 'MIT'
    manifest.metadata.url = pkg.homepage || 'https://github.com/mcbe-mods'

    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
  }
}
