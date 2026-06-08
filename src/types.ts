export interface UUIDs {
  behaviorPack: string
  resourcePack?: string
  module: string
}

// Config stored in package.json.mcbe
export interface McbeConfig {
  uuids?: Partial<UUIDs>
  minEngineVersion: [number, number, number]
}

// Full project config assembled at runtime from multiple sources
export interface QuickStartConfig {
  name: string
  version: string
  author?: string
  description?: string
  license?: string
  homepage?: string
  uuids: Partial<UUIDs>
  hasScripts: boolean
  language?: ScriptLanguage
  minEngineVersion: [number, number, number]
}

export type ScriptLanguage = 'typescript' | 'javascript'
export type TemplateName = 'default' | 'explosive-bow'
export type PackType = 'behavior_pack' | 'resource_pack'

export type PackageManager = 'pnpm' | 'npm' | 'yarn'

export interface McPaths {
  developmentBehaviorPacks: string
  developmentResourcePacks: string
}

export interface ManifestDependency {
  module_name?: string
  uuid?: string
  version: string | number[]
}

export interface ManifestModule {
  type: string
  entry?: string
}

export interface BpManifest {
  modules?: ManifestModule[]
  dependencies?: ManifestDependency[]
}

export interface BuildOptions {
  entry: string
  projectDir: string
  outputDir: string
  entryFileNames: string
  mode: 'development' | 'production'
  watch?: boolean
}

export interface SyncOptions {
  src: string
  dest: string
  onFileChange?: (path: string) => void
}
