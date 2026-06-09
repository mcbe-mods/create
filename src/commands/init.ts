import type { McbeConfig, PackageManager, PackType, ScriptLanguage, TemplateName } from '../types.js'
import { execSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'
import * as p from '@clack/prompts'
import { isCancel } from '@clack/prompts'
import pc from 'picocolors'
import { writeManifest } from '../core/manifest.js'
import { getProjectConfig, getProjectDir, writeMcbeConfig } from '../core/project.js'
import { generateUUIDs } from '../utils/uuid.js'
import { validateProjectName } from '../utils/validation.js'

const CLI_ROOT = fileURLToPath(new URL('../..', import.meta.url))
const TEMPLATES_DIR = join(CLI_ROOT, 'templates')
const CLI_VERSION = JSON.parse(readFileSync(join(CLI_ROOT, 'package.json'), 'utf-8')).version

interface InitOptions {
  template?: string
  yes?: boolean
  install?: boolean
  author?: string
  desc?: string
  lang?: string
  mcVersion?: string
  pm?: string
  packs?: string
  scripts?: boolean
  addBp?: boolean
  addRp?: boolean
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

function onCancel() {
  p.cancel('Cancelled')
  process.exit(0)
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

export function parsePacks(packs?: string): PackType[] {
  if (!packs) { return ['behavior_pack', 'resource_pack'] }
  return packs.split(',').map((s) => {
    const t = s.trim()
    if (t === 'bp') { return 'behavior_pack' }
    if (t === 'rp') { return 'resource_pack' }
    return t as PackType
  })
}

async function createNewProject(name: string, options: InitOptions) {
  const projectDir = join(process.cwd(), name)

  let packs: PackType[] = parsePacks(options.packs)
  let hasScripts = options.scripts !== false
  let language: ScriptLanguage = (options.lang as ScriptLanguage) || 'typescript'
  let template: TemplateName = (options.template as TemplateName) || 'default'
  let mcVersion = options.mcVersion || '1.18.0'
  let pm: PackageManager = (options.pm as PackageManager) || detectPackageManager()
  let author = options.author ?? ''
  let description = options.desc ?? ''

  const noScriptsArg = process.argv.includes('--no-scripts')

  if (!options.yes) {
    p.intro(pc.bold(pc.blue('Create a new Minecraft BE addon')))

    if (!options.packs) {
      packs = await p.multiselect({
        message: 'Which packs do you need?',
        required: true,
        options: [
          { value: 'behavior_pack', label: 'Behavior Pack', hint: 'Addon logic and scripts' },
          { value: 'resource_pack', label: 'Resource Pack', hint: 'Textures, sounds, models' },
        ],
      }) as PackType[]
      if (isCancel(packs)) { onCancel() }
    }

    if (packs.includes('behavior_pack')) {
      if (!noScriptsArg && options.scripts === undefined) {
        hasScripts = await p.confirm({
          message: 'Use Minecraft Script API?',
          initialValue: true,
        }) as boolean
        if (isCancel(hasScripts)) { onCancel() }
      }

      if (hasScripts) {
        if (!options.lang) {
          language = await p.select({
            message: 'Script language:',
            options: [
              { value: 'typescript', label: 'TypeScript', hint: 'Requires compilation' },
              { value: 'javascript', label: 'JavaScript', hint: 'No compilation needed' },
            ],
          }) as ScriptLanguage
          if (isCancel(language)) { onCancel() }
        }

        if (!options.template) {
          template = await p.select({
            message: 'Select a template:',
            initialValue: template,
            options: [
              { value: 'default', label: 'Default', hint: 'Simple event listener starter' },
              { value: 'explosive-bow', label: 'Explosive Bow', hint: 'Bow that spawns exploding crystals' },
            ],
          }) as TemplateName
          if (isCancel(template)) { onCancel() }
        }

        if (!options.mcVersion) {
          mcVersion = await p.text({
            message: '@minecraft/server version:',
            placeholder: mcVersion,
            initialValue: mcVersion,
          }) as string
          if (isCancel(mcVersion)) { onCancel() }
        }
      }
    }

    if (!options.pm) {
      pm = await p.select({
        message: 'Package manager:',
        initialValue: pm,
        options: [
          { value: 'npm', label: 'npm' },
          { value: 'pnpm', label: 'pnpm' },
          { value: 'yarn', label: 'yarn' },
        ],
      }) as PackageManager
      if (isCancel(pm)) { onCancel() }
    }

    if (!options.author) {
      author = await p.text({
        message: 'Author:',
        placeholder: 'Your name',
      }) as string
      if (isCancel(author)) { onCancel() }
    }

    if (!options.desc) {
      description = await p.text({
        message: 'Description:',
        placeholder: 'My Minecraft BE addon',
      }) as string
      if (isCancel(description)) { onCancel() }
    }

    p.outro('Creating project...')
  }

  const newUuids = generateUUIDs()
  const mcbeConfig: McbeConfig = {
    uuids: {
      behaviorPack: newUuids.behaviorPack,
      resourcePack: packs.includes('resource_pack') ? newUuids.resourcePack : undefined,
      module: (packs.includes('behavior_pack') && hasScripts) ? newUuids.module : undefined,
    },
    minEngineVersion: [1, 21, 0],
  }

  const pkg = {
    name,
    type: 'module',
    version: '0.1.0',
    private: true,
    license: 'MIT',
    author: author || undefined,
    description: description || undefined,
    scripts: {
      'dev': 'mcbe-create dev',
      'dev:sync': 'mcbe-create dev --sync',
      'build': 'mcbe-create build',
    },
    devDependencies: {
      '@mcbe-mods/create': `^${CLI_VERSION}`,
    },
    dependencies: (packs.includes('behavior_pack') && hasScripts) ? { '@minecraft/server': mcVersion } : {},
    mcbe: mcbeConfig,
  }
  mkdirSync(projectDir, { recursive: true })
  writeFileSync(join(projectDir, 'package.json'), `${JSON.stringify(pkg, null, 2)}\n`)

  writeFileSync(join(projectDir, '.gitignore'), ['node_modules', 'dist', 'pack', '*.local'].join('\n'))

  const config = getProjectConfig(projectDir)

  if (packs.includes('behavior_pack')) {
    const bpDir = join(projectDir, 'src', 'behavior_pack')
    mkdirSync(bpDir, { recursive: true })
    writeManifest(bpDir, 'behavior_pack', config, mcVersion)
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

  if (options.install !== false) {
    console.log(`  Installing dependencies with ${pc.cyan(pm)}...`)
    const installCmd = `${pm} install`
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

  const runCmd = pm === 'npm' ? 'npm run' : pm
  console.log(`  ${pc.dim('Next steps:')}`)
  console.log(`    ${pc.cyan(`cd ${name}`)}`)
  console.log(`    ${pc.cyan(`${runCmd} dev`)}             ${pc.dim('Start development mode')}`)
  console.log(`    ${pc.cyan(`${runCmd} dev:sync`)}        ${pc.dim('Start dev with auto MC sync')}`)
  console.log(`    ${pc.cyan(`${runCmd} build`)}           ${pc.dim('Build and package')}`)
  console.log()
}

async function reinitProject(projectDir: string, options: InitOptions) {
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
  const uuids = config.uuids
  const noScriptsArg = process.argv.includes('--no-scripts')

  if (!hasBp) {
    let addBp: boolean

    if (options.addBp !== undefined) {
      addBp = options.addBp
    }
    else if (options.yes) {
      addBp = false
    }
    else {
      const confirmAddBp = await p.confirm({
        message: 'Add Behavior Pack?',
        initialValue: true,
      })
      if (isCancel(confirmAddBp)) { onCancel() }
      addBp = confirmAddBp as boolean
    }

    if (addBp) {
      additions.push('behavior_pack')
      const newUuids = generateUUIDs()
      writeMcbeConfig(projectDir, {
        uuids: { behaviorPack: newUuids.behaviorPack, module: newUuids.module },
      })

      let addScripts: boolean

      if (options.scripts !== undefined || noScriptsArg) {
        addScripts = options.scripts !== false
      }
      else if (options.yes) {
        addScripts = true
      }
      else {
        const confirmScripts = await p.confirm({
          message: 'Use Minecraft Script API?',
          initialValue: true,
        })
        if (isCancel(confirmScripts)) { onCancel() }
        addScripts = confirmScripts as boolean
      }

      if (addScripts) {
        let lang: ScriptLanguage

        if (options.lang) {
          lang = options.lang as ScriptLanguage
        }
        else if (options.yes) {
          lang = 'typescript'
        }
        else {
          lang = await p.select({
            message: 'Script language:',
            options: [
              { value: 'typescript', label: 'TypeScript' },
              { value: 'javascript', label: 'JavaScript' },
            ],
          }) as ScriptLanguage
          if (isCancel(lang)) { onCancel() }
        }

        const bpDir = join(projectDir, 'src', 'behavior_pack')
        mkdirSync(bpDir, { recursive: true })
        writeManifest(bpDir, 'behavior_pack', getProjectConfig(projectDir))
        writeLang(bpDir, config.name, config.description || '')

        const templateDir = join(TEMPLATES_DIR, 'default')
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
    }
  }

  if (!hasRp) {
    let addRp: boolean

    if (options.addRp !== undefined) {
      addRp = options.addRp
    }
    else if (options.yes) {
      addRp = false
    }
    else {
      const confirmAddRp = await p.confirm({
        message: 'Add Resource Pack?',
        initialValue: true,
      })
      if (isCancel(confirmAddRp)) { onCancel() }
      addRp = confirmAddRp as boolean
    }

    if (addRp) {
      additions.push('resource_pack')
      if (!uuids.resourcePack) {
        const newUuids = generateUUIDs()
        writeMcbeConfig(projectDir, { uuids: { resourcePack: newUuids.resourcePack } })
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
  try {
    const existingProjectDir = getProjectDir()

    if (existingProjectDir) {
      await reinitProject(existingProjectDir, options)
      return
    }
  }
  catch {
    // Not in an existing project, proceed with creating new one
  }

  if (!name) {
    name = await p.text({
      message: 'Project name:',
      placeholder: 'my-addon',
      validate: input => validateProjectName(input) || undefined,
    }) as string
    if (isCancel(name)) { onCancel() }
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
