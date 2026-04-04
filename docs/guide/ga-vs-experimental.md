# GA Vs Experimental

The Splice support in this repo is intentionally split by stability boundary.

Stable imports target Ledger API V2, stable Token Standard interfaces, or documented public/external HTTP APIs. Experimental imports are reserved for still-moving surfaces that are explicitly outside the GA promise.
In the current package set, the only experimental import path is `cantonjs-splice-scan/experimental`.

## Current Boundary

| Surface | Status | Import | Notes |
| --- | --- | --- | --- |
| Canton Ledger API V2 clients, transports, errors, chains | GA | `cantonjs` | Core repo surface |
| Public Scan client | GA | `cantonjs-splice-scan` | Public Scan endpoints only |
| Internal, deprecated, and pre-alpha Scan routes | Experimental | `cantonjs-splice-scan/experimental` | Pinned to the vendored Splice line |
| Token Standard helpers and stable descriptors | GA | `cantonjs-splice-token-standard`, `cantonjs-splice-interfaces` | Participant-first, ledger-centric |
| Validator ANS external API | GA | `cantonjs-splice-validator` | Selected stable external Validator support only |
| Filtered public Scan Proxy subset | GA | `cantonjs-splice-validator` | `createScanProxyClient()` only for Scan-backed external routes |

Validator support has no experimental import path in the current line.

## Rules

1. Use GA imports when the upstream surface is stable and public.
2. Treat `/experimental` imports as minor-release-breakable unless the docs say otherwise.
3. Prefer Token Standard integrations over older validator-hosted wallet-style flows for new work.
4. Keep validator-private assumptions and operator-specific URLs out of shared presets.
5. Use the official dApp SDK for provider discovery and connection UX; `cantonjs` starts only after participant connection details already exist.

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

Stable validator Scan Proxy subset:

```ts
import { createScanProxyClient } from 'cantonjs-splice-validator'
```

## Related Docs

- [ADR 0009](/adr/0009-splice-full-support-architecture)
- [Package Architecture](/guide/package-architecture)
- [Public Scan](/guide/scan)
- [Validator ANS](/guide/validator-ans)
- [Token Standard](/guide/token-standard)
