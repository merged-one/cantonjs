import { existsSync, readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const REQUIRED_DOCS = [
  'docs/positioning.md',
  'docs/guide/ecosystem-fit.md',
  'docs/guide/target-users.md',
  'docs/guide/package-architecture.md',
]

const REQUIRED_HOME_LINKS = [
  '/positioning',
  '/guide/ecosystem-fit',
  '/guide/target-users',
  '/guide/package-architecture',
]

const BANNED_PHRASES = [
  { label: 'legacy tagline', pattern: /\bviem for Canton\b/i },
  { label: 'old umbrella description', pattern: /\bTypeScript interface for the Canton Network\b/i },
  { label: 'old CLI comparison', pattern: /\bHardhat for Canton\b/i },
  { label: 'older CIP spelling', pattern: /\bCIP-103\b/ },
]

const ALLOWED_BANNED_MATCHES = new Map([
  ['legacy tagline', new Set()],
  ['old umbrella description', new Set()],
  ['old CLI comparison', new Set()],
  ['older CIP spelling', new Set()],
])

const EXPECTED_PACKAGE_DESCRIPTIONS = new Map([
  ['package.json', 'Application-side TypeScript SDK for Canton participant Ledger API V2'],
  ['packages/cantonjs-codegen/package.json', 'Optional DAR-to-TypeScript generator for cantonjs app code from existing Daml artifacts'],
  ['packages/cantonjs-react/package.json', 'Participant-private React hooks for cantonjs applications'],
  ['packages/cantonjs-splice-interfaces/package.json', 'Published stable Splice interface descriptors and generated TypeScript types'],
  ['packages/cantonjs-splice-scan/package.json', 'Public Scan reads for Splice networks'],
  ['packages/cantonjs-splice-token-standard/package.json', 'Participant-first CIP-0056 helpers for cantonjs applications'],
  ['packages/cantonjs-splice-validator/package.json', 'Selected stable external validator clients for ANS and filtered Scan Proxy reads'],
  ['packages/cantonjs-wallet-adapters/package.json', 'Experimental CIP-0103 edge adapters for official wallet-stack interop'],
])

function readText(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), 'utf8')
}

function collectMarkdownFiles(directory) {
  const files = []

  for (const entry of readdirSync(path.join(repoRoot, directory), { withFileTypes: true })) {
    const relativePath = path.posix.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...collectMarkdownFiles(relativePath))
      continue
    }

    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relativePath)
    }
  }

  return files
}

function findMatchingLines(content, pattern) {
  const lineMatches = []
  const lines = content.split(/\r?\n/u)

  lines.forEach((line, index) => {
    const linePattern = new RegExp(pattern.source, pattern.flags.replaceAll('g', ''))
    if (linePattern.test(line)) {
      lineMatches.push(index + 1)
    }
  })

  return lineMatches
}

function fail(message, errors) {
  console.error(message)
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exitCode = 1
}

function main() {
  const errors = []

  for (const relativePath of REQUIRED_DOCS) {
    if (!existsSync(path.join(repoRoot, relativePath))) {
      errors.push(`Missing required scope doc: ${relativePath}`)
    }
  }

  const homePage = readText('docs/index.md')
  for (const link of REQUIRED_HOME_LINKS) {
    if (!homePage.includes(link)) {
      errors.push(`docs/index.md must expose ${link}`)
    }
  }

  const markdownFiles = ['README.md', ...collectMarkdownFiles('docs')]
  for (const relativePath of markdownFiles) {
    const content = readText(relativePath)

    for (const phrase of BANNED_PHRASES) {
      const allowedFiles = ALLOWED_BANNED_MATCHES.get(phrase.label) ?? new Set()
      if (allowedFiles.has(relativePath)) {
        continue
      }

      if (!phrase.pattern.test(content)) {
        continue
      }

      const lines = findMatchingLines(content, phrase.pattern).join(', ')
      errors.push(`Banned ${phrase.label} phrase matched in ${relativePath}${lines ? ` (lines ${lines})` : ''}`)
    }
  }

  const discoveredPackageJsons = [
    'package.json',
    ...readdirSync(path.join(repoRoot, 'packages'), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.posix.join('packages', entry.name, 'package.json')),
  ]

  for (const relativePath of discoveredPackageJsons) {
    if (!EXPECTED_PACKAGE_DESCRIPTIONS.has(relativePath)) {
      errors.push(`No explicit positioning expectation configured for ${relativePath}`)
    }
  }

  for (const [relativePath, expectedDescription] of EXPECTED_PACKAGE_DESCRIPTIONS.entries()) {
    if (!existsSync(path.join(repoRoot, relativePath))) {
      errors.push(`Expected package metadata file is missing: ${relativePath}`)
      continue
    }

    const packageJson = JSON.parse(readText(relativePath))
    if (packageJson.description !== expectedDescription) {
      errors.push(
        `${relativePath} description drifted. Expected "${expectedDescription}" but found "${String(packageJson.description)}"`,
      )
    }
  }

  const walletAdapters = JSON.parse(readText('packages/cantonjs-wallet-adapters/package.json'))
  if (!/experimental/iu.test(String(walletAdapters.description))) {
    errors.push('packages/cantonjs-wallet-adapters/package.json must keep wallet adapters marked experimental')
  }

  if (errors.length > 0) {
    fail('Positioning verification failed:', errors)
    return
  }

  console.log('Positioning verification passed.')
}

main()
