# cantonjs-splice-token-standard

Ledger-centric CIP-0056 helpers for `cantonjs`, built on stable Splice interface package IDs from `cantonjs-splice-interfaces`.

This package is for app-side ledger integration:

- query active token-standard contracts through the Ledger API
- execute factory and non-factory interface choices through the Ledger API
- parse ledger transactions into stable token-standard history items
- prepare and execute participant interactive submissions for external-party flows

It intentionally does **not** depend on `validator-internal`, wallet-internal endpoints, or validator-private template names.

## Status

- **Stability:** GA
- **Supported Canton line:** `3.4.x`
- **Supported Splice line:** `0.5.x`
- **Recommended for:** new transfer and allocation flows built on the stable Token Standard path

## Install

```bash
npm install cantonjs cantonjs-splice-interfaces cantonjs-splice-token-standard
```

## When To Use This Package

Use `cantonjs-splice-token-standard` when your app already talks to a Canton participant or validator Ledger API and you want stable, versioned helpers around the official Token Standard interfaces.

Use the official wallet SDK instead when you need wallet-provider stacks, browser wallet UX, richer wallet workflows, end-user session/auth orchestration, or other wallet-managed flows that sit above raw ledger integration.

For new transfer flows, prefer this package over legacy `wallet-external` transfer-offer APIs.

## Package Policy

- Reads and writes go through `cantonjs` Ledger API helpers or injected `Transport`s only.
- Stable helper names are versioned around Token Standard V1 interface package IDs such as `TransferFactoryV1` and `HoldingV1`.
- External-party flows use participant interactive submission (`/v2/interactive-submission/*`), not validator-private endpoints.
- The package does not invent registry or validator HTTP endpoints beyond the official ledger APIs.

## Quick Start

```ts
import { createLedgerClient, jsonApi } from 'cantonjs'
import {
  EMPTY_EXTRA_ARGS,
  acceptTransferInstructionV1,
  executePreparedTokenSubmission,
  prepareTransferViaFactoryV1,
  queryHoldingsV1,
} from 'cantonjs-splice-token-standard'

const transport = jsonApi({
  url: 'https://participant.example.com',
  token: process.env.CANTON_JWT!,
})

const client = createLedgerClient({
  transport,
  actAs: 'Alice::validator',
})

const holdings = await queryHoldingsV1(client)

const prepared = await prepareTransferViaFactoryV1(
  { transport, actAs: 'Alice::validator' },
  {
    factoryContractId: 'factory-cid',
    choiceArgument: {
      expectedAdmin: 'Validator::admin',
      transfer: {
        sender: 'Alice::validator',
        receiver: 'Bob::validator',
        amount: '10.0000000000',
        instrumentId: { admin: 'Issuer::issuer', id: 'USD' },
        requestedAt: '2026-04-02T12:00:00Z',
        executeBefore: '2026-04-02T12:05:00Z',
        inputHoldingCids: holdings.map((holding) => holding.createdEvent.contractId),
        meta: { values: {} },
      },
      extraArgs: EMPTY_EXTRA_ARGS,
    },
  },
)

const tx = await executePreparedTokenSubmission(
  { transport },
  prepared.preparedTransaction,
  [
    {
      party: 'Alice::validator',
      signatures: [{ format: 'RAW', signature: 'base64-signature', signedBy: 'key-1' }],
    },
  ],
)

await acceptTransferInstructionV1(client, {
  instructionContractId: 'transfer-instruction-cid',
  choiceArgument: { extraArgs: EMPTY_EXTRA_ARGS },
})
```

## Export Surface

- Query helpers: `queryHoldingsV1`, `queryMetadataContractsV1`, `queryTransferInstructionsV1`, `queryTransferFactoriesV1`, `queryAllocationsV1`, `queryAllocationRequestsV1`, `queryAllocationInstructionsV1`, `queryAllocationFactoriesV1`
- History helpers: `parseTokenStandardHistoryFromTransactionV1`, `parseTokenStandardHistoryFromUpdatesV1`
- Command helpers: `transferViaFactoryV1`, `prepareTransferViaFactoryV1`, `acceptTransferInstructionV1`, `allocateViaFactoryV1`, `prepareAllocationViaFactoryV1`, `executeAllocationV1`, and the generic `submitTokenStandardChoice` / `prepareTokenStandardChoice`

## License

[Apache-2.0](https://github.com/merged-one/cantonjs/blob/main/LICENSE)
