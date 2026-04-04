# cantonjs-splice-validator

Validator-facing Splice clients layered on top of `cantonjs`.

This package now ships only the GA external-validator surface that fits the repo's app-side story:

- `createAnsClient()` for the published `ans-external` API
- `createScanProxyClient()` for the filtered public subset of `scan-proxy` whose backing Scan semantics are tagged `external` in the vendored Scan spec

## Status

- **GA:** `createAnsClient()` and the filtered `createScanProxyClient()` surface on the Splice `0.5.x` line
- **Vendored upstream inputs:** pinned to `0.5.17`
- **Boundary:** selected stable external Validator support only

## Install

```bash
npm install cantonjs cantonjs-splice-validator
```

## Package Policy

- Generated low-level types are committed in `src/generated/*.types.ts`.
- The public validator surface is limited to `ans-external` plus the filtered Scan Proxy wrapper.
- Proxy operations backed by internal, deprecated, or pre-alpha Scan semantics are intentionally excluded.
- Older wallet-oriented or private validator flows are no longer part of this package.
- The package is documented against the Splice `0.5.x` line, with vendored inputs currently pinned to `0.5.17`.

## Quick Start

```ts
import {
  createAnsClient,
  createScanProxyClient,
} from 'cantonjs-splice-validator'

const ans = createAnsClient({
  url: 'https://example.com/api/validator',
  token: process.env.SPLICE_VALIDATOR_JWT,
})

const scanProxy = createScanProxyClient({
  url: 'https://example.com/api/validator',
  token: process.env.SPLICE_VALIDATOR_JWT,
})

const created = await ans.createAnsEntry({
  name: 'app.unverified.ans',
  url: 'https://app.example.com',
  description: 'Validator app',
})

const entries = await ans.listAnsEntries()
const dso = await scanProxy.getDsoInfo()
const namedEntry = await scanProxy.lookupAnsEntryByName({ name: 'app.ans' })
```

## GA Scan Proxy Surface

`createScanProxyClient()` exposes only the proxy operations whose underlying Scan operations are tagged `external` in the vendored `scan.yaml`:

- `getDsoPartyId`
- `getDsoInfo`
- `getOpenAndIssuingMiningRounds`
- `listAnsEntries`
- `lookupAnsEntryByParty`
- `lookupAnsEntryByName`
- `getHoldingsSummaryAt`
- `listUnclaimedDevelopmentFundCoupons`

Validator-local proxy methods backed by internal Scan semantics, such as featured-app lookups, amulet rules, ANS rules, and transfer-command proxying, are intentionally left out.

## Migration Note

If you still depend on older wallet-oriented Validator routes, stay on the last pre-prune release while you migrate. For new transfer and allocation flows, use Token Standard surfaces instead of older wallet-style APIs.

## License

[Apache-2.0](https://github.com/merged-one/cantonjs/blob/main/LICENSE)
