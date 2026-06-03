# @mcbe-mods/create

[![npm version][npm-version-src]][npm-version-href]
[![npm downloads][npm-downloads-src]][npm-downloads-href]
[![License][license-src]][license-href]

CLI tool for scaffolding and developing Minecraft Bedrock Edition addons.

## Install

```bash
npm install -g @mcbe-mods/create
```

## Usage

### Create a new project

```bash
mcbe-create init my-addon
```

Interactive prompts guide you through:
- Pack selection (Behavior Pack, Resource Pack)
- Script API setup (TypeScript or JavaScript)
- Template choice (when Script API is enabled)
- Package manager (npm, pnpm, yarn)

Use `--yes` to skip prompts and create with defaults (explosive-bow + BP + RP + TS):

```bash
mcbe-create init my-addon --yes
```

Run `init` inside an existing project to add missing packs.

### Development

```bash
cd my-addon
mcbe-create dev            # Watch source files and rebuild
mcbe-create dev --sync     # Also sync changes to Minecraft dev packs
```

- Mirrors pack files from `src/` to `dist/`
- Compiles TypeScript on change (when using TS)
- `--sync` automatically copies `dist/` to Minecraft development pack directories

### Build & package

```bash
mcbe-create build
```

Produces a `.mcaddon` file in the `pack/` directory.

### Other commands

```bash
mcbe-create sync      # Manual one-shot sync dist/ to Minecraft
mcbe-create manifest  # Regenerate manifest.json from config
mcbe-create info      # Show project information
```

## Options

### `init`

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `-t, --template <template>` | `string` | `'default'` | Template to use (`default`, `explosive-bow`) |
| `-y, --yes` | `boolean` | `false` | Skip prompts, use defaults |

### `dev`

| Option | Description |
|--------|-------------|
| `--sync` | Also sync changes to Minecraft development pack directories |

## License

[MIT](./LICENSE) License © 2026-Present [Lete114](https://github.com/Lete114)

## Project structure

```
my-addon/
├── src/
│   ├── behavior_pack/          # Behavior Pack (user choice)
│   │   ├── manifest.json       # Editable by user
│   │   ├── scripts/main.ts     # Only with Script API + TypeScript
│   │   └── texts/
│   └── resource_pack/          # Resource Pack (user choice)
│       ├── manifest.json
│       └── texts/
├── dist/                       # Built output
│   ├── behavior_pack/
│   └── resource_pack/
├── pack/                       # .mcaddon output
├── quick-start.json            # Project configuration
├── package.json
└── tsconfig.json               # Only for TypeScript projects
```

## Requirements

- Node.js >= 20.19.0
- Minecraft Bedrock Edition (Windows)

<!-- Badges -->

[npm-version-src]: https://img.shields.io/npm/v/@mcbe-mods/create?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/@mcbe-mods/create
[npm-downloads-src]: https://img.shields.io/npm/dm/@mcbe-mods/create?style=flat&colorA=080f12&colorB=1fa669
[npm-downloads-href]: https://npmjs.com/package/@mcbe-mods/create
[license-src]: https://img.shields.io/github/license/mcbe-mods/create.svg?style=flat&colorA=080f12&colorB=1fa669
[license-href]: https://github.com/mcbe-mods/create/blob/main/LICENSE
