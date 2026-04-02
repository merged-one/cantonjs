# cantonjs-react

React hooks for Canton Network dApps, powered by TanStack Query.

## Installation

```bash
npm install cantonjs-react react @tanstack/react-query
```

## Peer Dependencies

| Package | Version |
|---------|---------|
| `react` | ^18.0.0 \|\| ^19.0.0 |
| `@tanstack/react-query` | ^5.0.0 |
| `cantonjs` | ^0.0.1 (optional) |

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

## Cache Invalidation

Mutations automatically invalidate related queries:

- `useCreateContract` invalidates `['canton', 'contracts', templateId]`
- `useExercise` invalidates `['canton', 'contracts', templateId]`

This means `useContracts` queries refresh automatically after mutations complete.
