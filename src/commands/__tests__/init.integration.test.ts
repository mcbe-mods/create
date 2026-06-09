import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import { describe, expect, it } from 'vitest'
import { initCommand } from '../init.js'

function readJson(file: string) {
  return JSON.parse(readFileSync(file, 'utf-8'))
}

function createTempDir() {
  return mkdtempSync(join(tmpdir(), 'mcbe-test-'))
}

describe('init command integration', () => {
  it('should create a project with default packs and scripts', async () => {
    const tmp = createTempDir()
    const cwd = process.cwd()
    process.chdir(tmp)
    try {
      await initCommand('test-addon', { yes: true, install: false })

      expect(existsSync(join(tmp, 'test-addon', 'package.json'))).toBe(true)
      expect(existsSync(join(tmp, 'test-addon', 'tsconfig.json'))).toBe(true)
      expect(existsSync(join(tmp, 'test-addon', 'src', 'behavior_pack', 'manifest.json'))).toBe(true)
      expect(existsSync(join(tmp, 'test-addon', 'src', 'resource_pack', 'manifest.json'))).toBe(true)

      const pkg = readJson(join(tmp, 'test-addon', 'package.json'))
      expect(pkg.name).toBe('test-addon')
      expect(pkg.mcbe.uuids.behaviorPack).toBeTruthy()
      expect(pkg.mcbe.uuids.resourcePack).toBeTruthy()
      expect(pkg.mcbe.uuids.module).toBeTruthy()
    }
    finally {
      process.chdir(cwd)
      rmSync(tmp, { recursive: true })
    }
  })

  it('should respect --no-scripts and -k bp', async () => {
    const tmp = createTempDir()
    const cwd = process.cwd()
    process.chdir(tmp)
    try {
      await initCommand('no-scripts-test', { yes: true, install: false, scripts: false, packs: 'bp' })

      expect(existsSync(join(tmp, 'no-scripts-test', 'tsconfig.json'))).toBe(false)
      expect(existsSync(join(tmp, 'no-scripts-test', 'src', 'behavior_pack', 'manifest.json'))).toBe(true)
      expect(existsSync(join(tmp, 'no-scripts-test', 'src', 'resource_pack', 'manifest.json'))).toBe(false)

      const pkg = readJson(join(tmp, 'no-scripts-test', 'package.json'))
      expect(pkg.mcbe.uuids.behaviorPack).toBeTruthy()
      expect(pkg.mcbe.uuids.module).toBeFalsy()
      expect(pkg.mcbe.uuids.resourcePack).toBeFalsy()
      expect(pkg.dependencies).toEqual({})
    }
    finally {
      process.chdir(cwd)
      rmSync(tmp, { recursive: true })
    }
  })

  it('should respect -l js', async () => {
    const tmp = createTempDir()
    const cwd = process.cwd()
    process.chdir(tmp)
    try {
      await initCommand('js-test', { yes: true, install: false, lang: 'javascript' })

      expect(existsSync(join(tmp, 'js-test', 'tsconfig.json'))).toBe(false)
      expect(existsSync(join(tmp, 'js-test', 'src', 'behavior_pack', 'scripts', 'main.js'))).toBe(true)
    }
    finally {
      process.chdir(cwd)
      rmSync(tmp, { recursive: true })
    }
  })

  it('should respect -a and -d', async () => {
    const tmp = createTempDir()
    const cwd = process.cwd()
    process.chdir(tmp)
    try {
      await initCommand('author-test', { yes: true, install: false, author: 'Test Author', desc: 'Test Description' })

      const pkg = readJson(join(tmp, 'author-test', 'package.json'))
      expect(pkg.author).toBe('Test Author')
      expect(pkg.description).toBe('Test Description')
    }
    finally {
      process.chdir(cwd)
      rmSync(tmp, { recursive: true })
    }
  })

  it('should respect -v for mc-version', async () => {
    const tmp = createTempDir()
    const cwd = process.cwd()
    process.chdir(tmp)
    try {
      await initCommand('version-test', { yes: true, install: false, mcVersion: '1.20.0' })

      const pkg = readJson(join(tmp, 'version-test', 'package.json'))
      expect(pkg.dependencies['@minecraft/server']).toBe('1.20.0')
    }
    finally {
      process.chdir(cwd)
      rmSync(tmp, { recursive: true })
    }
  })

  it('should respect -p pm override', async () => {
    const tmp = createTempDir()
    const cwd = process.cwd()
    process.chdir(tmp)
    try {
      await initCommand('pm-test', { yes: true, install: false, pm: 'npm' })

      const pkg = readJson(join(tmp, 'pm-test', 'package.json'))
      expect(existsSync(join(tmp, 'pm-test', 'pnpm-lock.yaml'))).toBe(false)
      expect(pkg.name).toBe('pm-test')
    }
    finally {
      process.chdir(cwd)
      rmSync(tmp, { recursive: true })
    }
  })

  it('should support full non-interactive creation with all flags', async () => {
    const tmp = createTempDir()
    const cwd = process.cwd()
    process.chdir(tmp)
    try {
      await initCommand('full-flags', {
        yes: true,
        install: false,
        author: 'Dev',
        desc: 'Full test',
        lang: 'typescript',
        mcVersion: '1.21.0',
        pm: 'pnpm',
        packs: 'bp,rp',
        template: 'default',
      })
      expect(existsSync(join(tmp, 'full-flags', 'src', 'behavior_pack', 'manifest.json'))).toBe(true)
      expect(existsSync(join(tmp, 'full-flags', 'src', 'resource_pack', 'manifest.json'))).toBe(true)

      const pkg = readJson(join(tmp, 'full-flags', 'package.json'))
      expect(pkg.author).toBe('Dev')
      expect(pkg.description).toBe('Full test')
      expect(pkg.dependencies['@minecraft/server']).toBe('1.21.0')
    }
    finally {
      process.chdir(cwd)
      rmSync(tmp, { recursive: true })
    }
  })
})
