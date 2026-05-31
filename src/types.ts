export interface UUIDs {
  behaviorPack: string
  resourcePack?: string
  module: string
}

export interface QuickStartConfig {
  name: string
  version: string
  author?: string
  description?: string
  template: string
  uuids: UUIDs
  hasScripts?: boolean
  language?: ScriptLanguage
  minEngineVersion: [number, number, number]
  minecraft?: {
    developmentPath?: string
  }
}

export type ScriptLanguage = 'typescript' | 'javascript'
export type TemplateName = 'default' | 'explosive-bow'
export type PackType = 'behavior_pack' | 'resource_pack'

export type PackageManager = 'pnpm' | 'npm' | 'yarn'

export interface McPaths {
  developmentBehaviorPacks: string
  developmentResourcePacks: string
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
