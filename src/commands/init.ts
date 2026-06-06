import type { PackageManager, PackType, QuickStartConfig, ScriptLanguage, TemplateName } from '../types.js'
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as p from '@clack/prompts'
import pc from 'picocolors'
import { writeManifest } from '../core/manifest.js'
import { createProjectConfig, getProjectConfig, getProjectDir, updateProjectConfig } from '../core/project.js'
import { generateUUIDs } from '../utils/uuid.js'
import { validateProjectName } from '../utils/validation.js'

const CLI_ROOT = fileURLToPath(new URL('../..', import.meta.url))
const TEMPLATES_DIR = join(CLI_ROOT, 'templates')
const CLI_VERSION = JSON.parse(readFileSync(join(CLI_ROOT, 'package.json'), 'utf-8')).version

interface InitOptions {
  template?: string
  yes?: boolean
  install?: boolean
}

function detectPackageManager(): PackageManager {
  const cwd = process.cwd()
  if (existsSync(join(cwd, 'pnpm-lock.yaml'))) { return 'pnpm' }
  if (existsSync(join(cwd, 'yarn.lock'))) { return 'yarn' }
  if (existsSync(join(cwd, 'package-lock.json'))) { return 'npm' }
  try {
    execSync('pnpm --version', { stdio: 'ignore' })
    return 'pnpm'
  }
  catch {
    try {
      execSync('yarn --version', { stdio: 'ignore' })
      return 'yarn'
    }
    catch {
      return 'npm'
    }
  }
}

function copyTemplateScript(templateDir: string, destDir: string, language: ScriptLanguage) {
  const srcPath = join(templateDir, 'src', 'main.ts')
  if (!existsSync(srcPath)) { return }

  const ext = language === 'javascript' ? '.js' : '.ts'
  const destPath = join(destDir, 'scripts', `main${ext}`)
  mkdirSync(dirname(destPath), { recursive: true })
  copyFileSync(srcPath, destPath)
}

function writeLang(dir: string, name: string, description: string) {
  const textsDir = join(dir, 'texts')
  mkdirSync(textsDir, { recursive: true })
  writeFileSync(join(textsDir, 'en_US.lang'), `pack.name=${name}\npack.description=${description || 'A Minecraft BE addon'}\n`)
  writeFileSync(join(textsDir, 'languages.json'), JSON.stringify(['en_US'], null, 2))
}

