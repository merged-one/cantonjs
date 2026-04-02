# Splice Upstream Artifacts

This repo vendors only official raw Splice OpenAPI specs pinned to a release tag. No runtime clients are generated in this milestone.

- Upstream repository: `hyperledger-labs/splice`
- Resolved tag: `0.5.17`
- Release line: `0.5`
- Manifest: `vendor/splice/manifest.json`
- Checksums: `vendor/splice/0.5.17/openapi/SHA256SUMS`

The vendored sources come directly from `raw.githubusercontent.com` at the resolved tag. Rendered HTML docs were not used for artifact sync.

## Classification

| File | Upstream signal | cantonjs classification | Client-generation policy |
| --- | --- | --- | --- |
| `scan.yaml` | The raw spec declares `external`, `internal`, `deprecated`, and `pre-alpha` tags in one file. | `legacy` | Keep as provenance and source inventory only. Do not generate a stable client from the monolithic file until a filtering/splitting step exists. |
| `scan-proxy.yaml` | Validator-local `scan-proxy` endpoints with no explicit `external` marker in the raw file. | `legacy` | Treat as a compatibility proxy, not a first-wave GA client target. This classification is an inference from the raw spec's proxy role and overlap with Scan data. |
| `ans-external.yaml` | The raw filename is `ans-external.yaml` and operations use `external.ans`. | `external` | Eligible for future stable client generation once typed coverage and compatibility tests exist. |
| `wallet-external.yaml` | The raw filename is `wallet-external.yaml` and operations use `external.wallet`. | `legacy` | Official public artifact, but cantonjs treats these wallet transfer-offer workflows as legacy relative to token-standard-first support. |
| `validator-internal.yaml` | The raw filename is `validator-internal.yaml`. | `internal/experimental` | Vendored for provenance only. No stable client generation; assume no backward-compatibility guarantee. |

## Policy

- `external` means the upstream raw artifact is treated as the candidate stable boundary and is expected to remain backward-compatible.
- `legacy` means the artifact is official and may still be public, but cantonjs will not treat it as the primary GA integration target.
- `internal/experimental` means no compatibility guarantee; any future use must stay behind explicit experimental APIs.

This document complements [ADR 0009](../adr/0009-splice-full-support-architecture.md) and the pinned provenance in `vendor/splice/manifest.json`.
