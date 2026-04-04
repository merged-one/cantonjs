# Compatibility Policy

This document defines the release-line promise for the current cantonjs package set.

The current package set reflects the ownership prune described in [Migration notes](./MIGRATING_TO_SPLICE_SUPPORT.md): participant-runtime core, optional convenience packages, and selected stable/public Splice add-ons only.

## Pinned Release Lines

- **Canton GA line:** `3.4.x`
- **Splice GA line:** `0.5.x`
- **Vendored Splice artifacts:** `0.5.17`

The core library targets Canton JSON API V2 and gRPC semantics from the Canton `3.4.x` line. The Splice packages are documented and tested against the Splice `0.5.x` line, with OpenAPI and Daml artifacts currently pinned to `0.5.17`.

Anything outside those lines may still work, but it is not part of the compatibility promise until this document and the vendored artifacts are updated.

## Stability Tiers

### GA

GA packages follow the normal semver promise for the pinned release line.

### Experimental

Experimental packages and `/experimental` entrypoints may break in minor releases. They are intentionally outside the GA promise because the upstream surface is internal, deprecated, pre-alpha, or still settling.
The only current experimental import path is `cantonjs-splice-scan/experimental`.

## Support Matrix

| Package | Status | Canton line | Splice line | Notes |
| ------- | ------ | ----------- | ----------- | ----- |
| `cantonjs` | GA | `3.4.x` | N/A | Core Ledger API V2 foundation |
| `cantonjs-codegen` | GA | N/A | N/A | DAR-to-TypeScript codegen, not tied to a specific Splice bundle |
| `cantonjs-react` | GA | `3.4.x` | N/A | Participant-private ledger hooks only |
| `cantonjs-splice-scan` | GA | `3.4.x`-backed Splice deployments | `0.5.x` | Main entrypoint is limited to public Scan semantics; `/experimental` is outside the GA promise |
| `cantonjs-splice-validator` | GA | `3.4.x`-backed Splice deployments | `0.5.x` | GA for ANS external and the filtered Scan Proxy subset only |
| `cantonjs-splice-interfaces` | GA | N/A | `0.5.x` | Generated from the official `0.5.17` Splice release bundle |
| `cantonjs-splice-token-standard` | GA | `3.4.x` | `0.5.x` | Recommended package for new transfer and allocation flows |

## Last pre-prune legacy line

`0.3.1` is the last release line that still carried the removed wallet and validator-overlap surfaces.

Use that line only while migrating older integrations. New work should stay on the current package set: official wallet tooling for connection, `cantonjs` for participant runtime, and Token Standard helpers for new transfer flows.

## Policy Rules

1. A release-line promise exists only for packages listed as GA in the matrix above.
2. Splice package compatibility is pinned to the named `0.5.x` line and the vendored `0.5.17` artifacts in this repo.
3. Experimental imports such as `cantonjs-splice-scan/experimental` may break in minor releases.
4. Older wallet-style or private validator flows are not part of the current package promise. Prefer `cantonjs-splice-token-standard` for new transfer flows.
5. New Canton or Splice release lines are not implicitly supported. The matrix must be updated first.

## Related Docs

- [Migration notes](./MIGRATING_TO_SPLICE_SUPPORT.md)
- [GA vs Experimental guide](./guide/ga-vs-experimental.md)
- [Splice upstream artifacts](./compatibility/splice-upstream-artifacts.md)
- [Splice Daml artifacts](./compatibility/splice-daml-artifacts.md)
