import path from 'node:path'
import process from 'node:process'
import { pathToFileURL } from 'node:url'
import { fileURLToPath } from 'node:url'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function importBuilt(relativePath) {
  return import(pathToFileURL(path.join(repoRoot, relativePath)).href)
}

async function main() {
  let executedChecks = 0

  if (process.env.CANTON_JSON_API_URL && process.env.CANTON_JWT) {
    const { createLedgerClient, jsonApi } = await importBuilt('dist/esm/index.js')
    const transport = jsonApi({
      url: process.env.CANTON_JSON_API_URL,
      token: process.env.CANTON_JWT,
    })
    const client = createLedgerClient({
      transport,
      actAs: process.env.CANTON_ACT_AS ?? 'Alice::validator',
    })

    await client.getLedgerEnd()
    executedChecks += 1
    console.log(`Participant smoke passed against ${process.env.CANTON_JSON_API_URL}`)
  } else {
    console.log('Skipping participant smoke: set CANTON_JSON_API_URL and CANTON_JWT to enable it.')
  }

  if (process.env.SPLICE_SCAN_URL) {
    const { createScanClient } = await importBuilt('packages/cantonjs-splice-scan/dist/index.js')
    const scan = createScanClient({
      url: process.env.SPLICE_SCAN_URL,
      token: process.env.SPLICE_SCAN_TOKEN,
    })

    await scan.live()
    await scan.getDsoInfo()
    executedChecks += 1
    console.log(`Scan smoke passed against ${process.env.SPLICE_SCAN_URL}`)
  } else {
    console.log('Skipping Scan smoke: set SPLICE_SCAN_URL to enable it.')
  }

  if (process.env.SPLICE_VALIDATOR_URL && process.env.SPLICE_VALIDATOR_TOKEN) {
    const { createScanProxyClient } = await importBuilt(
      'packages/cantonjs-splice-validator/dist/index.js',
    )
    const scanProxy = createScanProxyClient({
      url: process.env.SPLICE_VALIDATOR_URL,
      token: process.env.SPLICE_VALIDATOR_TOKEN,
    })

    await scanProxy.getDsoInfo()
    executedChecks += 1
    console.log(`Validator smoke passed against ${process.env.SPLICE_VALIDATOR_URL}`)
  } else {
    console.log(
      'Skipping validator smoke: set SPLICE_VALIDATOR_URL and SPLICE_VALIDATOR_TOKEN to enable it.',
    )
  }

  if (executedChecks === 0) {
    console.log('No live smoke checks were configured.')
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
