# Validator ANS

`cantonjs-splice-validator` covers the GA validator-facing surfaces in this repo:

- `createAnsClient()` for `ans-external`
- `createScanProxyClient()` for the filtered public subset of `scan-proxy`

`validator-internal` stays behind the experimental subpath and is documented separately in the [GA vs Experimental guide](/guide/ga-vs-experimental).

## Install

```bash
npm install cantonjs cantonjs-splice-validator
```

## Configure Per Deployment

Validator URLs are deployment-specific. The built-in presets do not assume all networks expose the same validator or proxy origin.

```ts
import { testNet, withChainOverrides } from 'cantonjs/chains'
import { createAnsClient, createScanProxyClient } from 'cantonjs-splice-validator'

const chain = withChainOverrides(testNet, {
  validator: {
    apiBaseUrl: process.env.SPLICE_VALIDATOR_URL,
    scanProxyBaseUrl: process.env.SPLICE_SCAN_PROXY_URL,
  },
})

const validatorUrl = chain.validator.apiBaseUrl
if (!validatorUrl) {
  throw new Error('Set SPLICE_VALIDATOR_URL for ANS writes.')
}

const scanProxyUrl = chain.validator.scanProxyBaseUrl ?? validatorUrl

const ans = createAnsClient({
  url: validatorUrl,
  token: process.env.SPLICE_VALIDATOR_JWT!,
})

const scanProxy = createScanProxyClient({
  url: scanProxyUrl,
  token: process.env.SPLICE_VALIDATOR_JWT!,
})
```

If your operator publishes Scan Proxy on a distinct host, override `scanProxyBaseUrl` with that base origin. Do not commit a full operator-specific endpoint path into the shared preset.

## Create And List ANS Entries

```ts
const created = await ans.createAnsEntry({
  name: 'wallet.unverified.ans',
  url: 'https://wallet.example.com',
  description: 'Wallet entry',
})

const entries = await ans.listAnsEntries()

console.log(created)
console.log(entries)
```

## Resolve Public ANS Data Through Scan Proxy

Use Scan Proxy for public lookups that your validator exposes locally:

```ts
const dso = await scanProxy.getDsoInfo()
const byName = await scanProxy.lookupAnsEntryByName({ name: 'wallet.unverified.ans' })
const byParty = await scanProxy.lookupAnsEntryByParty({ party: 'Alice::validator' })
const listed = await scanProxy.listAnsEntries({})

console.log(dso)
console.log(byName)
console.log(byParty)
console.log(listed)
```

For new app flows, keep ANS and public Scan Proxy reads distinct from legacy `wallet-external` compatibility flows. Reach for `createLegacyWalletClient()` only when you must interoperate with older transfer-offer integrations.
