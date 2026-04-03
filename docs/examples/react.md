# Participant-Private React App

| Example profile | |
| --- | --- |
| Audience | Participant-private React app teams |
| Data scope | Participant-private |
| Depends on | Participant Ledger API V2 plus party auth |

This example shows a React app that reads and writes participant-private ledger state through `cantonjs-react`.

It does not use public Scan, and it does not own wallet discovery or connection UX. If your app needs public network-visible data, keep it separate and see [Public Scan Dashboard](/examples/public-scan-dashboard). If your app is wallet-connected, start with [Wallet Interop With dApp SDK](/examples/wallet-interop-with-dapp-sdk).

## Setup

```bash
npm install cantonjs cantonjs-react react @tanstack/react-query
```

## Network Setup

```tsx
// src/network.ts
import { createLedgerClient, jsonApi, testNet, withChainOverrides } from 'cantonjs'

const chain = withChainOverrides(testNet, {
  participant: {
    jsonApiUrl: import.meta.env.VITE_CANTON_JSON_API_URL,
  },
})

const participantUrl = chain.participant.jsonApiUrl
if (!participantUrl) {
  throw new Error('Set VITE_CANTON_JSON_API_URL before rendering the app.')
}

export const ledgerClient = createLedgerClient({
  transport: jsonApi({
    url: participantUrl,
    token: import.meta.env.VITE_CANTON_JWT,
  }),
  actAs: import.meta.env.VITE_CANTON_PARTY,
})
```

## App Entry Point

```tsx
// src/App.tsx
import { CantonProvider } from 'cantonjs-react'
import { AssetDashboard } from './AssetDashboard'
import { ledgerClient } from './network'

export function App() {
  return (
    <CantonProvider client={ledgerClient}>
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
        {assets?.map((contract) => (
          <pre key={contract.createdEvent.contractId}>
            {JSON.stringify(contract.createdEvent.createArgument, null, 2)}
          </pre>
        ))}
      </div>
    </div>
  )
}
```

## Create Asset Form

```tsx
// src/CreateAssetForm.tsx
import { useState, type FormEvent } from 'react'
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
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
        onChange={(event) => setValue(event.target.value)}
        required
      />
      <input
        type="text"
        placeholder="Description"
        value={description}
        onChange={(event) => setDescription(event.target.value)}
      />
      <button type="submit" disabled={isPending}>
        {isPending ? 'Creating...' : 'Create Asset'}
      </button>
      {error && <p className="error">{error.message}</p>}
    </form>
  )
}
```

## Public Vs Private Data

This page is intentionally participant-private only:

- `useContracts()` reads party-visible contracts from the participant ledger API
- `useCreateContract()` writes through the participant ledger API
- `CantonProvider` shares the participant-scoped client across the app

If you need public network-visible data such as DSO info, public updates, or public ANS lookups, query it separately with `cantonjs-splice-scan` in [Public Scan Dashboard](/examples/public-scan-dashboard).
