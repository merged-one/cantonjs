# GA Vs Experimental

The Splice support in this repo is intentionally split by stability boundary.

Stable imports target Ledger API V2, stable Token Standard interfaces, or documented public/external HTTP APIs. Experimental imports isolate internal, deprecated, legacy, or still-moving surfaces.

## Current Boundary

| Surface | Status | Import | Notes |
| --- | --- | --- | --- |
| Canton Ledger API V2 clients, transports, errors, chains | GA | `cantonjs` | Core repo surface |
| Public Scan client | GA | `cantonjs-splice-scan` | Public Scan endpoints only |
| Internal, deprecated, and pre-alpha Scan routes | Experimental | `cantonjs-splice-scan/experimental` | Pinned to the vendored Splice line |
| Token Standard helpers and stable descriptors | GA | `cantonjs-splice-token-standard`, `cantonjs-splice-interfaces` | Participant-first, ledger-centric |
| Validator ANS external API | GA | `cantonjs-splice-validator` | `createAnsClient()` |
| Filtered public Scan Proxy subset | GA | `cantonjs-splice-validator` | `createScanProxyClient()` only for Scan-backed external routes |
| Legacy wallet-external compatibility | Legacy compatibility | `cantonjs-splice-validator` | `createLegacyWalletClient()`, prefer Token Standard for new flows |
| Validator internal and internal Scan Proxy routes | Experimental | `cantonjs-splice-validator/experimental` | Never root-exported |
| CIP-0103 wallet adapters | Experimental | `cantonjs-wallet-adapters` | Useful boundary adapters, but still an evolving ecosystem |

## Rules

1. Use GA imports when the upstream surface is stable and public.
2. Treat `/experimental` imports as minor-release-breakable unless the docs say otherwise.
3. Prefer Token Standard integrations over older wallet-external transfer flows for new work.
4. Keep validator-private assumptions and operator-specific URLs out of shared presets.

## Import Examples

Stable public Scan:

```ts
import { createScanClient } from 'cantonjs-splice-scan'
```

Explicitly experimental Scan:

```ts
import { createExperimentalScanClient } from 'cantonjs-splice-scan/experimental'
```

Stable validator ANS:

```ts
import { createAnsClient } from 'cantonjs-splice-validator'
```

Explicitly experimental validator internals:

```ts
import { createExperimentalValidatorInternalClient } from 'cantonjs-splice-validator/experimental'
```

## Related Docs

- [ADR 0009](/adr/0009-splice-full-support-architecture)
- [Splice Internal APIs](/experimental/splice-internal-apis)
- [Public Scan](/guide/scan)
- [Validator ANS](/guide/validator-ans)
- [Token Standard](/guide/token-standard)
- [Wallet Adapters](/guide/wallet-adapters)
