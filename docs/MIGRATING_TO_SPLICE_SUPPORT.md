# Migrating to the Pruned Splice Package Set

This note is for existing `cantonjs` users moving from the last legacy line onto the current post-prune package set introduced in `0.4.0`.

## Breaking changes introduced in `0.4.0`

`0.3.1` is the last pre-prune legacy line.

The `0.4.0` release removes repo-owned surfaces that blurred ownership with the official wallet stack or private/legacy validator routes:

- the `cantonjs-wallet-adapters` package
- `createLegacyWalletClient()` and its `LegacyWallet*` types from `cantonjs-splice-validator`
- the `cantonjs-splice-validator/experimental` subpath and its experimental validator clients/types

What stays:

- `cantonjs` as the participant-runtime core
- `cantonjs-react` and `cantonjs-codegen` as optional convenience packages
- `cantonjs-splice-scan`, `cantonjs-splice-validator`, `cantonjs-splice-interfaces`, and `cantonjs-splice-token-standard` as the supported Splice add-ons

## What Stayed in Core

If your app only talks to a Canton participant through Ledger API V2, there is no migration required.

These imports stay in `cantonjs`:

- `createLedgerClient()`, `createAdminClient()`, `createTestClient()`
- `jsonApi()`, `grpc()`, `fallback()`
- `streamUpdates()`, `streamContracts()`, `streamCompletions()`
- `localNet`, `devNet`, `testNet`, `mainNet`, `withChainOverrides()`
- `CantonjsError` and the CJ error hierarchy
- codegen runtime helpers such as `TemplateDescriptor`

`cantonjs-react` also stays focused on participant-private ledger state. Public Scan reads are still better handled with direct query hooks around `cantonjs-splice-scan`.

## Current Package Map

| Need | Package | Status |
| ---- | ------- | ------ |
| Public Scan reads | `cantonjs-splice-scan` | GA |
| Validator ANS and GA Scan Proxy reads | `cantonjs-splice-validator` | GA |
| Stable Splice interface descriptors and generated types | `cantonjs-splice-interfaces` | GA |
| Token Standard transfer and allocation helpers | `cantonjs-splice-token-standard` | GA |

The removed wallet and validator-overlap surfaces do not move to a replacement package inside this repo.

## Common Migration Paths

### Apps With Custom Public Scan Fetches

Replace handwritten Scan HTTP calls with `cantonjs-splice-scan`:

```ts
import { createScanClient } from 'cantonjs-splice-scan'

const scan = createScanClient({ url: process.env.SPLICE_SCAN_URL! })
const info = await scan.getDsoInfo()
```

### Apps Using Validator ANS Or Public Scan Proxy Reads

Keep that code on `cantonjs-splice-validator`:

```ts
import { createAnsClient, createScanProxyClient } from 'cantonjs-splice-validator'
```

The supported validator surface is now intentionally small: ANS plus the filtered Scan Proxy subset whose backing Scan semantics are public/external on the vendored Splice line.

### Apps Building New Transfer Flows

Use `cantonjs-splice-interfaces` plus `cantonjs-splice-token-standard`.

That keeps new work on the GA token-standard path instead of older wallet-style transfer-offer APIs:

```ts
import { queryHoldingsV1, prepareTransferViaFactoryV1 } from 'cantonjs-splice-token-standard'
```

### Apps Still On `createLegacyWalletClient()`

`createLegacyWalletClient()` is removed from the current package set.

- Stay on `0.3.1` only while you preserve the existing integration.
- Do not start new work on older wallet-style Validator flows.
- Migrate new transfer and allocation work toward `cantonjs-splice-token-standard`.
- If you must preserve older upstream routes during migration, treat them as upstream compatibility work rather than part of the current `cantonjs` contract.

### Apps That Used `cantonjs-wallet-adapters`

`cantonjs-wallet-adapters` is removed from the current package set.

- Use the official dApp SDK / dApp API / Wallet Gateway for wallet discovery and connection UX.
- Use the official Wallet SDK for wallet-provider, custody, exchange, or other provider-facing integrations.
- Keep `cantonjs` on the participant-runtime side only, after official tooling has already yielded participant connection details.

## Manual Wallet Hand-Off Pattern

After official wallet tooling has connected the user, obtain the participant URL, token, and active party from the connected provider, then build `createLedgerClient(...)` directly:

```ts
import * as dappSDK from '@canton-network/dapp-sdk'
import { createLedgerClient, jsonApi } from 'cantonjs'

type ConnectedProvider = {
  request(args: { method: string; params?: unknown }): Promise<unknown>
}

type WalletNetwork = {
  readonly ledgerApi?: string
  readonly accessToken?: string
}

type WalletAccount = {
  readonly partyId: string
}

async function callProvider<T>(
  provider: ConnectedProvider,
  method: string,
  params?: unknown,
): Promise<T> {
  const result = await provider.request(
    params === undefined ? { method } : { method, params },
  )
  return result as T
}

await dappSDK.connect()

const provider = dappSDK.getConnectedProvider()
if (!provider) {
  throw new Error('Official dApp SDK did not return a connected provider.')
}

const network = await callProvider<WalletNetwork>(provider, 'getActiveNetwork')
const [primary] = await callProvider<readonly WalletAccount[]>(provider, 'listAccounts')

if (!primary || !network.ledgerApi || !network.accessToken) {
  throw new Error('Connected provider did not expose participant connection details.')
}

const client = createLedgerClient({
  actAs: primary.partyId,
  transport: jsonApi({
    url: network.ledgerApi,
    token: network.accessToken,
  }),
})
```

If your official wallet tooling exposes those same values through a different helper, map them into `createLedgerClient(...)` the same way.

## Canonical Tool Boundaries Still Matter

- Use DPM for Daml project lifecycle work.
- Use Quickstart for the official full-stack onboarding and reference-app path.
- Use the official dApp SDK / dApp API / Wallet Gateway for wallet discovery, connection UX, wallet-backed auth, and wallet-connected responsibilities.
- Use the official Wallet SDK for wallet-provider, custody, exchange, or other provider-facing integrations.
- Use `cantonjs` after participant access already exists, or after those official wallet tools have already yielded the participant connection details your app needs.

## Compatibility Summary

- GA Canton line: `3.4.x`
- GA Splice line: `0.5.x`
- Vendored Splice artifacts in this repo: `0.5.17`
- `0.3.1` is the last release line with the removed wallet and validator-overlap surfaces

See [compatibility.md](./compatibility.md) for the support matrix and release-line policy. The repo-root `CHANGELOG.md` carries the release-note summary of this ownership prune.
