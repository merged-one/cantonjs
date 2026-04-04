import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import { GA_SCAN_PROXY_OPERATIONS } from './createScanProxyClient.js'

type OpenApiSpec = {
  paths: Record<string, Record<string, unknown> | { $ref: string }>
}

const currentFile = fileURLToPath(import.meta.url)
const currentDir = dirname(currentFile)
const packageRoot = resolve(currentDir, '..')
const repoRoot = resolve(currentDir, '../../..')

describe('Validator spec classification', () => {
  it('keeps the GA scan proxy surface aligned with external scan semantics', () => {
    const scanProxySpec = loadVendoredSpec('scan-proxy.yaml')
    const scanSpec = loadVendoredSpec('scan.yaml')

    for (const operation of GA_SCAN_PROXY_OPERATIONS) {
      const pathItem = scanProxySpec.paths[operation.path]
      expect(pathItem, `missing scan-proxy path ${operation.path}`).toBeDefined()
      expect(pathItem).not.toHaveProperty('$ref')

      const methodSpec = pathItem?.[operation.method.toLowerCase()]
      expect(methodSpec, `missing ${operation.method} ${operation.path}`).toBeDefined()
      expect((methodSpec as { operationId?: string } | undefined)?.operationId).toBe(
        operation.proxyOperationId,
      )

      const scanMethodSpec = findOperationById(scanSpec, operation.scanOperationId)
      expect(
        scanMethodSpec,
        `missing scan operation ${operation.scanOperationId} for ${operation.proxyOperationId}`,
      ).toBeDefined()

      const tags = normalizeTags(scanMethodSpec)
      expect(tags).toContain('external')
      expect(tags).not.toContain('internal')
      expect(tags).not.toContain('deprecated')
      expect(tags).not.toContain('pre-alpha')
      expect(Boolean((scanMethodSpec as { deprecated?: boolean } | undefined)?.deprecated)).toBe(
        false,
      )
    }
  })

  it('documents only the GA validator surfaces in the package README', () => {
    const readme = readFileSync(resolve(packageRoot, 'README.md'), 'utf8')
    const spliceTag = loadVendoredSpliceTag()

    expect(readme).toContain('## GA Scan Proxy Surface')
    expect(readme).not.toContain('## Legacy Wallet Compatibility')
    expect(readme).not.toContain('## Experimental APIs')
    expect(readme).not.toContain('createLegacyWalletClient')
    expect(readme).not.toContain('cantonjs-splice-validator/experimental')
    expect(readme).not.toContain('validator-internal')
    expect(readme).toContain(spliceTag)
    expect(readme).toContain('Token Standard')
  })

  it('keeps generated helpers and internal classification state out of the main entrypoint', async () => {
    const entrypoint = await import('./index.js')
    const packageJson = JSON.parse(readFileSync(resolve(packageRoot, 'package.json'), 'utf8')) as {
      exports: Record<string, unknown>
    }

    expect(entrypoint.createAnsClient).toBeTypeOf('function')
    expect(entrypoint.createScanProxyClient).toBeTypeOf('function')
    expect(entrypoint).not.toHaveProperty('createExperimentalScanProxyClient')
    expect(entrypoint).not.toHaveProperty('createExperimentalValidatorInternalClient')
    expect(entrypoint).not.toHaveProperty('createLegacyWalletClient')
    expect(entrypoint).not.toHaveProperty('GA_SCAN_PROXY_OPERATIONS')
    expect(entrypoint).not.toHaveProperty('paths')
    expect(entrypoint).not.toHaveProperty('operations')
    expect(Object.keys(packageJson.exports).sort()).toEqual(['.'])
  })
})

function loadVendoredSpec(filename: string): OpenApiSpec {
  const spliceTag = loadVendoredSpliceTag()

  const specPath = resolve(repoRoot, `vendor/splice/${spliceTag}/openapi/${filename}`)
  return parse(readFileSync(specPath, 'utf8')) as OpenApiSpec
}

function loadVendoredSpliceTag(): string {
  const spliceTag = readdirSync(resolve(repoRoot, 'vendor/splice'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
    .at(-1)

  if (spliceTag === undefined) {
    throw new Error('No vendored Splice tag directories found')
  }

  return spliceTag
}

function findOperationById(spec: OpenApiSpec, operationId: string): unknown {
  for (const pathItem of Object.values(spec.paths)) {
    if ('$ref' in pathItem) {
      continue
    }

    for (const method of Object.values(pathItem)) {
      const candidate = method as { operationId?: string } | undefined
      if (candidate?.operationId === operationId) {
        return candidate
      }
    }
  }

  return undefined
}

function normalizeTags(methodSpec: unknown): string[] {
  const tags = (methodSpec as { tags?: unknown } | undefined)?.tags
  if (!Array.isArray(tags)) {
    return []
  }

  return tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
}
