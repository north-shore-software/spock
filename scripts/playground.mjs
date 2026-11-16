#!/usr/bin/env node
// Reset ./playground to a fresh copy of templates/simple, for throwaway prototyping.
//
// The playground is gitignored and is NOT a pnpm workspace package. Adding it to the
// workspace would rewrite pnpm-lock.yaml on every install. Instead, its node_modules
// symlinks each entry of the template's node_modules. Dependencies, including the
// workspace links to @spock/router and @spock/toolbar, then resolve exactly as they do
// in the template, with no install step.
//
// Usage: pnpm playground        (then: pnpm dev:playground)

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const template = join(root, 'templates', 'simple')
const target = join(root, 'playground')
const templateModules = join(template, 'node_modules')

if (!existsSync(templateModules)) {
  console.error('templates/simple/node_modules is missing. Run `pnpm install` first.')
  process.exit(1)
}

// 1. Wipe and copy the template source (not its build output or installed deps).
rmSync(target, { recursive: true, force: true })
const skip = new Set(['node_modules', 'dist'])
cpSync(template, target, {
  recursive: true,
  filter: (src) => !skip.has(relative(template, src).split(/[\\/]/)[0]),
})

// 2. Patch the bits that depend on the template's name and location.
const edit = (file, fn) => writeFileSync(join(target, file), fn(readFileSync(join(target, file), 'utf8')))
edit('package.json', (s) => s.replace('"@spock/simple"', '"@spock/playground"'))
const templateToRoot = relative(template, root).split('\\').join('/') // "../.."
const targetToRoot = relative(target, root).split('\\').join('/') // ".."
for (const file of readdirSync(target).filter((f) => /^tsconfig.*\.json$/.test(f))) {
  edit(file, (s) => s.replaceAll(`${templateToRoot}/tsconfig.base.json`, `${targetToRoot}/tsconfig.base.json`))
}

// 3. Borrow the template's dependencies. Leave out caches (.vite, .tmp) and pnpm's
//    metadata files so the two apps don't share build state.
const modules = join(target, 'node_modules')
mkdirSync(modules)
for (const entry of readdirSync(templateModules)) {
  if (entry.startsWith('.') && entry !== '.bin') continue
  symlinkSync(relative(modules, join(templateModules, entry)), join(modules, entry))
}

console.log(`Playground reset from templates/simple → ${relative(process.cwd(), target) || '.'}`)
console.log('Run it with: pnpm dev:playground')
