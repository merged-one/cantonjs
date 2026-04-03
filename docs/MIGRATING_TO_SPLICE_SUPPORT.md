# Migrating to Splice Support

This note is for existing `cantonjs` users aligning to the current package set and the positioning reset that now documents the repo around explicit package boundaries.

## Positioning Reset In `0.3.x`

This branch is a docs-first positioning reset, not a runtime API expansion.

- `cantonjs` is now explicitly framed as the application-side TypeScript SDK for direct participant Ledger API V2 work.
- The package story is now explicit: core SDK, optional convenience packages, add-ons for selected stable/public Splice surfaces, and thin adapters for official wallet interop.
- Wallet adapters remain experimental.
- Selected stable/public Splice surfaces are supported; internal validator routes, wallet-internal flows, and other private operator APIs are still outside the main GA story.
- DPM, Quickstart, the official dApp SDK / dApp API / Wallet Gateway, and the official Wallet SDK remain canonical for their own boundaries.
- `CIP-0103` is the canonical prose name used throughout the docs.

## What Did Not Change

No runtime API names changed as part of this positioning reset.

If your existing imports still point at the same packages and entrypoints, there is usually no code migration to do. What changed is the repo mental model, package-boundary guidance, examples, and release-note language.

## What Changed

- `cantonjs` stays focused on generic Canton Ledger API V2 concerns: ledger/admin/test clients, transports, chains, streaming, errors, and codegen runtime types.
- Splice-specific APIs now live in add-on packages instead of the core entrypoint.
- GA, legacy compatibility, and experimental boundaries are now explicit at the package and subpath level.

## Current Package Tiers

| Tier | Packages | Notes |
| ---- | -------- | ----- |
| Core | `cantonjs` | App-side participant Ledger API V2 SDK |
| Optional convenience | `cantonjs-react`, `cantonjs-codegen` | Participant-private React state and DAR-to-TypeScript convenience |
| Add-ons | `cantonjs-splice-scan`, `cantonjs-splice-validator`, `cantonjs-splice-interfaces`, `cantonjs-splice-token-standard` | Selected stable/public Splice surfaces only |
| Adapters | `cantonjs-wallet-adapters` | Experimental edge interop with official wallet/provider flows |

## What Stayed in Core

If your app only talks to a Canton participant through Ledger API V2, there is no migration required.

These imports stay in `cantonjs`:

- `createLedgerClient()`, `createAdminClient()`, `createTestClient()`
- `jsonApi()`, `grpc()`, `fallback()`
- `streamUpdates()`, `streamContracts()`, `streamCompletions()`
- `localNet`, `devNet`, `testNet`, `mainNet`, `withChainOverrides()`
- `CantonjsError` and the CJ error hierarchy
- Codegen runtime helpers such as `TemplateDescriptor`

`cantonjs-react` also stays focused on participant-private ledger state. Public Scan reads are still better handled with direct query hooks around `cantonjs-splice-scan`.

## New Package Map

| Need | Package | Status |
| ---- | ------- | ------ |
| Public Scan reads | `cantonjs-splice-scan` | GA |
| Validator ANS and GA Scan Proxy reads | `cantonjs-splice-validator` | GA |
| Stable Splice interface descriptors and generated types | `cantonjs-splice-interfaces` | GA |
| Token Standard transfer and allocation helpers | `cantonjs-splice-token-standard` | GA |
| CIP-0103 wallet boundary adapters | `cantonjs-wallet-adapters` | Experimental |

These packages are not intended to make `cantonjs` the umbrella SDK for every validator, wallet, or operator surface. They describe the supported app-side boundary for this repo.

## Common Migration Paths

### Ledger-only apps

No change. Keep using `cantonjs` and optionally `cantonjs-react`.

### Apps with custom public Scan fetches

Replace handwritten Scan HTTP calls with `cantonjs-splice-scan`:

```ts
import { createScanClient } from 'cantonjs-splice-scan'

const scan = createScanClient({ url: process.env.SPLICE_SCAN_URL! })
const info = await scan.getDsoInfo()
```

### Apps using validator ANS or public Scan Proxy reads

Move that code to `cantonjs-splice-validator`:

```ts
import { createAnsClient, createScanProxyClient } from 'cantonjs-splice-validator'
```

The GA validator surface is intentionally small: ANS plus the filtered Scan Proxy subset whose backing Scan semantics are public/external on the vendored Splice line.

### Apps building new transfer flows

Use `cantonjs-splice-interfaces` plus `cantonjs-splice-token-standard`.

That keeps new work on the GA token-standard path instead of older wallet transfer-offer APIs:

```ts
import { queryHoldingsV1, prepareTransferViaFactoryV1 } from 'cantonjs-splice-token-standard'
```

### Apps already using `wallet-external` transfer offers

Those flows remain available through `createLegacyWalletClient()` in `cantonjs-splice-validator`, but they are legacy compatibility only.

- Keep them only when you need to preserve an existing transfer-offer or buy-traffic integration.
- Do not start new transfer flows on `wallet-external`.
- For new work, migrate toward Token Standard helpers in `cantonjs-splice-token-standard`.

### Apps experimenting with wallet-provider interop

Use `cantonjs-wallet-adapters`, but treat it as experimental:

```ts
import { createCip103Adapter } from 'cantonjs-wallet-adapters'
```

The adapter package is intentionally outside the GA promise while the CIP-0103 ecosystem continues to settle.

## Canonical Tool Boundaries Still Matter

- Use DPM for Daml project lifecycle work.
- Use Quickstart for the official full-stack onboarding and reference-app path.
- Use the official dApp SDK / dApp API / Wallet Gateway for wallet discovery, connection UX, wallet-backed auth, and wallet-connected responsibilities.
- Use the official Wallet SDK for wallet-provider, custody, exchange, or other provider-facing integrations.
- Use `cantonjs` after participant access already exists, or after those official wallet tools have already yielded connected provider output that your app can consume.

## Compatibility Summary

- GA Canton line: `3.4.x`
- GA Splice line: `0.5.x`
- Vendored Splice artifacts in this repo: `0.5.17`
- Experimental imports may break in minor releases

See [compatibility.md](./compatibility.md) for the support matrix and release-line policy. The repo-root `CHANGELOG.md` carries the release-note summary of the positioning reset.
