import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Repo root is two levels up from this file (scripts/__tests__ -> repo root).
const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

// Directories that must never be traversed during the repo-wide search.
const IGNORED_DIRS = new Set(['node_modules', '.git', 'dist', 'dist-ssr', '__pycache__'])

/**
 * Recursively collect every file matching `target` (by basename) under `root`,
 * skipping ignored directories such as node_modules.
 */
function findFiles(root: string, target: string): string[] {
  const matches: string[] = []
  const stack: string[] = [root]

  while (stack.length > 0) {
    const dir = stack.pop()!
    let entries
    try {
      entries = readdirSync(dir, { withFileTypes: true })
    } catch {
      continue
    }
    for (const entry of entries) {
      const full = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue
        stack.push(full)
      } else if (entry.isFile() && entry.name === target) {
        matches.push(full)
      }
    }
  }

  return matches
}

const SIX_VITE_VARS = [
  'VITE_BACKEND_URL',
  'VITE_WS_URL',
  'VITE_LARK_APP_ID',
  'VITE_LARK_APP_TOKEN',
  'VITE_LARK_REDIRECT_URI',
  'VITE_API_SHARED_SECRET',
] as const

describe('repository deployment hygiene (Render-only)', () => {
  it('contains no vercel.json anywhere in the repository', () => {
    // Requirement 9.5: no Vercel-specific configuration artifacts remain.
    const found = findFiles(REPO_ROOT, 'vercel.json')
    expect(found, `unexpected vercel.json files: ${found.join(', ')}`).toEqual([])
  })

  it('contains no .vercelignore anywhere in the repository', () => {
    // Requirement 9.5: no Vercel-specific configuration artifacts remain.
    const found = findFiles(REPO_ROOT, '.vercelignore')
    expect(found, `unexpected .vercelignore files: ${found.join(', ')}`).toEqual([])
  })

  describe('.env.example (repo root)', () => {
    const envExamplePath = join(REPO_ROOT, '.env.example')

    it('exists at the repo root', () => {
      expect(existsSync(envExamplePath)).toBe(true)
    })

    it('lists exactly the six required VITE_ variables', () => {
      // Requirements 9.4, 3.3
      const content = readFileSync(envExamplePath, 'utf-8')
      // Collect VITE_ variable names that are actually declared (KEY=VALUE),
      // ignoring commented-out references.
      const declared = new Set<string>()
      for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (line.length === 0 || line.startsWith('#')) continue
        const match = line.match(/^(VITE_[A-Z0-9_]+)\s*=/)
        if (match) declared.add(match[1])
      }

      expect([...declared].sort()).toEqual([...SIX_VITE_VARS].sort())
    })

    it('does not contain VITE_LARK_APP_SECRET as a declared variable', () => {
      // Requirement 3.3: the Lark app secret must not be exposed to the frontend.
      const content = readFileSync(envExamplePath, 'utf-8')
      const declaresAppSecret = content
        .split(/\r?\n/)
        .map((l) => l.trim())
        .some((line) => !line.startsWith('#') && /^VITE_LARK_APP_SECRET\s*=/.test(line))

      expect(declaresAppSecret).toBe(false)
    })
  })

  it('excludes .env from version control via .gitignore', () => {
    // Requirement 3.3 / secret hygiene: local env files are never committed.
    const gitignorePath = join(REPO_ROOT, '.gitignore')
    expect(existsSync(gitignorePath)).toBe(true)
    const ignoredEntries = readFileSync(gitignorePath, 'utf-8')
      .split(/\r?\n/)
      .map((l) => l.trim())
    expect(ignoredEntries).toContain('.env')
  })
})
