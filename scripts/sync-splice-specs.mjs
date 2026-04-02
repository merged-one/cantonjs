import { execFile } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { promisify } from 'node:util'
import { fileURLToPath } from 'node:url'

const execFileAsync = promisify(execFile)

const UPSTREAM_GIT_URL = 'https://github.com/hyperledger-labs/splice.git'
const UPSTREAM_RAW_BASE_URL = 'https://raw.githubusercontent.com/hyperledger-labs/splice'
const ALLOWED_CLASSIFICATIONS = ['external', 'legacy', 'internal/experimental']
const ALLOWED_COMPATIBILITY = ['backward-compatible', 'legacy', 'mixed', 'no-guarantee']

const ARTIFACTS = [
  {
    id: 'scan',
    fileName: 'scan.yaml',
    sourcePath: 'apps/scan/src/main/openapi/scan.yaml',
    classification: 'legacy',
    compatibility: 'mixed',
    why: 'Single Scan spec mixes external, internal, deprecated, and pre-alpha tags in one file.',
  },
  {
    id: 'scan-proxy',
    fileName: 'scan-proxy.yaml',
    sourcePath: 'apps/validator/src/main/openapi/scan-proxy.yaml',
    classification: 'legacy',
    compatibility: 'legacy',
    why: 'Validator-local proxy surface over Scan data; cantonjs treats it as a compatibility layer rather than a primary stable client target.',
  },
  {
    id: 'ans-external',
    fileName: 'ans-external.yaml',
    sourcePath: 'apps/validator/src/main/openapi/ans-external.yaml',
    classification: 'external',
    compatibility: 'backward-compatible',
    why: 'Upstream names this spec external and packages it under external.ans.',
  },
  {
    id: 'wallet-external',
    fileName: 'wallet-external.yaml',
    sourcePath: 'apps/wallet/src/main/openapi/wallet-external.yaml',
    classification: 'legacy',
    compatibility: 'legacy',
    why: 'Official public spec, but these wallet transfer-offer flows are product-specific and superseded by token-standard-first integration in cantonjs.',
  },
  {
    id: 'validator-internal',
    fileName: 'validator-internal.yaml',
    sourcePath: 'apps/validator/src/main/openapi/validator-internal.yaml',
    classification: 'internal/experimental',
    compatibility: 'no-guarantee',
    why: 'Upstream names this spec internal; do not treat it as a stable client input.',
  },
]

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function parseArgs(argv) {
  let tag

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg === '--tag') {
      tag = argv[index + 1]

      if (!tag) {
        throw new Error('--tag requires a value')
      }

      index += 1
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return { tag }
}

function normalizeTag(tag) {
  const match = tag.match(/^(?:splice-)?(0\.\d+\.\d+)$/)

  if (!match) {
    throw new Error(`Unsupported Splice tag format: ${tag}`)
  }

  return match[1]
}

function toPosixPath(...segments) {
  return path.posix.join(...segments)
}

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function resolveLatestTag() {
  const { stdout } = await execFileAsync('git', ['ls-remote', '--tags', UPSTREAM_GIT_URL], {
    cwd: repoRoot,
  })

  const tags = stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.split('\t')[1])
    .filter((ref) => ref && /refs\/tags\/(?:splice-)?0\.\d+\.\d+(?:\^\{\})?$/.test(ref))
    .map((ref) => ref.replace(/^refs\/tags\//, '').replace(/\^\{\}$/, ''))

  const normalized = [...new Set(tags.map(normalizeTag))].sort((left, right) =>
    left.localeCompare(right, undefined, { numeric: true }),
  )

  if (normalized.length === 0) {
    throw new Error('Unable to resolve a Splice release tag from upstream')
  }

  return normalized[normalized.length - 1]
}

async function fetchArtifact(url) {
  const response = await fetch(url)

  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`)
  }

  return Buffer.from(await response.arrayBuffer())
}

async function main() {
  const { tag: tagArg } = parseArgs(process.argv.slice(2))
  const resolvedTag = tagArg ? normalizeTag(tagArg) : await resolveLatestTag()
  const releaseLine = resolvedTag.split('.').slice(0, 2).join('.')
  const openapiRelativeDir = toPosixPath('vendor', 'splice', resolvedTag, 'openapi')
  const openapiDir = path.join(repoRoot, openapiRelativeDir)

  await mkdir(openapiDir, { recursive: true })

  const downloaded = []

  for (const artifact of ARTIFACTS) {
    if (!ALLOWED_CLASSIFICATIONS.includes(artifact.classification)) {
      throw new Error(`Unsupported classification for ${artifact.id}: ${artifact.classification}`)
    }

    if (!ALLOWED_COMPATIBILITY.includes(artifact.compatibility)) {
      throw new Error(`Unsupported compatibility for ${artifact.id}: ${artifact.compatibility}`)
    }

    const source = `${UPSTREAM_RAW_BASE_URL}/${resolvedTag}/${artifact.sourcePath}`
    const relativePath = toPosixPath(openapiRelativeDir, artifact.fileName)
    const filePath = path.join(repoRoot, relativePath)
    const contents = await fetchArtifact(source)

    await writeFile(filePath, contents)

    downloaded.push({
      ...artifact,
      source,
      relativePath,
      sha256: sha256(contents),
    })
  }

  downloaded.sort((left, right) => left.relativePath.localeCompare(right.relativePath))

  const checksumRelativePath = toPosixPath(openapiRelativeDir, 'SHA256SUMS')
  const checksumFilePath = path.join(repoRoot, checksumRelativePath)
  const checksumLines = downloaded.map(({ relativePath, sha256: digest }) => `${digest}  ${relativePath}`)

  await writeFile(checksumFilePath, `${checksumLines.join('\n')}\n`)

  const manifest = {
    schemaVersion: 1,
    upstream: {
      repository: 'https://github.com/hyperledger-labs/splice',
      resolvedTag,
      releaseLine,
    },
    checksumFile: checksumRelativePath,
    artifacts: downloaded.map(({ id, relativePath, source, classification, compatibility, why }) => ({
      id,
      path: relativePath,
      source,
      classification,
      compatibility,
      why,
    })),
  }

  const manifestPath = path.join(repoRoot, 'vendor', 'splice', 'manifest.json')
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  console.log(`Synced ${downloaded.length} Splice OpenAPI artifacts for ${resolvedTag}`)
  console.log(`Manifest: ${toPosixPath('vendor', 'splice', 'manifest.json')}`)
  console.log(`Checksums: ${checksumRelativePath}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
