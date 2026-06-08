import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { patchManifest } from '../manifest.js'

function createProject(): string {
  const dir = mkdtempSync(join(tmpdir(), 'mcbe-test-'))
  const pkg = {
    name: 'test-addon',
    version: '1.0.0',
    author: 'Test Author',
    license: 'MIT',
    homepage: 'https://example.com',
    dependencies: {
      '@minecraft/server': '^1.18.0',
      '@minecraft/server-ui': '~1.3.0',
    },
    mcbe: {
      uuids: {
        behaviorPack: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        resourcePack: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
        module: 'cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa',
      },
      minEngineVersion: [1, 21, 80],
    },
  }
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)
  return dir
}

function addManifest(dir: string, manifest: any) {
  const bpDir = join(dir, 'src', 'behavior_pack')
  mkdirSync(bpDir, { recursive: true })
  writeFileSync(join(bpDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`)
}

function readManifest(dir: string): any {
  return JSON.parse(readFileSync(join(dir, 'src', 'behavior_pack', 'manifest.json'), 'utf-8'))
}

describe('patchManifest', () => {
  it('should update header uuid, version and min_engine_version', () => {
    const dir = createProject()
    try {
      addManifest(dir, {
        format_version: 2,
        header: {
          description: 'pack.description',
          name: 'pack.name',
          uuid: 'old-uuid',
          version: [0, 0, 1],
          min_engine_version: [1, 20, 0],
        },
        modules: [],
        dependencies: [],
      })

      patchManifest(dir)
      const result = readManifest(dir)
      const header = result.header

      expect(header.uuid).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
      expect(header.version).toEqual([1, 0, 0])
      expect(header.min_engine_version).toEqual([1, 21, 80])
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should update script module uuid and version', () => {
    const dir = createProject()
    try {
      addManifest(dir, {
        format_version: 2,
        header: {
          description: 'pack.description',
          name: 'pack.name',
          uuid: 'old-uuid',
          version: [0, 0, 1],
          min_engine_version: [1, 20, 0],
        },
        modules: [
          {
            type: 'script',
            language: 'javascript',
            uuid: 'old-module-uuid',
            entry: 'scripts/main.js',
            version: [0, 0, 1],
          },
        ],
        dependencies: [],
      })

      patchManifest(dir)
      const result = readManifest(dir)
      const modules = result.modules

      expect(modules[0].uuid).toBe('cccccccc-dddd-eeee-ffff-aaaaaaaaaaaa')
      expect(modules[0].version).toEqual([1, 0, 0])
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should update @minecraft/* dependency versions from package.json', () => {
    const dir = createProject()
    try {
      addManifest(dir, {
        format_version: 2,
        header: {
          description: 'pack.description',
          name: 'pack.name',
          uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          version: [0, 0, 1],
          min_engine_version: [1, 20, 0],
        },
        modules: [],
        dependencies: [
          { module_name: '@minecraft/server', version: '0.0.0' },
          { module_name: '@minecraft/server-ui', version: '0.0.0' },
        ],
      })

      patchManifest(dir)
      const result = readManifest(dir)
      const deps = result.dependencies as Array<Record<string, unknown>>

      expect(deps).toContainEqual({ module_name: '@minecraft/server', version: '1.18.0' })
      expect(deps).toContainEqual({ module_name: '@minecraft/server-ui', version: '1.3.0' })
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should update metadata from package.json', () => {
    const dir = createProject()
    try {
      addManifest(dir, {
        format_version: 2,
        header: {
          description: 'pack.description',
          name: 'pack.name',
          uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          version: [0, 0, 1],
          min_engine_version: [1, 20, 0],
        },
        modules: [],
        dependencies: [],
      })

      patchManifest(dir)
      const result = readManifest(dir)

      expect(result.metadata).toEqual({
        authors: ['Test Author'],
        license: 'MIT',
        url: 'https://example.com',
      })
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should preserve user-added fields (product_type, extra modules, extra dependencies)', () => {
    const dir = createProject()
    try {
      addManifest(dir, {
        format_version: 2,
        header: {
          description: 'pack.description',
          name: 'pack.name',
          uuid: 'old-uuid',
          version: [0, 0, 1],
          min_engine_version: [1, 20, 0],
        },
        modules: [
          {
            type: 'script',
            language: 'javascript',
            uuid: 'old-module-uuid',
            entry: 'scripts/main.js',
            version: [0, 0, 1],
          },
          {
            type: 'custom-type',
            uuid: 'custom-module-uuid',
            version: [9, 9, 9],
          },
        ],
        dependencies: [
          { module_name: '@minecraft/server', version: '0.0.0' },
          { uuid: 'custom-dep-uuid', version: [9, 9, 9] },
        ],
        product_type: 'addon',
        customRootField: 'should survive',
      })

      patchManifest(dir)
      const result = readManifest(dir)

      expect(result.product_type).toBe('addon')
      expect(result.customRootField).toBe('should survive')

      const modules = result.modules
      const extraModule = modules.find((m: any) => m.type === 'custom-type')
      expect(extraModule).toBeDefined()
      expect(extraModule!.uuid).toBe('custom-module-uuid')

      const deps = result.dependencies
      expect(deps).toContainEqual({ uuid: 'custom-dep-uuid', version: [9, 9, 9] })
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should not crash when no manifest exists', () => {
    const dir = createProject()
    try {
      expect(() => patchManifest(dir)).not.toThrow()
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should add metadata if manifest has none', () => {
    const dir = createProject()
    try {
      addManifest(dir, {
        format_version: 2,
        header: {
          description: 'pack.description',
          name: 'pack.name',
          uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          version: [0, 0, 1],
          min_engine_version: [1, 20, 0],
        },
        modules: [],
        dependencies: [],
      })

      patchManifest(dir)
      const result = readManifest(dir)

      expect(result.metadata).toBeDefined()
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should update resource pack uuid when resourcePack exists', () => {
    const dir = createProject()
    try {
      const rpDir = join(dir, 'src', 'resource_pack')
      mkdirSync(rpDir, { recursive: true })
      writeFileSync(join(rpDir, 'manifest.json'), `${JSON.stringify({
        format_version: 2,
        header: {
          description: 'pack.description',
          name: 'pack.name',
          uuid: 'old-rp-uuid',
          version: [0, 0, 1],
          min_engine_version: [1, 20, 0],
        },
        modules: [],
        dependencies: [],
      }, null, 2)}\n`)

      patchManifest(dir)
      const rpManifest = JSON.parse(readFileSync(join(rpDir, 'manifest.json'), 'utf-8'))
      expect(rpManifest.header.uuid).toBe('bbbbbbbb-cccc-dddd-eeee-ffffffffffff')
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should update cross-pack uuid dependency version', () => {
    const dir = createProject()
    try {
      addManifest(dir, {
        format_version: 2,
        header: {
          description: 'pack.description',
          name: 'pack.name',
          uuid: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
          version: [0, 0, 1],
          min_engine_version: [1, 20, 0],
        },
        modules: [],
        dependencies: [
          { uuid: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff', version: [9, 9, 9] },
        ],
      })

      patchManifest(dir)
      const result = readManifest(dir)

      expect(result.dependencies).toContainEqual({
        uuid: 'bbbbbbbb-cccc-dddd-eeee-ffffffffffff',
        version: [1, 0, 0],
      })
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })
})
