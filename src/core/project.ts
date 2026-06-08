import type { McbeConfig, QuickStartConfig, ScriptLanguage } from '../types.js'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'

const CONFIG_KEY = 'mcbe'

function getRootPkg(dir: string): Record<string, unknown> {
  const pkgPath = join(dir, 'package.json')
  if (!existsSync(pkgPath)) { throw new Error(`No package.json found in ${dir}`) }
  return JSON.parse(readFileSync(pkgPath, 'utf-8'))
}

export function getProjectDir(): string {
  const dir = process.cwd()
  const pkg = getRootPkg(dir)
  if (!pkg[CONFIG_KEY]) { throw new Error('Not in a project directory: package.json is missing "mcbe" field') }
  return dir
}

function inferHasScripts(dir: string): boolean {
  const manifestPath = join(dir, 'src', 'behavior_pack', 'manifest.json')
  if (!existsSync(manifestPath)) { return false }
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    return manifest.modules?.some((m: { type: string }) => m.type === 'script') ?? false
  }
  catch { return false }
}

function inferLanguage(dir: string): ScriptLanguage | undefined {
  if (!inferHasScripts(dir)) { return undefined }
  return existsSync(join(dir, 'tsconfig.json')) ? 'typescript' : 'javascript'
}

export function getProjectConfig(projectDir?: string): QuickStartConfig {
  const dir = projectDir || getProjectDir()
  const pkg = getRootPkg(dir)
  const mcbe = pkg[CONFIG_KEY] as McbeConfig | undefined
  if (!mcbe) { throw new Error('package.json is missing "mcbe" field') }

  return {
    name: pkg.name as string || '',
    version: pkg.version as string || '0.1.0',
    author: pkg.author as string | undefined,
    description: pkg.description as string | undefined,
    license: pkg.license as string | undefined,
    homepage: pkg.homepage as string | undefined,
    uuids: mcbe.uuids ?? {},
    hasScripts: inferHasScripts(dir),
    language: inferLanguage(dir),
    minEngineVersion: mcbe.minEngineVersion,
  }
}

export function writeMcbeConfig(projectDir: string, config: Partial<McbeConfig>): void {
  const pkgPath = join(projectDir, 'package.json')
  const pkg = getRootPkg(projectDir)
  const existing = (pkg[CONFIG_KEY] as Record<string, unknown>) || {}
  const merged: Record<string, unknown> = { ...existing }
  if (config.uuids) {
    merged.uuids = { ...(existing.uuids as Record<string, unknown> || {}), ...config.uuids }
  }
  if (config.minEngineVersion) {
    merged.minEngineVersion = config.minEngineVersion
  }
  pkg[CONFIG_KEY] = merged
  writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`)
}

export function parseVersion(version: string): [number, number, number] {
  const parts = version.split(/[.-]/)
  return [
    parts[0] !== undefined ? Number(parts[0]) : 1,
    parts[1] !== undefined ? Number(parts[1]) : 0,
    parts[2] !== undefined ? Number(parts[2]) : 0,
  ]
}

export function getMcDependencyVersion(projectDir: string, moduleName: string): string | undefined {
  const pkg = getRootPkg(projectDir)
  const allDeps = { ...(pkg.devDependencies as Record<string, string> || {}), ...(pkg.dependencies as Record<string, string> || {}) }
  const version = allDeps[moduleName]
  if (!version) { return undefined }
  return version.replace(/^[~^>=<]+\s*/, '')
}
