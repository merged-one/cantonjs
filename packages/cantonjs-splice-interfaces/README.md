# cantonjs-splice-interfaces

Stable Splice Daml interface descriptors and generated TypeScript types for `cantonjs`.

This package vendors official DARs from a Splice release bundle, extracts the embedded official Daml sources, and generates a stable TypeScript surface for the first Splice batch:

- Token Standard V1 interfaces
- FeaturedAppRightV2 interfaces
- Wallet user proxy utilities from `splice-util-featured-app-proxies`

## Install

```bash
npm install cantonjs cantonjs-splice-interfaces
```

## Usage

```ts
import {
  TransferInstructionV1,
  WalletUserProxy,
  type InferChoiceArgs,
  type InferView,
} from 'cantonjs-splice-interfaces'

type TransferView = InferView<typeof TransferInstructionV1>
type AcceptArgs = InferChoiceArgs<typeof TransferInstructionV1, 'TransferInstruction_Accept'>
```

The package exports two layers:

- Stable descriptor constants such as `HoldingV1`, `TransferInstructionV1`, `TransferFactoryV1`, `FeaturedAppRightV2`, and `WalletUserProxy`
- Namespaced generated modules such as `HoldingV1Types` and `WalletUserProxyTypes`

## Provenance

The current vendored artifacts come from the official Splice `0.5.17` release bundle documented in the public Splice docs and recorded under:

- `vendor/splice/0.5.17/daml/manifest.json`
- `docs/compatibility/splice-daml-artifacts.md`

To refresh the vendored DARs and regenerated outputs:

```bash
node scripts/import-splice-dars.mjs --tag 0.5.17
```

## Package Policy

- Only official DARs extracted from official Splice release bundles are allowed.
- Generated code in `src/generated/` is not hand-edited.
- Stable descriptors in `src/descriptors/` are generated from the same vendored DAR sources and package metadata.

## Current Limits

- `WalletUserProxy` depends on `FeaturedAppRightV1` types that are compiled into the official DAR dependency set but not exposed as a separate vendored source DAR in the `0.5.17` bundle.
- To avoid inventing those missing dependency shapes, `WalletUserProxyTypes` currently leaves `AppRewardBeneficiary` and `FeaturedAppRight_CreateActivityMarkerResult` as `unknown`.
- The runtime descriptor metadata for `WalletUserProxy` remains complete and comes from the official DAR.

## License

[Apache-2.0](https://github.com/merged-one/cantonjs/blob/main/LICENSE)
