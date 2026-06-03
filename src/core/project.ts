import type { QuickStartConfig } from '../types.js'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const CONFIG_FILE = 'mcbe.config.json'

export function getProjectDir(): string | null {
  let dir = process.cwd()
  while (true) {
    if (existsSync(join(dir, CONFIG_FILE))) { return dir }
    const parent = join(dir, '..')
    if (parent === dir) { return null }
    dir = parent
  }
}

export function getProjectConfig(projectDir?: string): QuickStartConfig {
  const dir = projectDir || getProjectDir()
  if (!dir) { throw new Error('No mcbe.config.json found. Are you in a project directory?') }

  const configPath = join(dir, CONFIG_FILE)
  if (!existsSync(configPath)) { throw new Error(`Config file not found: ${configPath}`) }

  return JSON.parse(readFileSync(configPath, 'utf-8'))
}

export function writeProjectConfig(config: QuickStartConfig, projectDir?: string): void {
  const dir = projectDir || getProjectDir()
  if (!dir) { throw new Error('No project directory found') }

  const configPath = join(dir, CONFIG_FILE)
  writeFileSync(configPath, JSON.stringify(config, null, 2))
}

export function createProjectConfig(
  projectDir: string,
  config: QuickStartConfig,
): void {
  const configPath = join(projectDir, CONFIG_FILE)
  writeFileSync(configPath, JSON.stringify(config, null, 2))
}

export function updateProjectConfig(
  projectDir: string,
  partial: Partial<QuickStartConfig>,
): QuickStartConfig {
  const config = getProjectConfig(projectDir)
  const updated = { ...config, ...partial }
  writeProjectConfig(updated, projectDir)
  return updated
}

export function parseVersion(version: string): [number, number, number] {
  const parts = version.split(/[.-]/)
  return [
    parts[0] !== undefined ? Number(parts[0]) : 1,
    parts[1] !== undefined ? Number(parts[1]) : 0,
    parts[2] !== undefined ? Number(parts[2]) : 0,
  ]
}
