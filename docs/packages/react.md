# cantonjs-react

Participant-private React hooks for Canton ledger applications, powered by TanStack Query.

Use this package only once your React app already has participant access. If that access comes from the official wallet stack, construct `createLedgerClient(...)` first and then pass it into `CantonProvider`.

## Installation

```bash
npm install cantonjs-react react @tanstack/react-query
```

## Peer Dependencies

| Package | Version |
|---------|---------|
| `react` | ^18.0.0 \|\| ^19.0.0 |
| `@tanstack/react-query` | ^5.0.0 |
| `cantonjs` | ^0.3.1 (optional) |

## Hooks

| Hook | Type | Description |
|------|------|-------------|
| `useCantonClient()` | Context | Access the LedgerClient |
| `useParty()` | Context | Get the `actAs` party |
| `useContracts(options)` | Query | Query active contracts |
| `useCreateContract(options)` | Mutation | Create a contract |
| `useExercise(options)` | Mutation | Exercise a choice |
| `useStreamContracts(options)` | Stream | Polling-based live updates |

## Quick Start

```tsx
import { CantonProvider, useContracts, useCreateContract } from 'cantonjs-react'
import { createLedgerClient, jsonApi } from 'cantonjs'

const client = createLedgerClient({
  transport: jsonApi({ url: 'http://localhost:7575', token: jwt }),
  actAs: 'Alice::1234',
})

function App() {
  return (
    <CantonProvider client={client}>
      <AssetList />
    </CantonProvider>
  )
}

function AssetList() {
  const { data: assets, isLoading } = useContracts({
    templateId: '#my-pkg:Main:Asset',
  })

  const { mutate: create } = useCreateContract({
    templateId: '#my-pkg:Main:Asset',
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <button onClick={() => create({ createArguments: { owner: 'Alice', value: 100 } })}>
        Create
      </button>
      <ul>
        {assets?.map(c => (
          <li key={c.createdEvent.contractId}>
            {JSON.stringify(c.createdEvent.createArgument)}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

## Architecture

See [ADR 0008: React Integration](/adr/0008-react-integration) and the [React Hooks guide](/guide/react) for detailed documentation.

For Splice apps, keep public Scan reads outside the provider layer and query them separately with `cantonjs-splice-scan`. See [Public Scan](/guide/scan), the [Participant-Private React App example](/examples/react), and the [Public Scan Dashboard example](/examples/public-scan-dashboard).

## Cache Invalidation

Mutations automatically invalidate related queries:

- `useCreateContract` invalidates `['canton', 'contracts', templateId]`
- `useExercise` invalidates `['canton', 'contracts', templateId]`

This means `useContracts` queries refresh automatically after mutations complete.
