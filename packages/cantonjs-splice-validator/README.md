# cantonjs-splice-validator

Validator-facing Splice clients layered on top of `cantonjs`.

This package ships three surfaces:

- `createAnsClient()` for the GA `ans-external` API.
- `createScanProxyClient()` for a carefully filtered GA subset of `scan-proxy` whose underlying Scan semantics are tagged `external` in the vendored Scan spec.
- `createLegacyWalletClient()` for `wallet-external` compatibility flows that remain useful for existing transfer-offer and buy-traffic integrations.

`validator-internal` is intentionally excluded from this package.

## Install

```bash
npm install cantonjs cantonjs-splice-validator
```

## Package Policy

- Generated low-level types are committed in `src/generated/*.types.ts`.
- The GA validator surface is limited to ANS external plus the filtered Scan Proxy wrapper.
- Proxy operations backed by internal, deprecated, or pre-alpha Scan semantics are intentionally excluded from the main client.
- `legacyWallet` is a legacy compatibility surface. For new transfer flows, prefer Token Standard integrations instead of `wallet-external`.

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

## Legacy Wallet Compatibility

`createLegacyWalletClient()` is a legacy/deprecated-oriented compatibility wrapper for `wallet-external`, especially the transfer-offer flow that predates Token Standard-first integration.

Use a clearly named `legacyWallet` client so the callsites stay obviously separate from the GA validator surface:

```ts
import { createLegacyWalletClient } from 'cantonjs-splice-validator'

const legacyWallet = createLegacyWalletClient({
  url: 'https://example.com/api/validator',
  token: process.env.SPLICE_VALIDATOR_JWT,
})

const offer = await legacyWallet.createTransferOffer({
  receiver_party_id: 'Receiver::validator',
  amount: '10.0',
  description: 'Legacy transfer offer',
  expires_at: 1_780_000_000_000_000,
  tracking_id: 'offer-123',
})

const status = await legacyWallet.lookupTransferOfferStatus({
  tracking_id: 'offer-123',
})
```

For new transfer flows, prefer Token Standard surfaces. Reach for `legacyWallet` only when you need compatibility with existing `wallet-external` workflows.

## License

[Apache-2.0](https://github.com/merged-one/cantonjs/blob/main/LICENSE)