async function createNewProject(name: string, options: InitOptions) {
  const projectDir = join(process.cwd(), name)

  let template = options.template as TemplateName | undefined
  let author = ''
  let description = ''
  let packs: PackType[] = ['behavior_pack', 'resource_pack']
  let hasScripts = true
  let language: ScriptLanguage = 'typescript'
  let mcVersion = '1.11.0'
  let pm: PackageManager = detectPackageManager()

  if (!options.yes) {
    p.intro(pc.bold(pc.blue('Create a new Minecraft BE addon')))

    packs = await p.multiselect({
      message: 'Which packs do you need?',
      required: true,
      options: [
        { value: 'behavior_pack', label: 'Behavior Pack', hint: 'Addon logic and scripts' },
        { value: 'resource_pack', label: 'Resource Pack', hint: 'Textures, sounds, models' },
      ],
    }) as PackType[]

    if (packs.includes('behavior_pack')) {
      hasScripts = await p.confirm({
        message: 'Use Minecraft Script API?',
        initialValue: true,
      }) as boolean

      if (hasScripts) {
        language = await p.select({
          message: 'Script language:',
          options: [
            { value: 'typescript', label: 'TypeScript', hint: 'Requires compilation' },
            { value: 'javascript', label: 'JavaScript', hint: 'No compilation needed' },
          ],
        }) as ScriptLanguage

        template = await p.select({
          message: 'Select a template:',
          initialValue: template || 'default',
          options: [
            { value: 'default', label: 'Default', hint: 'Simple event listener starter' },
            { value: 'explosive-bow', label: 'Explosive Bow', hint: 'Bow that spawns exploding crystals' },
          ],
        }) as TemplateName

        mcVersion = await p.text({
          message: '@minecraft/server version:',
          placeholder: '1.11.0',
          initialValue: '1.11.0',
        }) as string
      }
    }

    pm = await p.select({
      message: 'Package manager:',
      initialValue: pm,
      options: [
        { value: 'npm', label: 'npm' },
        { value: 'pnpm', label: 'pnpm' },
        { value: 'yarn', label: 'yarn' },
      ],
    }) as PackageManager

    author = await p.text({
      message: 'Author:',
      placeholder: 'Your name',
    }) as string

    description = await p.text({
      message: 'Description:',
      placeholder: 'My Minecraft BE addon',
    }) as string

    p.outro('Creating project...')
  }
  else {
    template = template || 'explosive-bow'
  }

  template = template || 'default'

  const uuids = generateUUIDs()
  if (!packs.includes('resource_pack')) {
    uuids.resourcePack = undefined
  }

  const config: QuickStartConfig = {
    name,
    version: '0.1.0',
    author: author || undefined,
    description: description || undefined,
    template,
    uuids,
    hasScripts: packs.includes('behavior_pack') ? hasScripts : undefined,
    language: packs.includes('behavior_pack') && hasScripts ? language : undefined,
    minecraftServerVersion: hasScripts ? mcVersion : undefined,
    minEngineVersion: [1, 21, 0],
  }

  if (packs.includes('behavior_pack')) {
    const bpDir = join(projectDir, 'src', 'behavior_pack')
    mkdirSync(bpDir, { recursive: true })
    writeManifest(bpDir, 'behavior_pack', config)
    writeLang(bpDir, name, description)

    if (hasScripts) {
      const templateDir = join(TEMPLATES_DIR, template)
      if (existsSync(templateDir)) {
        copyTemplateScript(templateDir, bpDir, language)
      }

      if (language === 'typescript') {
        const tsconfig = {
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'bundler',
            strict: true,
            noEmit: true,
            isolatedModules: true,
            skipLibCheck: true,
          },
          include: ['src/behavior_pack/scripts'],
        }
        writeFileSync(join(projectDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2))
      }
    }
  }

  if (packs.includes('resource_pack')) {
    const rpDir = join(projectDir, 'src', 'resource_pack')
    mkdirSync(rpDir, { recursive: true })
    writeManifest(rpDir, 'resource_pack', config)
    writeLang(rpDir, name, description)
  }

  const pkg = {
    name,
    type: 'module',
    version: '0.1.0',
    private: true,
    license: 'MIT',
    scripts: {
      dev: 'mcbe-create dev',
      devsync: 'mcbe-create dev --sync',
      build: 'mcbe-create build',
    },
    devDependencies: {
      '@mcbe-mods/create': `^${CLI_VERSION}`,
    },
    dependencies: hasScripts ? { '@minecraft/server': mcVersion } : {},
  }
  writeFileSync(join(projectDir, 'package.json'), JSON.stringify(pkg, null, 2))

  writeFileSync(join(projectDir, '.gitignore'), ['node_modules', 'dist', 'pack', '*.local'].join('\n'))

  createProjectConfig(projectDir, config)

  if (options.install !== false) {
    console.log(`  Installing dependencies with ${pc.cyan(pm)}...`)
    const installCmd = pm === 'npm' ? 'npm install' : `${pm} install`
    try {
      execSync(installCmd, { cwd: projectDir, stdio: 'inherit' })
    }
    catch {
      console.error(pc.yellow(`  ⚠ Install failed. Run manually: ${installCmd}`))
    }
  }

  console.log()
  console.log(pc.green(`  ✓ Project "${name}" created!`))
  console.log()
  console.log(`  ${pc.dim('Next steps:')}`)
  console.log(`    ${pc.cyan(`cd ${name}`)}`)
  console.log(`    ${pc.cyan('mcbe-create dev')}         ${pc.dim('Start development mode')}`)
  console.log(`    ${pc.cyan('mcbe-create dev --sync')}  ${pc.dim('Start dev with auto MC sync')}`)
  console.log(`    ${pc.cyan('mcbe-create build')}       ${pc.dim('Build and package')}`)
  console.log()
}

