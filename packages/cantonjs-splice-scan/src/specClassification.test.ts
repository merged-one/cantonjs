import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { parse } from 'yaml'
import { describe, expect, it } from 'vitest'
import { PUBLIC_SCAN_OPERATIONS } from './createScanClient.js'

type ScanSpec = {
  paths: Record<string, Record<string, unknown> | { $ref: string }>
}

const currentFile = fileURLToPath(import.meta.url)
const currentDir = dirname(currentFile)
const repoRoot = resolve(currentDir, '../../..')

describe('Scan spec classification', () => {
  it('exports only public external Scan operations', () => {
    const spec = loadScanSpec()

    for (const operation of PUBLIC_SCAN_OPERATIONS) {
      const pathItem = spec.paths[operation.path]
      expect(pathItem, `missing path ${operation.path}`).toBeDefined()

      if (pathItem !== undefined && '$ref' in pathItem) {
        expect(pathItem.$ref).toContain('common-external.yaml#/paths/')
        continue
      }

      const methodSpec = pathItem?.[operation.method.toLowerCase()]
      expect(methodSpec, `missing ${operation.method} ${operation.path}`).toBeDefined()

      const tags = normalizeTags(methodSpec)
      expect(tags).toContain('external')
      expect(tags).not.toContain('internal')
      expect(tags).not.toContain('deprecated')
      expect(tags).not.toContain('pre-alpha')
      expect(Boolean((methodSpec as { deprecated?: boolean } | undefined)?.deprecated)).toBe(false)
    }
  })

  it('keeps generated and internal helpers out of the main entrypoint', async () => {
    const entrypoint = await import('./index.js')

    expect(entrypoint.createScanClient).toBeTypeOf('function')
    expect(entrypoint).not.toHaveProperty('PUBLIC_SCAN_OPERATIONS')
    expect(entrypoint).not.toHaveProperty('createScanHttpClient')
    expect(entrypoint).not.toHaveProperty('paths')
    expect(entrypoint).not.toHaveProperty('operations')
  })
})

function loadScanSpec(): ScanSpec {
  const spliceTag = readdirSync(resolve(repoRoot, 'vendor/splice'), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }))
    .at(-1)

  if (spliceTag === undefined) {
    throw new Error('No vendored Splice tag directories found')
  }

  const specPath = resolve(repoRoot, `vendor/splice/${spliceTag}/openapi/scan.yaml`)
  return parse(readFileSync(specPath, 'utf8')) as ScanSpec
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
