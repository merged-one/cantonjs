# Official Wallet Hand-Off

| Example profile | |
| --- | --- |
| Audience | Wallet-connected app teams that already use the official wallet stack |
| Data scope | Participant-private after connection |
| Depends on | Official dApp SDK plus connected provider output |

This example starts with the official dApp SDK for wallet discovery and connection. `cantonjs` only appears after the connected provider has already exposed the participant URL, token, and active party context.

That boundary matters:

- the official dApp SDK owns wallet discovery and connection UX
- the connected provider remains the source of truth for wallet state
- `cantonjs` starts only after your app can map that provider output into `createLedgerClient(...)`

## Setup

```bash
npm install cantonjs cantonjs-react @canton-network/dapp-sdk @tanstack/react-query react
```

## Connect Through The Official dApp SDK First

```tsx
// src/WalletConnectedApp.tsx
import { useState } from 'react'
import * as dappSDK from '@canton-network/dapp-sdk'
import { CantonProvider, useContracts } from 'cantonjs-react'
import { createLedgerClient, jsonApi, type LedgerClient } from 'cantonjs'

type ConnectedProvider = {
  request(args: { method: string; params?: unknown }): Promise<unknown>
}

type WalletNetwork = {
  readonly networkId: string
  readonly ledgerApi?: string
  readonly accessToken?: string
}

type WalletAccount = {
  readonly partyId: string
}

async function callProvider<T>(
  provider: ConnectedProvider,
  method: string,
  params?: unknown,
): Promise<T> {
  const result = await provider.request(
    params === undefined ? { method } : { method, params },
  )
  return result as T
}

export function WalletConnectedApp() {
  const [client, setClient] = useState<LedgerClient | null>(null)

  async function connect() {
    await dappSDK.connect()

    const provider = dappSDK.getConnectedProvider()
    if (!provider) {
      throw new Error('Official dApp SDK did not return a connected provider.')
    }

    const network = await callProvider<WalletNetwork>(provider, 'getActiveNetwork')
    const [primary] = await callProvider<readonly WalletAccount[]>(provider, 'listAccounts')

    if (!primary || !network.ledgerApi || !network.accessToken) {
      throw new Error('Connected provider did not expose participant connection details.')
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

If your official wallet tooling exposes the same data through a different helper, map those values into `createLedgerClient(...)` the same way.

## Boundary Summary

This example is wallet-connected, but `cantonjs` still does not own wallet connection:

- `dappSDK.connect()` handles discovery and connection UX
- the connected provider stays the source of truth for wallet state
- `createLedgerClient(...)` starts only after the provider has exposed participant access
- `useContracts()` reads participant-private data once the app has a participant-scoped client

If you need public network-visible data alongside this flow, keep it separate and query it with [Public Scan Dashboard](/examples/public-scan-dashboard).
