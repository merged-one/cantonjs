import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const currentFile = fileURLToPath(import.meta.url)
const currentDir = dirname(currentFile)
const repoRoot = resolve(currentDir, '../..')

describe('release documentation and workflow', () => {
  it('documents the pinned Canton and Splice release lines', () => {
    const readme = readFileSync(resolve(repoRoot, 'README.md'), 'utf8')
    const compatibility = readFileSync(resolve(repoRoot, 'docs/compatibility.md'), 'utf8')
    const migration = readFileSync(
      resolve(repoRoot, 'docs/MIGRATING_TO_SPLICE_SUPPORT.md'),
      'utf8',
    )

    expect(readme).toContain('**Canton GA line:** `3.4.x`')
    expect(readme).toContain('**Splice GA line:** `0.5.x`')
    expect(readme).toContain('0.5.17')
    expect(readme).toContain('./docs/compatibility.md')
    expect(readme).toContain('./docs/MIGRATING_TO_SPLICE_SUPPORT.md')

    expect(compatibility).toContain('## Support Matrix')
    expect(compatibility).toContain('Legacy compatibility')
    expect(compatibility).toContain('Experimental')
    expect(compatibility).toContain('createLegacyWalletClient()')
    expect(compatibility).toContain('not recommended for new transfer flows')

    expect(migration).toContain('What Stayed in Core')
    expect(migration).toContain('legacy compatibility only')
    expect(migration).toContain('cantonjs-splice-token-standard')
  })

  it('keeps the release workflow publish allowlist explicit', () => {
    const releaseWorkflow = readFileSync(resolve(repoRoot, '.github/workflows/release.yml'), 'utf8')

    expect(releaseWorkflow).toContain('Keep this publish list explicit')
    expect(releaseWorkflow).toContain('publish-splice-packages:')
    expect(releaseWorkflow).toContain('cd packages/cantonjs-splice-interfaces')
    expect(releaseWorkflow).toContain('cd packages/cantonjs-splice-scan')
    expect(releaseWorkflow).toContain('cd packages/cantonjs-splice-validator')
    expect(releaseWorkflow).toContain('cd packages/cantonjs-splice-token-standard')
    expect(releaseWorkflow).toContain('cd packages/cantonjs-wallet-adapters')
    expect(releaseWorkflow).toContain('npm publish --access public --provenance')
  })
})
