# Wallet Interop With dApp SDK

| Example profile | |
| --- | --- |
| Audience | Wallet-connected app teams that already use the official wallet stack |
| Data scope | Participant-private after connection |
| Depends on | Official dApp SDK plus connected provider output |

This example starts with the official dApp SDK for wallet discovery and connection. `cantonjs` only appears after the provider has already exposed ledger access details.

That boundary matters:

- the official dApp SDK owns wallet discovery and connection UX
- `cantonjs-wallet-adapters` is only a thin interop layer
- `cantonjs` consumes the resulting participant URL, token, and party context

## Setup

```bash
npm install cantonjs cantonjs-react cantonjs-wallet-adapters @canton-network/dapp-sdk @tanstack/react-query react
```

## Connect Through The Official dApp SDK First

```tsx
// src/WalletConnectedApp.tsx
import { useState } from 'react'
import * as dappSDK from '@canton-network/dapp-sdk'
import { CantonProvider, useContracts } from 'cantonjs-react'
import { createLedgerClient, jsonApi, type LedgerClient } from 'cantonjs'
import { createCip103Adapter } from 'cantonjs-wallet-adapters'

export function WalletConnectedApp() {
  const [client, setClient] = useState<LedgerClient | null>(null)

  async function connect() {
    await dappSDK.connect()

    const wallet = createCip103Adapter({
      getConnectedProvider: () => dappSDK.getConnectedProvider(),
    })

    const network = await wallet.getActiveNetwork()
    const [primary] = await wallet.listAccounts()

    if (!primary || !network.ledgerApi || !network.accessToken) {
      throw new Error('Connected provider did not expose ledger access details.')
    }

    setClient(
      createLedgerClient({
        actAs: primary.partyId,
        transport: jsonApi({
          url: network.ledgerApi,
          token: network.accessToken,
        }),
      }),
    )
  }

  if (!client) {
    return <button onClick={() => void connect()}>Connect with official dApp SDK</button>
  }

  return (
    <CantonProvider client={client}>
      <PrivateAssetList />
    </CantonProvider>
  )
}

function PrivateAssetList() {
  const { data, isLoading } = useContracts({
    templateId: '#my-pkg:Main:Asset',
  })

  if (isLoading) {
    return <p>Loading participant-private contracts...</p>
  }

  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
```

## Boundary Summary

This example is wallet-connected, but `cantonjs` still does not own wallet connection:

- `dappSDK.connect()` handles discovery and connection UX
- `createCip103Adapter(...)` adapts the connected provider shape
- `createLedgerClient(...)` starts only after the provider has exposed participant access
- `useContracts()` reads participant-private data once the app has a participant-scoped client

If you need public network-visible data alongside this flow, keep it separate and query it with [Public Scan Dashboard](/examples/public-scan-dashboard).
