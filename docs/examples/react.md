# React dApp

This example demonstrates a complete React application using `cantonjs-react`.

## Setup

```bash
npm install cantonjs cantonjs-react react @tanstack/react-query
```

## App Entry Point

```tsx
// src/App.tsx
import { CantonProvider } from 'cantonjs-react'
import { createLedgerClient, jsonApi } from 'cantonjs'
import { AssetDashboard } from './AssetDashboard'

const client = createLedgerClient({
  transport: jsonApi({
    url: 'http://localhost:7575',
    token: import.meta.env.VITE_CANTON_JWT,
  }),
  actAs: import.meta.env.VITE_CANTON_PARTY,
})

export function App() {
  return (
    <CantonProvider client={client}>
      <AssetDashboard />
    </CantonProvider>
  )
}
```

## Asset Dashboard

```tsx
// src/AssetDashboard.tsx
import { useContracts, useParty } from 'cantonjs-react'
import { CreateAssetForm } from './CreateAssetForm'
import { AssetCard } from './AssetCard'

export function AssetDashboard() {
  const party = useParty()
  const { data: assets, isLoading, error } = useContracts({
    templateId: '#my-pkg:Main:Asset',
  })

  return (
    <div>
      <h1>Asset Dashboard</h1>
      <p>Acting as: {party}</p>

      <CreateAssetForm />

      {isLoading && <p>Loading assets...</p>}
      {error && <p>Error: {error.message}</p>}

      <div className="asset-grid">
        {assets?.map(contract => (
          <AssetCard
            key={contract.createdEvent.contractId}
            contract={contract}
          />
        ))}
      </div>
    </div>
  )
}
```

## Create Asset Form

```tsx
// src/CreateAssetForm.tsx
import { useState } from 'react'
import { useCreateContract, useParty } from 'cantonjs-react'

export function CreateAssetForm() {
  const party = useParty()
  const [value, setValue] = useState('')
  const [description, setDescription] = useState('')

  const { mutate: create, isPending, error } = useCreateContract({
    templateId: '#my-pkg:Main:Asset',
    onSuccess: () => {
      setValue('')
      setDescription('')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    create({
      createArguments: {
        owner: party,
        value,
        description,
      },
    })
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Create Asset</h2>
      <input
        type="number"
        placeholder="Value"
        value={value}
        onChange={e => setValue(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Description"
        value={description}
        onChange={e => setDescription(e.target.value)}
      />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Asset'}
      </button>
      {error && <p className="error">{error.message}</p>}
    </form>
  )
}
```

## Asset Card with Transfer

```tsx
// src/AssetCard.tsx
import { useState } from 'react'
import { useExercise } from 'cantonjs-react'
import type { ActiveContract } from 'cantonjs-react'

export function AssetCard({ contract }: { contract: ActiveContract }) {
  const [newOwner, setNewOwner] = useState('')
  const { createdEvent } = contract
  const args = createdEvent.createArgument

  const { mutate: exercise, isPending } = useExercise({
    templateId: '#my-pkg:Main:Asset',
    choice: 'Transfer',
  })

  const handleTransfer = () => {
    exercise({
      contractId: createdEvent.contractId,
      choiceArgument: { newOwner },
    })
  }

  return (
    <div className="asset-card">
      <h3>Asset</h3>
      <p>Owner: {String(args.owner)}</p>
      <p>Value: {String(args.value)}</p>
      <p>Description: {String(args.description)}</p>

      <div className="transfer-form">
        <input
          type="text"
          placeholder="New owner party"
          value={newOwner}
          onChange={e => setNewOwner(e.target.value)}
        />
        <button onClick={handleTransfer} disabled={isPending || !newOwner}>
          {isPending ? 'Transferring...' : 'Transfer'}
        </button>
      </div>
    </div>
  )
}
```

## Live Updates

Use `useStreamContracts` for real-time updates:

```tsx
import { useStreamContracts } from 'cantonjs-react'

function LiveAssetCounter() {
  const { contracts, isLoading } = useStreamContracts({
    templateId: '#my-pkg:Main:Asset',
  })

  if (isLoading) return <span>...</span>
  return <span>{contracts.length} active assets</span>
}
```

## Custom QueryClient

Share a `QueryClient` between Canton hooks and other data sources:

```tsx
import { QueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { CantonProvider } from 'cantonjs-react'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10_000,
      refetchOnWindowFocus: true,
    },
  },
})

function App() {
  return (
    <CantonProvider client={client} queryClient={queryClient}>
      <MyDApp />
      <ReactQueryDevtools />
    </CantonProvider>
  )
}
```
