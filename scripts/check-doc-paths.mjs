#!/usr/bin/env node
/**
 * Fail if docs still reference removed paths (ai/sdk, ai/shared as a package dir).
 * Also verify that key documented paths exist relative to the monorepo root.
 */
import { existsSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const aiRoot = resolve(fileURLToPath(new URL('..', import.meta.url)))
const monorepoRoot = resolve(aiRoot, '..')

const FORBIDDEN = [
  { pattern: /(?<!platform-shared\/)ai\/sdk\b/, label: 'ai/sdk (removed)' },
  { pattern: /(?<!@schema-platform\/)(?<!platform-shared\/)\bai\/shared\b/, label: 'ai/shared (moved to shared/platform-shared/ai/)' },
]

const REQUIRED_PATHS = [
  'ai/app',
  'ai/docs',
  'shared/platform-shared',
  'shared/platform-shared/ai',
  'server',
]

const DOC_GLOBS = ['README.md', 'CONTRIBUTING.md', 'docs']

async function collectMarkdownFiles(dir, out = []) {
  const entries = await readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.claude') continue
      await collectMarkdownFiles(full, out)
    } else if (entry.name.endsWith('.md')) {
      out.push(full)
    }
  }
  return out
}

async function main() {
  const errors = []

  for (const rel of REQUIRED_PATHS) {
    const abs = join(monorepoRoot, rel)
    if (!existsSync(abs)) {
      errors.push(`Missing required path: ${rel}`)
    }
  }

  const files = []
  for (const name of DOC_GLOBS) {
    const abs = join(aiRoot, name)
    if (!existsSync(abs)) continue
    const stat = await import('node:fs').then((m) => m.statSync(abs))
    if (stat.isDirectory()) await collectMarkdownFiles(abs, files)
    else files.push(abs)
  }

  for (const file of files) {
    // Skip historical / planning docs that intentionally mention old paths
    const rel = file.slice(aiRoot.length + 1)
    if (
      rel.includes('migration-plan.md') ||
      rel.includes('iteration-evolution.md') ||
      rel.includes('dev-execution-plan.md') ||
      rel.includes('backlog.md')
    ) {
      continue
    }

    const text = await readFile(file, 'utf8')
    for (const { pattern, label } of FORBIDDEN) {
      if (pattern.test(text)) {
        errors.push(`${rel}: still references ${label}`)
      }
    }
  }

  if (errors.length > 0) {
    console.error('Doc path check failed:\n' + errors.map((e) => `  - ${e}`).join('\n'))
    process.exit(1)
  }
  console.log(`Doc path check passed (${files.length} files).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
