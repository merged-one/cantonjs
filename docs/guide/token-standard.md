# Token Standard

`cantonjs-splice-token-standard` is the participant-first helper layer for stable CIP-0056 interfaces.

It is intentionally participant-first:

- reads go through a `LedgerClient`
- writes go through a `LedgerClient` or participant interactive submission
- stable descriptors come from `cantonjs-splice-interfaces`
- validator-private and wallet-internal endpoints stay out of scope

This package is for Ledger API V2 application code that wants stable token helpers. It is not the package for wallet-provider internals, validator-private transfer flows, or official wallet-connect responsibilities.

## Install

```bash
npm install cantonjs cantonjs-splice-interfaces cantonjs-splice-token-standard
```

## Connect To A Participant

```ts
import { createLedgerClient, jsonApi, mainNet, withChainOverrides } from 'cantonjs'
import { queryHoldingsV1 } from 'cantonjs-splice-token-standard'

const chain = withChainOverrides(mainNet, {
  participant: {
    jsonApiUrl: process.env.CANTON_JSON_API_URL,
  },
})

const participantUrl = chain.participant.jsonApiUrl
if (!participantUrl) {
  throw new Error('Set CANTON_JSON_API_URL for Token Standard ledger access.')
}

const transport = jsonApi({
  url: participantUrl,
  token: process.env.CANTON_JWT!,
})

const client = createLedgerClient({
  transport,
  actAs: 'Alice::validator',
})

const holdings = await queryHoldingsV1(client)
```

`queryHoldingsV1(client)` is a participant-private read. Public Scan summaries are separate and should stay on the Scan client side of your app.

## Accept A Transfer Instruction

```ts
import {
  EMPTY_EXTRA_ARGS,
  acceptTransferInstructionV1,
  parseTokenStandardHistoryFromTransactionV1,
} from 'cantonjs-splice-token-standard'

const tx = await acceptTransferInstructionV1(client, {
  instructionContractId: 'transfer-instruction-cid',
  choiceArgument: {
    extraArgs: EMPTY_EXTRA_ARGS,
  },
})

const history = parseTokenStandardHistoryFromTransactionV1(tx)
console.log(history)
```

## Prepare And Execute An External-Party Submission

For external-party flows, use participant interactive submission instead of validator-private HTTP endpoints:

```ts
import {
  EMPTY_EXTRA_ARGS,
  executePreparedTokenSubmission,
  prepareTransferViaFactoryV1,
} from 'cantonjs-splice-token-standard'

const prepared = await prepareTransferViaFactoryV1(
  {
    transport,
    actAs: 'Alice::validator',
  },
  {
    factoryContractId: 'transfer-factory-cid',
    choiceArgument: {
      expectedAdmin: 'Issuer::admin',
      transfer: {
        sender: 'Alice::validator',
        receiver: 'Bob::validator',
        amount: '10.0000000000',
        instrumentId: {
          admin: 'Issuer::issuer',
          id: 'USD',
        },
        requestedAt: '2026-04-02T12:00:00Z',
        executeBefore: '2026-04-02T12:05:00Z',
        inputHoldingCids: holdings.map((holding) => holding.createdEvent.contractId),
        meta: { values: {} },
      },
      extraArgs: EMPTY_EXTRA_ARGS,
    },
  },
)

const executed = await executePreparedTokenSubmission(
  { transport },
  prepared.preparedTransaction,
  [
    {
      party: 'Alice::validator',
      signatures: [
        {
          format: 'RAW',
          signature: 'base64-signature',
          signedBy: 'key-1',
        },
      ],
    },
  ],
)

console.log(executed.updateId)
```

## Descriptor Layer

`cantonjs-splice-interfaces` exposes the stable descriptors and generated types that back these helpers:

```ts
import {
  HoldingV1,
  TransferInstructionV1,
  type InferChoiceArgs,
  type InferView,
} from 'cantonjs-splice-interfaces'

type HoldingView = InferView<typeof HoldingV1>
type AcceptArgs = InferChoiceArgs<typeof TransferInstructionV1, 'TransferInstruction_Accept'>
```

See [Package Architecture](/guide/package-architecture) for how Token Standard helpers relate to the core SDK, stable interfaces package, public Scan, and selected validator support.
