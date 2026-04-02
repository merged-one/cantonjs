import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import process from 'node:process'
import { fileURLToPath } from 'node:url'

const UPSTREAM_RAW_BASE_URL = 'https://raw.githubusercontent.com/hyperledger-labs/splice'
const ALLOWED_CLASSIFICATIONS = new Set(['external', 'legacy', 'internal/experimental'])
const ALLOWED_COMPATIBILITY = new Set(['backward-compatible', 'legacy', 'mixed', 'no-guarantee'])

const REQUIRED_ARTIFACTS = [
  {
    id: 'scan',
    fileName: 'scan.yaml',
    sourcePath: 'apps/scan/src/main/openapi/scan.yaml',
  },
  {
    id: 'scan-proxy',
    fileName: 'scan-proxy.yaml',
    sourcePath: 'apps/validator/src/main/openapi/scan-proxy.yaml',
  },
  {
    id: 'ans-external',
    fileName: 'ans-external.yaml',
    sourcePath: 'apps/validator/src/main/openapi/ans-external.yaml',
  },
  {
    id: 'wallet-external',
    fileName: 'wallet-external.yaml',
    sourcePath: 'apps/wallet/src/main/openapi/wallet-external.yaml',
  },
  {
    id: 'validator-internal',
    fileName: 'validator-internal.yaml',
    sourcePath: 'apps/validator/src/main/openapi/validator-internal.yaml',
  },
]

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

function sha256(buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

function toPosixPath(...segments) {
  return path.posix.join(...segments)
}

function parseChecksums(contents) {
  const entries = new Map()

  for (const line of contents.split('\n').map((value) => value.trimEnd()).filter(Boolean)) {
    const match = line.match(/^([0-9a-f]{64})\s+(.+)$/)

    if (!match) {
      throw new Error(`Malformed checksum line: ${line}`)
    }

    entries.set(match[2], match[1])
  }

  return entries
}

async function readJson(relativePath) {
  const filePath = path.join(repoRoot, relativePath)
  const contents = await readFile(filePath, 'utf8')
  return JSON.parse(contents)
}

async function main() {
  const errors = []
  let manifest

  try {
    manifest = await readJson(toPosixPath('vendor', 'splice', 'manifest.json'))
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
    return
  }

  if (manifest.schemaVersion !== 1) {
    errors.push(`Unsupported manifest schemaVersion: ${manifest.schemaVersion}`)
  }

  const resolvedTag = manifest?.upstream?.resolvedTag
  const normalizedMatch = typeof resolvedTag === 'string' && resolvedTag.match(/^(0\.\d+\.\d+)$/)

  if (!normalizedMatch) {
    errors.push(`Manifest upstream.resolvedTag must be a normalized release tag, received: ${String(resolvedTag)}`)
  }

  const releaseLine = manifest?.upstream?.releaseLine

  if (normalizedMatch && releaseLine !== resolvedTag.split('.').slice(0, 2).join('.')) {
    errors.push(`Manifest releaseLine does not match resolvedTag: ${releaseLine}`)
  }

  const expectedChecksumFile = normalizedMatch
    ? toPosixPath('vendor', 'splice', resolvedTag, 'openapi', 'SHA256SUMS')
    : null

  if (!expectedChecksumFile || manifest.checksumFile !== expectedChecksumFile) {
    errors.push(`Manifest checksumFile must be ${expectedChecksumFile}, received: ${String(manifest.checksumFile)}`)
  }

  const manifestArtifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : []
  const artifactsById = new Map(manifestArtifacts.map((artifact) => [artifact.id, artifact]))

  if (artifactsById.size !== REQUIRED_ARTIFACTS.length) {
    errors.push(`Manifest must list exactly ${REQUIRED_ARTIFACTS.length} artifacts, received: ${artifactsById.size}`)
  }

  let checksumEntries

  if (expectedChecksumFile) {
    try {
      const checksumContents = await readFile(path.join(repoRoot, expectedChecksumFile), 'utf8')
      checksumEntries = parseChecksums(checksumContents)
    } catch (error) {
      errors.push(`Unable to read checksum file ${expectedChecksumFile}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const expectedChecksumPaths = []

  for (const required of REQUIRED_ARTIFACTS) {
    const artifact = artifactsById.get(required.id)
    const expectedPath = normalizedMatch
      ? toPosixPath('vendor', 'splice', resolvedTag, 'openapi', required.fileName)
      : null
    const expectedSource = normalizedMatch
      ? `${UPSTREAM_RAW_BASE_URL}/${resolvedTag}/${required.sourcePath}`
      : null

    expectedChecksumPaths.push(expectedPath)

    if (!artifact) {
      errors.push(`Manifest is missing required artifact: ${required.id}`)
      continue
    }

    if (artifact.path !== expectedPath) {
      errors.push(`Artifact ${required.id} has unexpected path: ${artifact.path}`)
    }

    if (artifact.source !== expectedSource) {
      errors.push(`Artifact ${required.id} must use the official raw source URL: ${artifact.source}`)
    }

    if (!ALLOWED_CLASSIFICATIONS.has(artifact.classification)) {
      errors.push(`Artifact ${required.id} has invalid classification: ${artifact.classification}`)
    }

    if (!ALLOWED_COMPATIBILITY.has(artifact.compatibility)) {
      errors.push(`Artifact ${required.id} has invalid compatibility: ${artifact.compatibility}`)
    }

    if (typeof artifact.why !== 'string' || artifact.why.length === 0) {
      errors.push(`Artifact ${required.id} is missing a rationale`)
    }

    try {
      const contents = await readFile(path.join(repoRoot, artifact.path))
      const digest = sha256(contents)
      const checksumDigest = checksumEntries?.get(artifact.path)

      if (!checksumDigest) {
        errors.push(`Checksum file is missing an entry for ${artifact.path}`)
      } else if (checksumDigest !== digest) {
        errors.push(`Checksum mismatch for ${artifact.path}`)
      }
    } catch (error) {
      errors.push(`Artifact file is missing or unreadable: ${artifact.path}: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  if (checksumEntries) {
    const expectedSet = new Set(expectedChecksumPaths.filter(Boolean))

    for (const checksumPath of checksumEntries.keys()) {
      if (!expectedSet.has(checksumPath)) {
        errors.push(`Checksum file contains an unexpected entry: ${checksumPath}`)
      }
    }
  }

  if (errors.length > 0) {
    for (const error of errors) {
      console.error(`- ${error}`)
    }

    process.exitCode = 1
    return
  }

  console.log(`Verified ${REQUIRED_ARTIFACTS.length} Splice OpenAPI artifacts for ${resolvedTag}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
