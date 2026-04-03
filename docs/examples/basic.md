# Participant Service

| Example profile | |
| --- | --- |
| Audience | Backend and full-stack participant services |
| Data scope | Participant-private |
| Depends on | Participant Ledger API V2 plus party auth |

This is the baseline example for teams building a service that talks directly to a participant. It does not depend on public Scan, wallet discovery, or the official wallet UX stack.

## Create A Service-Facing Client

```typescript
// src/assetService.ts
import { createLedgerClient, jsonApi } from 'cantonjs'

export function createAssetService() {
  const client = createLedgerClient({
    transport: jsonApi({
      url: process.env.CANTON_JSON_API_URL ?? 'http://localhost:7575',
      token: process.env.CANTON_JWT ?? 'your-jwt-token',
    }),
    actAs: process.env.CANTON_PARTY ?? 'Alice::1234',
  })

  return {
    listAssets(signal?: AbortSignal) {
      return client.queryContracts('#my-pkg:Main:Asset', { signal })
    },
    createAsset(input: { owner: string; value: string; description?: string }) {
      return client.createContract('#my-pkg:Main:Asset', input)
    },
    transferAsset(contractId: string, newOwner: string) {
      return client.exerciseChoice(
        '#my-pkg:Main:Asset',
        contractId,
        'Transfer',
        { newOwner },
      )
    },
  }
}
```

## Use It In An Application Service

```typescript
// src/routes/assets.ts
import { createAssetService } from '../assetService.js'

const assets = createAssetService()

const created = await assets.createAsset({
  owner: 'Alice::1234',
  value: '1000',
  description: 'My first Canton asset',
})

const current = await assets.listAssets()
const transferred = await assets.transferAsset(created.contractId, 'Bob::5678')

console.log('created', created.contractId)
console.log('visible assets', current.length)
console.log('transfer update', transferred.updateId)
```

## Handle Multi-Party Access Explicitly

Use separate party-scoped clients when your service works on behalf of multiple parties:

```typescript
import { createLedgerClient, jsonApi } from 'cantonjs'

const sharedTransport = jsonApi({
  url: 'http://localhost:7575',
  token: process.env.CANTON_JWT ?? 'alice-jwt',
})

const alice = createLedgerClient({
  transport: sharedTransport,
  actAs: 'Alice::1234',
})

const bob = createLedgerClient({
  transport: jsonApi({
    url: 'http://localhost:7575',
    token: process.env.BOB_JWT ?? 'bob-jwt',
  }),
  actAs: 'Bob::5678',
})

const aliceAssets = await alice.queryContracts('#my-pkg:Main:Asset')
const bobAssets = await bob.queryContracts('#my-pkg:Main:Asset')
```

## Add Type Safety With Generated Descriptors

```typescript
import { Asset } from './generated/Main.js'

const created = await alice.createContract(Asset.templateId, {
  owner: 'Alice::1234',
  value: '1000',
})

await alice.exerciseChoice(
  Asset.templateId,
  created.contractId,
  Asset.choices.Transfer.name,
  { newOwner: 'Bob::5678' },
)
```

## Keep Requests Cancellable

```typescript
const controller = new AbortController()
setTimeout(() => controller.abort(), 5_000)

try {
  const contracts = await alice.queryContracts('#my-pkg:Main:Asset', {
    signal: controller.signal,
  })
  console.log(contracts.length)
} catch (error) {
  if (error instanceof Error && error.name === 'AbortError') {
    console.log('Query was cancelled')
  }
}
```

If you need public network-visible data instead, move that logic to [Public Scan Dashboard](/examples/public-scan-dashboard). If you need wallet connection, start with [Wallet Interop With dApp SDK](/examples/wallet-interop-with-dapp-sdk).