async function reinitProject(projectDir: string) {
  const config = getProjectConfig(projectDir)
  const hasBp = existsSync(join(projectDir, 'src', 'behavior_pack'))
  const hasRp = existsSync(join(projectDir, 'src', 'resource_pack'))

  console.log()
  console.log(pc.dim(`  Existing project: ${config.name}`))
  console.log(`    ${pc.dim('Behavior Pack:')}  ${hasBp ? '✓' : '✗'}`)
  console.log(`    ${pc.dim('Resource Pack:')}  ${hasRp ? '✓' : '✗'}`)
  if (config.hasScripts) {
    console.log(`    ${pc.dim('Script API:')}    ✓ (${config.language})`)
  }
  console.log()

  const additions: string[] = []

  if (!hasBp) {
    const addBp = await p.confirm({
      message: 'Add Behavior Pack?',
      initialValue: true,
    })
    if (addBp) {
      additions.push('behavior_pack')

      const addScripts = await p.confirm({
        message: 'Use Minecraft Script API?',
        initialValue: true,
      })
      if (addScripts) {
        const lang = await p.select({
          message: 'Script language:',
          options: [
            { value: 'typescript', label: 'TypeScript' },
            { value: 'javascript', label: 'JavaScript' },
          ],
        }) as ScriptLanguage

        const uuids = generateUUIDs()
        const updated = updateProjectConfig(projectDir, {
          uuids: { ...config.uuids, behaviorPack: uuids.behaviorPack, module: uuids.module },
          hasScripts: true,
          language: lang,
        })

        const bpDir = join(projectDir, 'src', 'behavior_pack')
        mkdirSync(bpDir, { recursive: true })
        writeManifest(bpDir, 'behavior_pack', updated)
        writeLang(bpDir, config.name, config.description || '')

        const templateDir = join(TEMPLATES_DIR, config.template)
        if (existsSync(templateDir)) {
          copyTemplateScript(templateDir, bpDir, lang)
        }

        if (lang === 'typescript') {
          const tsconfig = {
            compilerOptions: {
              target: 'ES2022',
              module: 'ESNext',
              moduleResolution: 'bundler',
              strict: true,
              noEmit: true,
              isolatedModules: true,
              skipLibCheck: true,
            },
            include: ['src/behavior_pack/scripts'],
          }
          writeFileSync(join(projectDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2))
        }
      }
      else {
        updateProjectConfig(projectDir, {
          hasScripts: false,
          language: undefined,
        })
      }
    }
  }

  if (!hasRp && config.uuids.resourcePack) {
    const addRp = await p.confirm({
      message: 'Add Resource Pack?',
      initialValue: true,
    })
    if (addRp) {
      additions.push('resource_pack')

      if (!hasBp) {
        const uuids = generateUUIDs()
        updateProjectConfig(projectDir, {
          uuids: { ...config.uuids, resourcePack: uuids.resourcePack },
        })
      }

      const rpDir = join(projectDir, 'src', 'resource_pack')
      mkdirSync(rpDir, { recursive: true })
      writeManifest(rpDir, 'resource_pack', getProjectConfig(projectDir))
      writeLang(rpDir, config.name, config.description || '')
    }
  }

  if (additions.length > 0) {
    console.log(pc.green(`  ✓ Added: ${additions.join(', ')}`))
  }
  else {
    console.log('  No changes made.')
  }
}

export async function initCommand(name: string | undefined, options: InitOptions) {
  const existingProjectDir = getProjectDir()

  if (existingProjectDir) {
    await reinitProject(existingProjectDir)
    return
  }

  if (!name) {
    name = await p.text({
      message: 'Project name:',
      placeholder: 'my-addon',
      validate: input => validateProjectName(input) || undefined,
    }) as string
  }

  const nameError = validateProjectName(name)
  if (nameError) {
    console.error(pc.red(`  ✗ ${nameError}`))
    process.exit(1)
  }

  const projectDir = join(process.cwd(), name)
  if (existsSync(projectDir)) {
    console.error(pc.red(`  ✗ Directory "${name}" already exists`))
    process.exit(1)
  }

  await createNewProject(name, options)
}
