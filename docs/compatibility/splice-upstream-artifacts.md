# Splice Upstream Artifacts

This repo vendors official raw Splice OpenAPI specs pinned to a release tag.
The current package set derives a narrow set of GA and experimental wrappers from those artifacts and keeps the remaining specs only for provenance, classification, and future review.

- Upstream repository: `hyperledger-labs/splice`
- Resolved tag: `0.5.17`
- Release line: `0.5`
- Manifest: `vendor/splice/manifest.json`
- Checksums: `vendor/splice/0.5.17/openapi/SHA256SUMS`

The vendored sources come directly from `raw.githubusercontent.com` at the resolved tag. Rendered HTML docs were not used for artifact sync.

## Classification

| File | Upstream signal | cantonjs classification | Client-generation policy |
| --- | --- | --- | --- |
| `scan.yaml` | The raw spec declares `external`, `internal`, `deprecated`, and `pre-alpha` tags in one file. | `mixed inventory` | Source inventory for `cantonjs-splice-scan`. The GA entrypoint exposes the public subset; `cantonjs-splice-scan/experimental` keeps the internal, deprecated, and pre-alpha routes behind an explicit instability fence. |
| `scan-proxy.yaml` | Validator-local `scan-proxy` endpoints with no explicit `external` marker in the raw file. | `filtered external subset` | Source inventory for the filtered `createScanProxyClient()` GA surface. Only routes whose backing Scan semantics resolve to the external/public boundary stay in the current package set. |
| `ans-external.yaml` | The raw filename is `ans-external.yaml` and operations use `external.ans`. | `external` | Source inventory for the GA `createAnsClient()` surface in `cantonjs-splice-validator`. |
| `wallet-external.yaml` | The raw filename is `wallet-external.yaml` and operations use `external.wallet`. | `legacy` | Vendored for provenance only. The current package set does not publish a client for these wallet-oriented routes. |
| `validator-internal.yaml` | The raw filename is `validator-internal.yaml`. | `internal/provenance` | Vendored for provenance only. The current package set does not export a client or subpath for validator-internal routes. |

## Policy

- `external` means the upstream raw artifact maps cleanly to a stable, documented boundary in the current package set.
- `filtered external subset` means the raw artifact mixes proxy mechanics with public data semantics, so only the externally justified subset is exposed.
- `mixed inventory` means one raw artifact contains both GA and non-GA operations, and the package surface splits those concerns explicitly.
- `legacy` means the artifact is official but is no longer part of the current repo-owned package story.
- `internal/provenance` means the artifact is vendored only so the repo can pin, classify, and review it without promising a client surface.

This document complements [ADR 0009](../adr/0009-splice-full-support-architecture.md) and the pinned provenance in `vendor/splice/manifest.json`.
