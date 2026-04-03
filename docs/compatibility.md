# Compatibility Policy

This document defines the release-line promise for the current cantonjs package set.

The current positioning reset changes how the repo explains package boundaries and target users. It does not rename runtime APIs. For the story and migration framing behind that reset, see [Migration notes](./MIGRATING_TO_SPLICE_SUPPORT.md).

## Pinned Release Lines

- **Canton GA line:** `3.4.x`
- **Splice GA line:** `0.5.x`
- **Vendored Splice artifacts:** `0.5.17`

The core library targets Canton JSON API V2 and gRPC semantics from the Canton `3.4.x` line. The Splice packages are documented and tested against the Splice `0.5.x` line, with OpenAPI and Daml artifacts currently pinned to `0.5.17`.

Anything outside those lines may still work, but it is not part of the compatibility promise until this document and the vendored artifacts are updated.

## Stability Tiers

### GA

GA packages follow the normal semver promise for the pinned release line. Bug-fix and additive changes are expected to remain backward-compatible inside the active `0.3.x` line.

### Legacy Compatibility

Legacy compatibility APIs remain supported so existing integrations keep working, but they are not the recommended starting point for new projects and may receive a narrower scope of future enhancements.

### Experimental

Experimental packages and `/experimental` entrypoints may break in minor releases. They are intentionally outside the GA promise because the upstream surface is internal, deprecated, pre-alpha, or still settling.

## Support Matrix

| Package | Status | Canton line | Splice line | Notes |
| ------- | ------ | ----------- | ----------- | ----- |
| `cantonjs` | GA | `3.4.x` | N/A | Core Ledger API V2 foundation |
| `cantonjs-codegen` | GA | N/A | N/A | DAR-to-TypeScript codegen, not tied to a specific Splice bundle |
| `cantonjs-react` | GA | `3.4.x` | N/A | Participant-private ledger hooks only |
| `cantonjs-splice-scan` | GA | `3.4.x`-backed Splice deployments | `0.5.x` | Main entrypoint is limited to public Scan semantics; `/experimental` is outside the GA promise |
| `cantonjs-splice-validator` | GA + legacy compatibility | `3.4.x`-backed Splice deployments | `0.5.x` | GA for ANS external and the filtered Scan Proxy subset; `createLegacyWalletClient()` is legacy compatibility only |
| `cantonjs-splice-interfaces` | GA | N/A | `0.5.x` | Generated from the official `0.5.17` Splice release bundle |
| `cantonjs-splice-token-standard` | GA | `3.4.x` | `0.5.x` | Recommended package for new transfer and allocation flows |
| `cantonjs-wallet-adapters` | Experimental | `3.4.x`-era wallet ecosystems | `0.5.x` ecosystem | Useful for boundary interop, but not yet a GA compatibility promise |

## Policy Rules

1. A release-line promise exists only for packages listed as GA in the matrix above.
2. Splice package compatibility is pinned to the named `0.5.x` line and the vendored `0.5.17` artifacts in this repo.
3. Experimental imports such as `cantonjs-splice-scan/experimental` and `cantonjs-splice-validator/experimental` may break in minor releases.
4. Legacy wallet APIs remain available for compatibility, but they are not recommended for new transfer flows. Prefer `cantonjs-splice-token-standard`.
5. New Canton or Splice release lines are not implicitly supported. The matrix must be updated first.

## Related Docs

- [Migration notes](./MIGRATING_TO_SPLICE_SUPPORT.md)
- [GA vs Experimental guide](./guide/ga-vs-experimental.md)
- [Splice upstream artifacts](./compatibility/splice-upstream-artifacts.md)
- [Splice Daml artifacts](./compatibility/splice-daml-artifacts.md)
