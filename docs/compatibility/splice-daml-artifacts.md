# Splice Daml Artifact Compatibility

This repo vendors the first stable Splice Daml interface set from the official `0.5.17` Splice node release bundle:

- Release bundle: <https://github.com/digital-asset/decentralized-canton-sync/releases/download/v0.5.17/0.5.17_splice-node.tar.gz>
- Release notes: <https://hyperledger-labs.github.io/splice/release_notes.html>
- Token Standard docs: <https://docs.global.canton.network.sync.global/app_dev/token_standard/index.html>

The ingestion pipeline is reproducible:

```bash
node scripts/import-splice-dars.mjs --tag 0.5.17
```

That command:

1. Downloads the official Splice release bundle.
2. Extracts the selected DARs unchanged into `vendor/splice/0.5.17/daml/`.
3. Records provenance and checksums in `vendor/splice/0.5.17/daml/manifest.json`.
4. Generates `packages/cantonjs-splice-interfaces/src/generated/*` and `packages/cantonjs-splice-interfaces/src/descriptors/*` from the embedded Daml sources in those DARs.

## Vendored DARs

| Artifact | Vendored path | Stable module |
| --- | --- | --- |
| `splice-api-token-metadata-v1-1.0.0.dar` | `vendor/splice/0.5.17/daml/splice-api-token-metadata-v1-1.0.0.dar` | `Splice.Api.Token.MetadataV1` |
| `splice-api-token-holding-v1-1.0.0.dar` | `vendor/splice/0.5.17/daml/splice-api-token-holding-v1-1.0.0.dar` | `Splice.Api.Token.HoldingV1` |
| `splice-api-token-transfer-instruction-v1-1.0.0.dar` | `vendor/splice/0.5.17/daml/splice-api-token-transfer-instruction-v1-1.0.0.dar` | `Splice.Api.Token.TransferInstructionV1` |
| `splice-api-token-allocation-v1-1.0.0.dar` | `vendor/splice/0.5.17/daml/splice-api-token-allocation-v1-1.0.0.dar` | `Splice.Api.Token.AllocationV1` |
| `splice-api-token-allocation-request-v1-1.0.0.dar` | `vendor/splice/0.5.17/daml/splice-api-token-allocation-request-v1-1.0.0.dar` | `Splice.Api.Token.AllocationRequestV1` |
| `splice-api-token-allocation-instruction-v1-1.0.0.dar` | `vendor/splice/0.5.17/daml/splice-api-token-allocation-instruction-v1-1.0.0.dar` | `Splice.Api.Token.AllocationInstructionV1` |
| `splice-api-featured-app-v2-1.0.0.dar` | `vendor/splice/0.5.17/daml/splice-api-featured-app-v2-1.0.0.dar` | `Splice.Api.FeaturedAppRightV2` |
| `splice-util-featured-app-proxies-1.2.2.dar` | `vendor/splice/0.5.17/daml/splice-util-featured-app-proxies-1.2.2.dar` | `Splice.Util.FeaturedApp.WalletUserProxy` |

## Current Limits

- `WalletUserProxy` depends on `FeaturedAppRightV1` types that are present as compiled DALF dependencies inside the official DAR but are not exposed as separate vendored source DAR artifacts in the `0.5.17` release bundle.
- To avoid fabricating those dependency shapes, the generated `WalletUserProxy` module leaves `AppRewardBeneficiary` and `FeaturedAppRight_CreateActivityMarkerResult` typed as `unknown`.
- The stable runtime descriptor metadata for `WalletUserProxy` is still complete: package coordinates, module name, template id, and choice names are sourced from the official DAR.

## Source of Truth

- The detailed per-artifact checksums, package ids, and extracted source entry paths live in `vendor/splice/0.5.17/daml/manifest.json`.
- `packages/cantonjs-splice-interfaces` is generated output and should be refreshed only through `scripts/import-splice-dars.mjs`.
