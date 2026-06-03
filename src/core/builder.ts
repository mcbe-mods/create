import type { InlineConfig } from 'vite'
import type { BpManifest, BuildOptions } from '../types.js'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { build } from 'vite'

export function resolveEntry(projectDir: string): { entry: string, entryFileNames: string } | null {
  const manifestPath = join(projectDir, 'src', 'behavior_pack', 'manifest.json')
  if (!existsSync(manifestPath)) { return null }

  let manifest: BpManifest
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
  }
  catch { return null }

  const scriptModule = manifest.modules?.find(m => m.type === 'script')
  if (!scriptModule?.entry) { return null }

  const entry = join(projectDir, 'src', 'behavior_pack', scriptModule.entry.replace(/\.js$/, '.ts'))
  const entryFileNames = `behavior_pack/${scriptModule.entry}`

  return { entry, entryFileNames }
}

function readExternals(projectDir: string): string[] {
  const manifestPath = join(projectDir, 'src', 'behavior_pack', 'manifest.json')
  if (!existsSync(manifestPath)) { return [] }
  try {
    const manifest: BpManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
    return (manifest.dependencies || []).filter(d => d.module_name).map(d => d.module_name!)
  }
  catch { return [] }
}

export async function runBuild(options: BuildOptions): Promise<void> {
  const config: InlineConfig = {
    root: options.projectDir,
    mode: options.mode,
    logLevel: 'warn',
    build: {
      lib: {
        entry: options.entry,
        formats: ['es'],
      },
      outDir: options.outputDir,
      emptyOutDir: false,
      minify: options.mode === 'production',
      sourcemap: options.mode === 'development',
      rollupOptions: {
        external: readExternals(options.projectDir),
        output: {
          entryFileNames: options.entryFileNames,
        },
      },
    },
  }

  await build(config)
}

export async function runWatchBuild(options: BuildOptions): Promise<void> {
  const config: InlineConfig = {
    root: options.projectDir,
    mode: options.mode,
    logLevel: 'warn',
    build: {
      lib: {
        entry: options.entry,
        formats: ['es'],
      },
      outDir: options.outputDir,
      emptyOutDir: false,
      minify: false,
      sourcemap: true,
      rollupOptions: {
        external: readExternals(options.projectDir),
        output: {
          entryFileNames: options.entryFileNames,
        },
      },
      watch: {},
    },
  }

  await build(config)
}
