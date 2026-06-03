import type { QuickStartConfig } from '../../types.js'
import { describe, expect, it } from 'vitest'
import { generateBpManifest, generateRpManifest } from '../manifest.js'

const baseConfig: QuickStartConfig = {
  name: 'test-pack',
  version: '1.0.0',
  template: 'default',
  uuids: {
    behaviorPack: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    resourcePack: 'ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj',
    module: 'kkkkkkkk-llll-mmmm-nnnn-oooooooooooo',
  },
  minEngineVersion: [1, 21, 0],
}

describe('generateBpManifest', () => {
  it('should generate a basic behavior pack manifest', () => {
    const manifest = generateBpManifest(baseConfig)
    expect(manifest).toMatchObject({
      format_version: 2,
      header: {
        description: 'pack.description',
        name: 'pack.name',
        uuid: baseConfig.uuids.behaviorPack,
        version: [1, 0, 0],
        min_engine_version: [1, 21, 0],
      },
      modules: [],
      dependencies: [
        {
          uuid: baseConfig.uuids.resourcePack,
          version: [1, 0, 0],
        },
      ],
    })
  })

  it('should include script module when hasScripts is true', () => {
    const config = { ...baseConfig, hasScripts: true }
    const manifest = generateBpManifest(config) as Record<string, unknown>
    expect(manifest.modules).toEqual([
      {
        type: 'script',
        language: 'javascript',
        uuid: config.uuids.module,
        entry: 'scripts/main.js',
        version: [1, 0, 0],
      },
    ])
    expect(manifest.dependencies).toContainEqual({
      module_name: '@minecraft/server',
      version: '^1.11.0',
    })
  })

  it('should include resource pack dependency when resourcePack UUID exists', () => {
    const config = { ...baseConfig, uuids: baseConfig.uuids }
    const manifest = generateBpManifest(config) as Record<string, unknown>
    expect(manifest.dependencies).toContainEqual({
      uuid: config.uuids.resourcePack,
      version: [1, 0, 0],
    })
  })

  it('should include author in metadata when provided', () => {
    const config = { ...baseConfig, author: 'TestAuthor' }
    const manifest = generateBpManifest(config) as Record<string, unknown>
    expect(manifest.metadata).toEqual({ authors: ['TestAuthor'] })
  })

  it('should omit metadata when no author', () => {
    const manifest = generateBpManifest(baseConfig)
    expect(manifest).not.toHaveProperty('metadata')
  })

  it('should parse version correctly', () => {
    const config = { ...baseConfig, version: '2.3.4' }
    const manifest = generateBpManifest(config) as Record<string, unknown>
    expect((manifest.header as Record<string, unknown>).version).toEqual([2, 3, 4])
  })
})

describe('generateRpManifest', () => {
  it('should generate a resource pack manifest', () => {
    const manifest = generateRpManifest(baseConfig) as Record<string, unknown>
    expect(manifest).toMatchObject({
      format_version: 2,
      header: {
        description: 'pack.description',
        name: 'pack.name',
        uuid: baseConfig.uuids.resourcePack,
        version: [1, 0, 0],
        min_engine_version: [1, 21, 0],
      },
      modules: [
        {
          type: 'resources',
          version: [1, 0, 0],
          uuid: baseConfig.uuids.module,
        },
      ],
    })
  })

  it('should include behavior pack dependency when behaviorPack UUID exists', () => {
    const manifest = generateRpManifest(baseConfig) as Record<string, unknown>
    expect(manifest.dependencies).toContainEqual({
      uuid: baseConfig.uuids.behaviorPack,
      version: [1, 0, 0],
    })
  })

  it('should throw when resourcePack UUID is missing', () => {
    const config = {
      ...baseConfig,
      uuids: { behaviorPack: 'aaa', module: 'bbb' },
    }
    expect(() => generateRpManifest(config)).toThrow('Resource pack UUID not configured')
  })
})
