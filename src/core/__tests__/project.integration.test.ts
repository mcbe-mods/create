import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getMcDependencyVersion, getProjectConfig, writeMcbeConfig } from '../project.js'

function createProject(fields?: Record<string, unknown>): string {
  const dir = mkdtempSync(join(tmpdir(), 'mcbe-test-'))
  const pkg: Record<string, unknown> = {
    name: 'test-addon',
    version: '1.2.3',
    author: 'Test Author',
    license: 'MIT',
    homepage: 'https://example.com',
    mcbe: {
      uuids: {
        behaviorPack: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
        module: 'ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj',
      },
      minEngineVersion: [1, 21, 80],
    },
    ...fields,
  }
  writeFileSync(join(dir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)
  return dir
}

function addBpManifest(dir: string, hasScriptModule: boolean, extraModules: unknown[] = []) {
  const bpDir = join(dir, 'src', 'behavior_pack')
  mkdirSync(bpDir, { recursive: true })
  const modules = extraModules.slice()
  if (hasScriptModule) {
    modules.unshift({
      type: 'script',
      language: 'javascript',
      uuid: 'script-uuid-0000-0000-000000000000',
      entry: 'scripts/main.js',
      version: [1, 0, 0],
    })
  }
  writeFileSync(join(bpDir, 'manifest.json'), `${JSON.stringify({ format_version: 2, modules }, null, 2)}\n`)
}

describe('getProjectConfig', () => {
  it('should read full config from a valid project', () => {
    const dir = createProject()
    try {
      const config = getProjectConfig(dir)
      expect(config.name).toBe('test-addon')
      expect(config.version).toBe('1.2.3')
      expect(config.author).toBe('Test Author')
      expect(config.license).toBe('MIT')
      expect(config.homepage).toBe('https://example.com')
      expect(config.uuids.behaviorPack).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
      expect(config.uuids.module).toBe('ffffffff-gggg-hhhh-iiii-jjjjjjjjjjjj')
      expect(config.minEngineVersion).toEqual([1, 21, 80])
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should handle missing optional fields', () => {
    const dir = createProject({ author: undefined, license: undefined, homepage: undefined })
    try {
      const config = getProjectConfig(dir)
      expect(config.name).toBe('test-addon')
      expect(config.author).toBeUndefined()
      expect(config.license).toBeUndefined()
      expect(config.homepage).toBeUndefined()
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should throw when mcbe field is missing', () => {
    const dir = createProject({ mcbe: undefined })
    try {
      expect(() => getProjectConfig(dir)).toThrow('"mcbe" field')
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should detect hasScripts=true when manifest has script module', () => {
    const dir = createProject()
    try {
      addBpManifest(dir, true)
      const config = getProjectConfig(dir)
      expect(config.hasScripts).toBe(true)
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should detect hasScripts=false when manifest has no script module', () => {
    const dir = createProject()
    try {
      addBpManifest(dir, false)
      const config = getProjectConfig(dir)
      expect(config.hasScripts).toBe(false)
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should detect hasScripts=false when no manifest exists', () => {
    const dir = createProject()
    try {
      const config = getProjectConfig(dir)
      expect(config.hasScripts).toBe(false)
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should infer typescript language when tsconfig.json exists', () => {
    const dir = createProject()
    try {
      addBpManifest(dir, true)
      writeFileSync(join(dir, 'tsconfig.json'), '{}')
      const config = getProjectConfig(dir)
      expect(config.language).toBe('typescript')
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should infer javascript language when no tsconfig.json exists', () => {
    const dir = createProject()
    try {
      addBpManifest(dir, true)
      const config = getProjectConfig(dir)
      expect(config.language).toBe('javascript')
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should return language=undefined when no script module', () => {
    const dir = createProject()
    try {
      const config = getProjectConfig(dir)
      expect(config.language).toBeUndefined()
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should handle empty uuids', () => {
    const dir = createProject({ mcbe: { uuids: {}, minEngineVersion: [1, 21, 0] } })
    try {
      const config = getProjectConfig(dir)
      expect(config.uuids).toEqual({})
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })
})

describe('getMcDependencyVersion', () => {
  it('should read version from dependencies', () => {
    const dir = createProject({ dependencies: { '@minecraft/server': '^1.18.0' } })
    try {
      const version = getMcDependencyVersion(dir, '@minecraft/server')
      expect(version).toBe('1.18.0')
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should read version from devDependencies', () => {
    const dir = createProject({ devDependencies: { '@minecraft/server': '~1.15.0' } })
    try {
      const version = getMcDependencyVersion(dir, '@minecraft/server')
      expect(version).toBe('1.15.0')
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should prefer dependencies over devDependencies', () => {
    const dir = createProject({
      dependencies: { '@minecraft/server': '1.18.0' },
      devDependencies: { '@minecraft/server': '1.15.0' },
    })
    try {
      const version = getMcDependencyVersion(dir, '@minecraft/server')
      expect(version).toBe('1.18.0')
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should strip ^ ~ >= < range prefixes', () => {
    const dir = createProject({ dependencies: { '@minecraft/server-ui': '>=1.3.0' } })
    try {
      const version = getMcDependencyVersion(dir, '@minecraft/server-ui')
      expect(version).toBe('1.3.0')
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should return undefined for non-existent package', () => {
    const dir = createProject()
    try {
      const version = getMcDependencyVersion(dir, '@minecraft/nonexistent')
      expect(version).toBeUndefined()
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should handle semver with spaces after prefix', () => {
    const dir = createProject({ dependencies: { '@minecraft/server': '^ 1.18.0' } })
    try {
      const version = getMcDependencyVersion(dir, '@minecraft/server')
      expect(version).toBe('1.18.0')
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })
})

describe('writeMcbeConfig', () => {
  it('should update mcbe field in package.json', () => {
    const dir = createProject()
    try {
      writeMcbeConfig(dir, { minEngineVersion: [1, 21, 0] })
      const config = getProjectConfig(dir)
      expect(config.minEngineVersion).toEqual([1, 21, 0])
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })

  it('should merge partial uuid updates', () => {
    const dir = createProject()
    try {
      writeMcbeConfig(dir, {
        uuids: { resourcePack: 'new-resource-uuid-000000000000' },
      })
      const config = getProjectConfig(dir)
      expect(config.uuids.resourcePack).toBe('new-resource-uuid-000000000000')
      expect(config.uuids.behaviorPack).toBe('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')
    }
    finally {
      rmSync(dir, { recursive: true })
    }
  })
})
