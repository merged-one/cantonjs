# cantonjs-react

React hooks for Canton Network dApps, powered by [TanStack Query](https://tanstack.com/query).

[![npm version](https://img.shields.io/npm/v/cantonjs-react.svg)](https://www.npmjs.com/package/cantonjs-react)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](https://github.com/merged-one/cantonjs/blob/main/LICENSE)

## Install

```bash
npm install cantonjs cantonjs-react @tanstack/react-query
```

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

  const { mutate: create, isPending } = useCreateContract({
    templateId: '#my-pkg:Main:Asset',
  })

  if (isLoading) return <div>Loading...</div>

  return (
    <div>
      <button
        disabled={isPending}
        onClick={() => create({ createArguments: { owner: 'Alice', value: 100 } })}
      >
        Create Asset
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

## Hooks

### `useContracts(options)`

Query active contracts with automatic caching and deduplication.

```tsx
const { data, isLoading, error } = useContracts({
  templateId: '#my-pkg:Main:Asset',
  enabled: true,           // optional, default true
  refetchInterval: 5000,   // optional, auto-refetch in ms
})
```

### `useCreateContract(options)`

Mutation hook for creating contracts. Automatically invalidates related queries on success.

```tsx
const { mutate: create, isPending, error } = useCreateContract({
  templateId: '#my-pkg:Main:Asset',
  onSuccess: (event) => console.log('Created:', event.contractId),
})

create({ createArguments: { owner: 'Alice', value: 100 } })
```

### `useExercise(options)`

Mutation hook for exercising choices. Automatically invalidates related queries on success.

```tsx
const { mutate: exercise, isPending } = useExercise({
  templateId: '#my-pkg:Main:Asset',
  choice: 'Transfer',
})

exercise({
  contractId: 'contract-id',
  choiceArgument: { newOwner: 'Bob' },
})
```

### `useStreamContracts(options)`

Polling-based live contract updates (5-second interval).

```tsx
const { contracts, isLoading, error } = useStreamContracts({
  templateId: '#my-pkg:Main:Asset',
  enabled: true,  // optional
})
```

### `useCantonClient()`

Access the `LedgerClient` directly for advanced use cases.

```tsx
const client = useCantonClient()
```

### `useParty()`

Get the current `actAs` party identity.

```tsx
const party = useParty()
// 'Alice::1234'
```

## Provider

Wrap your app with `CantonProvider`. Optionally pass a custom `QueryClient`:

```tsx
import { QueryClient } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 10_000 } },
})

<CantonProvider client={ledgerClient} queryClient={queryClient}>
  <App />
</CantonProvider>
```

## Cache Invalidation

Mutations automatically invalidate contract queries for the same template:

- `useCreateContract` invalidates `['canton', 'contracts', templateId]`
- `useExercise` invalidates `['canton', 'contracts', templateId]`

This means `useContracts` queries refresh automatically after mutations complete.

## Peer Dependencies

| Package | Version |
|---------|---------|
| `react` | ^18.0.0 \|\| ^19.0.0 |
| `@tanstack/react-query` | ^5.0.0 |

## Requirements

- Node.js >= 18
- React 18 or 19

## Related

- [cantonjs](https://github.com/merged-one/cantonjs) &mdash; Core TypeScript library for Canton
- [cantonjs-codegen](https://github.com/merged-one/cantonjs/tree/main/packages/cantonjs-codegen) &mdash; DAR-to-TypeScript code generation

## License

[Apache-2.0](https://github.com/merged-one/cantonjs/blob/main/LICENSE)
