# React dApp

This example demonstrates a Splice-style React application that keeps public Scan reads separate from participant-private ledger reads.

## Setup

```bash
npm install cantonjs cantonjs-react cantonjs-splice-scan react @tanstack/react-query
```

## Network Setup

```tsx
// src/network.ts
import { createLedgerClient, jsonApi, testNet, withChainOverrides } from 'cantonjs'
import { createScanClient } from 'cantonjs-splice-scan'

const chain = withChainOverrides(testNet, {
  participant: {
    jsonApiUrl: import.meta.env.VITE_CANTON_JSON_API_URL,
  },
  scan: {
    url: import.meta.env.VITE_SPLICE_SCAN_URL,
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

export const scanClient = chain.scan.url
  ? createScanClient({ url: chain.scan.url })
  : undefined
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
import { useQuery } from '@tanstack/react-query'
import { useContracts, useParty } from 'cantonjs-react'
import { CreateAssetForm } from './CreateAssetForm'
import { scanClient } from './network'

export function AssetDashboard() {
  const party = useParty()
  const { data: assets, isLoading, error } = useContracts({
    templateId: '#my-pkg:Main:Asset',
  })
  const { data: dsoInfo } = useQuery({
    queryKey: ['scan', 'dso'],
    queryFn: async () => {
      if (!scanClient) {
        throw new Error('Set VITE_SPLICE_SCAN_URL to enable public Scan queries.')
      }
      return await scanClient.getDsoInfo()
    },
    enabled: scanClient !== undefined,
  })

  return (
    <div>
      <h1>Asset Dashboard</h1>
      <p>Acting as: {party}</p>
      <p>Public DSO info: {JSON.stringify(dsoInfo ?? null)}</p>

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

This split is the important part:

- `scanClient.getDsoInfo()` reads public network state from Scan
- `useContracts()` reads party-visible contracts from the participant ledger API
- `useCreateContract()` writes through the participant ledger API

That separation keeps React examples aligned with the package boundaries in this repo.
