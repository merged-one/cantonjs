# Migration from @daml/ledger

This guide helps you migrate from `@daml/ledger` (Daml SDK) to `cantonjs`.

`@daml/ledger` and `@daml/react` are deprecated for Canton 3.3+ releases. Community-maintained replacements exist as `@c7/ledger` and `@c7/react`, but this guide is specifically for teams moving to `cantonjs`.

## Why Migrate?

| Feature | @daml/ledger | cantonjs |
|---------|-------------|----------|
| API version | JSON API v1 (deprecated) | JSON API V2 |
| Architecture | Class-based | Function exports (tree-shakeable) |
| TypeScript | Weak types | Full type safety + codegen |
| Streaming | Polling only | WebSocket + auto-reconnect |
| Testing | `vi.mock()` | Dependency injection |
| Bundle format | CJS only | ESM + CJS dual |
| React | `@daml/react` (deprecated) | `cantonjs-react` (TanStack Query) |

## Client Creation

### Before (@daml/ledger)

```typescript
import Ledger from '@daml/ledger'

const ledger = new Ledger({
  token: jwtToken,
  httpBaseUrl: 'http://localhost:7575',
})
```

### After (cantonjs)

```typescript
import { createLedgerClient, jsonApi } from 'cantonjs'

const client = createLedgerClient({
  transport: jsonApi({ url: 'http://localhost:7575', token: jwtToken }),
  actAs: 'Alice::1234',
})
```

Key difference: cantonjs separates transport configuration from client creation, and the client is explicitly scoped to a party.

## Creating Contracts

### Before

```typescript
const contract = await ledger.create(Asset, { owner: 'Alice', value: '100' })
```

### After

```typescript
const created = await client.createContract('#my-pkg:Main:Asset', {
  owner: 'Alice',
  value: '100',
})
```

With codegen:

```typescript
import { Asset } from './generated/Main.js'

const created = await client.createContract(Asset.templateId, {
  owner: 'Alice',
  value: '100',
})
```

## Exercising Choices

### Before

```typescript
const result = await ledger.exercise(Asset.Transfer, contractId, { newOwner: 'Bob' })
```

### After

```typescript
const tx = await client.exerciseChoice(
  '#my-pkg:Main:Asset',
  contractId,
  'Transfer',
  { newOwner: 'Bob' },
)
```

## Querying Contracts

### Before

```typescript
const contracts = await ledger.query(Asset)
```

### After

```typescript
const contracts = await client.queryContracts('#my-pkg:Main:Asset')
```

## Streaming

### Before (polling)

```typescript
// @daml/ledger has no streaming — manual polling
setInterval(async () => {
  const contracts = await ledger.query(Asset)
  updateUI(contracts)
}, 5000)
```

### After (WebSocket)

```typescript
import { streamUpdates } from 'cantonjs'

for await (const update of streamUpdates(transport, { beginExclusive: '0' })) {
  // Real-time updates with auto-reconnect
}
```

## React Hooks

### Before (@daml/react)

```tsx
import { useQuery, useLedger } from '@daml/react'
import { Asset } from '@daml.js/my-model'

function AssetList() {
  const assets = useQuery(Asset)
  const ledger = useLedger()

  const handleCreate = () => {
    ledger.create(Asset, { owner: 'Alice', value: '100' })
  }
}
```

### After (cantonjs-react)

```tsx
import { useContracts, useCreateContract } from 'cantonjs-react'

function AssetList() {
  const { data: assets, isLoading } = useContracts({
    templateId: '#my-pkg:Main:Asset',
  })

  const { mutate: create } = useCreateContract({
    templateId: '#my-pkg:Main:Asset',
  })

  const handleCreate = () => {
    create({ createArguments: { owner: 'Alice', value: '100' } })
  }
}
```

Key improvements:
- TanStack Query provides caching, deduplication, and loading states
- Mutations automatically invalidate related queries
- `isPending`, `isError`, `isSuccess` states for free

## Error Handling

### Before

```typescript
try {
  await ledger.create(Asset, payload)
} catch (error) {
  // Generic error — no structured information
  console.log(error.message)
}
```

### After

```typescript
import { CommandRejectedError, TokenExpiredError } from 'cantonjs'

try {
  await client.createContract(templateId, payload)
} catch (error) {
  if (error instanceof TokenExpiredError) {
    // Refresh JWT
  } else if (error instanceof CommandRejectedError) {
    console.log(error.code)         // 'CJ3001'
    console.log(error.metaMessages) // Recovery hints
  }
}
```

## Step-by-Step Migration

1. Install cantonjs: `npm install cantonjs`
2. Replace client creation with `createLedgerClient` + `jsonApi`
3. Update contract operations to use the new method signatures
4. Replace polling with `streamUpdates` for real-time subscriptions
5. If using React, replace deprecated `@daml/react` with `cantonjs-react`
6. Run `cantonjs-codegen` to generate type-safe template definitions
7. Remove deprecated `@daml/ledger`, `@daml/react`, and `@daml.js/*` packages
