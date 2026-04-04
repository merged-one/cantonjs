# React Hooks

`cantonjs-react` provides TanStack Query-powered React hooks for participant-private Canton ledger state.

It is an optional convenience package around the participant Ledger API V2 core. Use it when your React app already has participant access and you want queries, mutations, and live updates on private ledger state. For public Splice data, use `cantonjs-splice-scan`. For wallet discovery and connection UX, use the official dApp SDK, then hand participant connection details into `createLedgerClient(...)`.

## Installation

```bash
npm install cantonjs-react react @tanstack/react-query
```

## Setup

Wrap your app with `CantonProvider`:

```tsx
import { CantonProvider } from 'cantonjs-react'
import { createLedgerClient, jsonApi } from 'cantonjs'

const client = createLedgerClient({
  transport: jsonApi({ url: 'http://localhost:7575', token: jwt }),
  actAs: 'Alice::1234',
})

function App() {
  return (
    <CantonProvider client={client}>
      <PrivateApp />
    </CantonProvider>
  )
}
```

You can optionally pass a custom `QueryClient`:

```tsx
import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000 } },
})

<CantonProvider client={client} queryClient={queryClient}>
```

## useContracts

Query active contracts with automatic caching and deduplication:

```tsx
import { useContracts } from 'cantonjs-react'

function AssetList() {
  const { data: contracts, isLoading, error } = useContracts({
    templateId: '#my-pkg:Main:Asset',
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {contracts?.map(c => (
        <li key={c.createdEvent.contractId}>
          {JSON.stringify(c.createdEvent.createArgument)}
        </li>
      ))}
    </ul>
  )
}
```

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `templateId` | `string` | — | Template ID to query |
| `enabled` | `boolean` | `true` | Whether to enable the query |
| `refetchInterval` | `number` | — | Auto-refetch interval in ms |

## useCreateContract

Mutation hook for creating contracts:

```tsx
import { useCreateContract } from 'cantonjs-react'

function CreateAsset() {
  const { mutate: create, isPending } = useCreateContract({
    templateId: '#my-pkg:Main:Asset',
    onSuccess: (event) => console.log('Created:', event.contractId),
  })

  return (
    <button
      disabled={isPending}
      onClick={() => create({
        createArguments: { owner: 'Alice', value: 100 },
      })}
    >
      Create Asset
    </button>
  )
}
```

Automatically invalidates contract queries for the same template on success.

## useExercise

Mutation hook for exercising choices:

```tsx
import { useExercise } from 'cantonjs-react'

function TransferButton({ contractId }: { contractId: string }) {
  const { mutate: exercise, isPending } = useExercise({
    templateId: '#my-pkg:Main:Asset',
    choice: 'Transfer',
  })

  return (
    <button
      disabled={isPending}
      onClick={() => exercise({
        contractId,
        choiceArgument: { newOwner: 'Bob' },
      })}
    >
      Transfer
    </button>
  )
}
```

## useStreamContracts

Polling-based live contract updates:

```tsx
import { useStreamContracts } from 'cantonjs-react'

function LiveAssets() {
  const { contracts, isLoading, error } = useStreamContracts({
    templateId: '#my-pkg:Main:Asset',
  })

  if (isLoading) return <div>Loading...</div>
  if (error) return <div>Error: {error.message}</div>

  return (
    <ul>
      {contracts.map(c => (
        <li key={c.createdEvent.contractId}>
          {JSON.stringify(c.createdEvent.createArgument)}
        </li>
      ))}
    </ul>
  )
}
```

Polls every 5 seconds. Disable with `enabled: false`.

## useCantonClient

Access the `LedgerClient` directly for advanced use cases:

```tsx
import { useCantonClient } from 'cantonjs-react'

function CustomComponent() {
  const client = useCantonClient()
  // Use client directly for operations not covered by hooks
}
```

## useParty

Get the current party identity:

```tsx
import { useParty } from 'cantonjs-react'

function PartyBadge() {
  const party = useParty()
  return <span>Acting as: {party}</span>
}
```

## Splice Public Data

Keep `cantonjs-react` focused on participant-private ledger state. For public Splice data such as DSO info, public updates, or public ANS lookups, use TanStack Query directly with `cantonjs-splice-scan`.

See:

- [Package Architecture](/guide/package-architecture)
- [Public Scan](/guide/scan)
- [Participant-Private React App Example](/examples/react)
- [Public Scan Dashboard Example](/examples/public-scan-dashboard)
- [Official Wallet Hand-Off Example](/examples/wallet-interop-with-dapp-sdk)

## Cache Invalidation

Mutation hooks (`useCreateContract`, `useExercise`) automatically invalidate contract queries for the same template ID on success. This means `useContracts` queries refresh automatically after mutations.

Query key pattern: `['canton', 'contracts', templateId, actAs]`
