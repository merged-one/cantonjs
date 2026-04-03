import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const exclusionsPath = path.join(repoRoot, 'EXCLUSIONS.md')
const SKIP_DIRS = new Set(['.git', 'coverage', 'dist', 'node_modules'])

function toPosix(filePath) {
  return filePath.split(path.sep).join('/')
}

async function walk(dir, predicate, results = []) {
  const entries = await readdir(dir, { withFileTypes: true })

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) {
        await walk(path.join(dir, entry.name), predicate, results)
      }

      continue
    }

    if (predicate(entry.name)) {
      results.push(path.join(dir, entry.name))
    }
  }

  return results
}

function compareStrings(a, b) {
  return a.localeCompare(b)
}

async function loadRegistry() {
  const markdown = await readFile(exclusionsPath, 'utf8')
  const match = markdown.match(/```json\n([\s\S]*?)\n```/)

  if (!match) {
    throw new Error('EXCLUSIONS.md must contain a fenced JSON registry.')
  }

  const registry = JSON.parse(match[1])

  if (!Array.isArray(registry.coverageExcludes) || !Array.isArray(registry.inlineIgnores)) {
    throw new Error('EXCLUSIONS.md registry must define coverageExcludes and inlineIgnores arrays.')
  }

  return registry
}

function extractExcludeBlock(configPath, source) {
  const match = source.match(/exclude:\s*\[([\s\S]*?)\]\s*,\s*thresholds:/)

  if (!match) {
    throw new Error(`${configPath} is missing a coverage.exclude block.`)
  }

  return [...match[1].matchAll(/'([^']+)'/g)].map((entry) => entry[1])
}

async function collectCoverageExcludes() {
  const configFiles = (await walk(repoRoot, (name) => name === 'vitest.config.ts'))
    .map((file) => toPosix(path.relative(repoRoot, file)))
    .sort(compareStrings)

  const excludes = []

  for (const relativePath of configFiles) {
    const absolutePath = path.join(repoRoot, relativePath)
    const source = await readFile(absolutePath, 'utf8')

    for (const target of extractExcludeBlock(relativePath, source)) {
      excludes.push({
        scope: relativePath,
        target,
      })
    }
  }

  return excludes.sort((left, right) => {
    const scopeCompare = compareStrings(left.scope, right.scope)
    return scopeCompare === 0 ? compareStrings(left.target, right.target) : scopeCompare
  })
}

function extractInlineIgnoreReason(line) {
  const [, reason = ''] = line.match(/(?:\/\*|\/\/)\s*v8 ignore(?: [^-*]+)? -- (.*?)(?: \*\/)?$/) ?? []
  return reason.trim()
}

async function collectInlineIgnores() {
  const sourceFiles = await walk(
    repoRoot,
    (name) => name.endsWith('.ts') || name.endsWith('.tsx') || name.endsWith('.mjs'),
  )

  const ignores = []

  for (const absolutePath of sourceFiles) {
    const relativePath = toPosix(path.relative(repoRoot, absolutePath))
    const source = await readFile(absolutePath, 'utf8')
    const lines = source.split('\n')

    lines.forEach((line, index) => {
      if (!/(?:\/\*|\/\/)\s*v8 ignore/.test(line)) {
        return
      }

      const reason = extractInlineIgnoreReason(line)

      if (reason.length === 0) {
        throw new Error(`${relativePath}:${String(index + 1)} is missing a v8 ignore reason.`)
      }

      ignores.push({
        file: relativePath,
        line: index + 1,
        reason,
      })
    })
  }

  return ignores.sort((left, right) => {
    const fileCompare = compareStrings(left.file, right.file)
    return fileCompare === 0 ? left.line - right.line : fileCompare
  })
}

function findDuplicates(entries, toKey) {
  const counts = new Map()

  for (const entry of entries) {
    const key = toKey(entry)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }

  return [...counts.entries()]
    .filter(([, count]) => count > 1)
    .map(([key]) => key)
    .sort(compareStrings)
}

function verifyCoverageExcludes(actual, documented) {
  const problems = []
  const actualKeys = new Set(actual.map((entry) => `${entry.scope}::${entry.target}`))
  const documentedKeys = new Set()

  for (const entry of documented) {
    const key = `${entry.scope}::${entry.target}`

    documentedKeys.add(key)

    if (typeof entry.reason !== 'string' || entry.reason.trim().length === 0) {
      problems.push(`Missing reason for documented coverage exclusion ${key}.`)
    }
  }

  for (const duplicate of findDuplicates(documented, (entry) => `${entry.scope}::${entry.target}`)) {
    problems.push(`Duplicate documented coverage exclusion ${duplicate}.`)
  }

  for (const entry of actual) {
    const key = `${entry.scope}::${entry.target}`

    if (!documentedKeys.has(key)) {
      problems.push(`Undocumented coverage exclusion ${key}.`)
    }
  }

  for (const entry of documented) {
    const key = `${entry.scope}::${entry.target}`

    if (!actualKeys.has(key)) {
      problems.push(`Stale documented coverage exclusion ${key}.`)
    }
  }

  return problems
}

function verifyInlineIgnores(actual, documented) {
  const problems = []
  const actualMap = new Map(actual.map((entry) => [`${entry.file}:${String(entry.line)}`, entry]))
  const documentedMap = new Map()

  for (const entry of documented) {
    const key = `${entry.file}:${String(entry.line)}`

    documentedMap.set(key, entry)

    if (typeof entry.reason !== 'string' || entry.reason.trim().length === 0) {
      problems.push(`Missing reason for documented inline ignore ${key}.`)
    }
  }

  for (const duplicate of findDuplicates(documented, (entry) => `${entry.file}:${String(entry.line)}`)) {
    problems.push(`Duplicate documented inline ignore ${duplicate}.`)
  }

  for (const [key, entry] of actualMap) {
    const documentedEntry = documentedMap.get(key)

    if (!documentedEntry) {
      problems.push(`Undocumented inline ignore ${key}.`)
      continue
    }

    if (documentedEntry.reason !== entry.reason) {
      problems.push(
        `Reason mismatch for inline ignore ${key}. Expected "${entry.reason}", found "${documentedEntry.reason}".`,
      )
    }
  }

  for (const key of documentedMap.keys()) {
    if (!actualMap.has(key)) {
      problems.push(`Stale documented inline ignore ${key}.`)
    }
  }

  return problems
}

async function main() {
  const registry = await loadRegistry()
  const coverageExcludes = await collectCoverageExcludes()
  const inlineIgnores = await collectInlineIgnores()
  const problems = [
    ...verifyCoverageExcludes(coverageExcludes, registry.coverageExcludes),
    ...verifyInlineIgnores(inlineIgnores, registry.inlineIgnores),
  ]

  if (problems.length > 0) {
    for (const problem of problems) {
      console.error(problem)
    }

    process.exitCode = 1
    return
  }

  console.log(
    `Verified ${String(coverageExcludes.length)} coverage excludes and ${String(inlineIgnores.length)} inline ignores against EXCLUSIONS.md.`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
