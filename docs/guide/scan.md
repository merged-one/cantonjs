# Public Scan

`cantonjs-splice-scan` is the public, network-wide read surface for Splice deployments.

Use it for public DSO metadata, update history, ANS lookups, and similar network data. Do not use it for party-private contract state. Private ledger reads still go through a participant `LedgerClient`.

## Install

```bash
npm install cantonjs cantonjs-splice-scan
```

## Resolve A Concrete Scan URL

Built-in public presets intentionally keep discovery metadata in source control and leave operator URLs override-friendly:

```ts
import { devNet, withChainOverrides } from 'cantonjs/chains'
import { createScanClient } from 'cantonjs-splice-scan'

const chain = withChainOverrides(devNet, {
  scan: {
    url: process.env.SPLICE_SCAN_URL,
  },
})

const scanUrl = chain.scan.url
if (!scanUrl) {
  throw new Error(`Resolve a concrete Scan URL from ${chain.scan.discoveryRoot} first.`)
}

const scan = createScanClient({ url: scanUrl })
```

`chain.scan.discoveryRoot`, `chain.authAudiences.scan`, and `chain.splice.releaseLine` are hints for runtime configuration. They are not guarantees that every operator exposes the same endpoint layout.

## Read Public Network Data

```ts
const dso = await scan.getDsoInfo()
const updates = await scan.getUpdates({ page_size: 25 })
const ansEntries = await scan.listAnsEntries({})

console.log(dso)
console.log(updates)
console.log(ansEntries)
```

For long-running pagination, use `iterateUpdates()`:

```ts
for await (const update of scan.iterateUpdates({ page_size: 100 })) {
  console.log(update.update_id, update.record_time)
}
```

## Public Scan Vs Private Ledger Reads

Public Scan data is network-visible. Party-scoped ledger data is not.

```ts
import { createLedgerClient, jsonApi } from 'cantonjs'

const participantChain = withChainOverrides(devNet, {
  participant: {
    jsonApiUrl: process.env.CANTON_JSON_API_URL,
  },
})

const participantUrl = participantChain.participant.jsonApiUrl
if (!participantUrl) {
  throw new Error('Set CANTON_JSON_API_URL for participant-private reads.')
}

const ledger = createLedgerClient({
  transport: jsonApi({
    url: participantUrl,
    token: process.env.CANTON_JWT!,
  }),
  actAs: 'Alice::validator',
})

const privateContracts = await ledger.queryContracts('#pkg:Module:PrivateTemplate')
```

`scan.getHoldingsSummaryAt(...)` returns public aggregate state. `ledger.queryContracts(...)` returns party-visible contracts from the participant ledger API. Keep those concerns separate in app code and docs.
