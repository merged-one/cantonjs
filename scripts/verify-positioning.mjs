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

const ACTIVE_PRODUCT_DOC_FILES = new Set([
  'README.md',
  'docs/index.md',
  'docs/positioning.md',
  'docs/compatibility.md',
  'docs/api/index.md',
])

const ACTIVE_PRODUCT_DOC_DIRECTORIES = [
  'docs/guide',
  'docs/examples',
  'docs/packages',
]

const ACTIVE_PRODUCT_DOC_PACKAGE_READMES = new Set([
  'packages/cantonjs-codegen/README.md',
  'packages/cantonjs-react/README.md',
  'packages/cantonjs-splice-interfaces/README.md',
  'packages/cantonjs-splice-scan/README.md',
  'packages/cantonjs-splice-token-standard/README.md',
  'packages/cantonjs-splice-validator/README.md',
])

const BANNED_PHRASES = [
  { label: 'legacy tagline', pattern: /\bviem for Canton\b/i },
  { label: 'old umbrella description', pattern: /\bTypeScript interface for the Canton Network\b/i },
  { label: 'old CLI comparison', pattern: /\bHardhat for Canton\b/i },
  { label: 'older CIP spelling', pattern: /\bCIP-103\b/ },
]

const BANNED_ACTIVE_PRODUCT_DOC_PHRASES = [
  { label: 'removed wallet adapter package', pattern: /\bcantonjs-wallet-adapters\b/ },
  { label: 'removed legacy wallet helper', pattern: /\bcreateLegacyWalletClient\b/ },
  { label: 'removed validator experimental subpath', pattern: /\bcantonjs-splice-validator\/experimental\b/ },
  { label: 'removed experimental validator scan proxy helper', pattern: /\bcreateExperimentalScanProxyClient\b/ },
  { label: 'removed experimental validator internal helper', pattern: /\bcreateExperimentalValidatorInternalClient\b/ },
  { label: 'validator internal ownership', pattern: /\bvalidator-internal\b/i },
  { label: 'react dapps wording', pattern: /\bReact hooks for Canton(?: Network)? dApps\b/i },
  { label: 'wallet slash dapp umbrella wording', pattern: /\bwallet\/dApp stack\b/i },
  { label: 'generic wallet-connected dapp wording', pattern: /\bwallet-connected dApps?\b/i },
  { label: 'outdated no-runtime-api-change claim', pattern: /\bnot the runtime API names\b/i },
]

const FILE_SPECIFIC_BANNED_PHRASES = new Map([
  ['docs/compatibility/splice-upstream-artifacts.md', [
    { label: 'outdated no-generated-clients milestone note', pattern: /\bNo runtime clients are generated in this milestone\b/ },
    { label: 'outdated ans future-client wording', pattern: /\bEligible for future stable client generation\b/ },
    { label: 'outdated scan-proxy pre-ga wording', pattern: /\bfirst-wave GA client target\b/ },
  ]],
])

const FILE_SPECIFIC_REQUIRED_SNIPPETS = new Map([
  ['docs/api/index.md', [
    { label: 'splice interfaces package listing', snippet: 'cantonjs-splice-interfaces' },
  ]],
  ['docs/compatibility/splice-upstream-artifacts.md', [
    { label: 'ans client provenance note', snippet: 'createAnsClient()' },
    { label: 'scan proxy provenance note', snippet: 'createScanProxyClient()' },
  ]],
])

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

function isActiveProductDoc(relativePath) {
  if (ACTIVE_PRODUCT_DOC_FILES.has(relativePath)) {
    return true
  }

  if (ACTIVE_PRODUCT_DOC_PACKAGE_READMES.has(relativePath)) {
    return true
  }

  return ACTIVE_PRODUCT_DOC_DIRECTORIES.some((directory) => relativePath.startsWith(`${directory}/`))
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

  const activeProductDocs = [
    ...markdownFiles.filter((relativePath) => isActiveProductDoc(relativePath)),
    ...Array.from(ACTIVE_PRODUCT_DOC_PACKAGE_READMES).filter((relativePath) =>
      existsSync(path.join(repoRoot, relativePath))),
  ]

  for (const relativePath of activeProductDocs) {
    const content = readText(relativePath)

    for (const phrase of BANNED_ACTIVE_PRODUCT_DOC_PHRASES) {
      if (!phrase.pattern.test(content)) {
        continue
      }

      const lines = findMatchingLines(content, phrase.pattern).join(', ')
      errors.push(
        `Active product docs reintroduced ${phrase.label} in ${relativePath}${lines ? ` (lines ${lines})` : ''}`,
      )
    }
  }

  for (const [relativePath, phrases] of FILE_SPECIFIC_BANNED_PHRASES.entries()) {
    const content = readText(relativePath)

    for (const phrase of phrases) {
      if (!phrase.pattern.test(content)) {
        continue
      }

      const lines = findMatchingLines(content, phrase.pattern).join(', ')
      errors.push(
        `${relativePath} reintroduced ${phrase.label}${lines ? ` (lines ${lines})` : ''}`,
      )
    }
  }

  for (const [relativePath, requiredSnippets] of FILE_SPECIFIC_REQUIRED_SNIPPETS.entries()) {
    const content = readText(relativePath)

    for (const requirement of requiredSnippets) {
      if (content.includes(requirement.snippet)) {
        continue
      }

      errors.push(`${relativePath} is missing ${requirement.label}`)
    }
  }

  const experimentalDoc = readText('docs/experimental/splice-internal-apis.md')
  if (
    experimentalDoc.includes('cantonjs-splice-validator/experimental')
    && !/removed from the current package set/i.test(experimentalDoc)
  ) {
    errors.push(
      'docs/experimental/splice-internal-apis.md must explicitly mark cantonjs-splice-validator/experimental as removed from the current package set',
    )
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

  if (existsSync(path.join(repoRoot, 'packages/cantonjs-wallet-adapters/package.json'))) {
    errors.push('Removed package must stay removed: packages/cantonjs-wallet-adapters/package.json')
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

  if (errors.length > 0) {
    fail('Positioning verification failed:', errors)
    return
  }

  console.log('Positioning verification passed.')
}

main()
