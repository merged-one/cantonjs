# Wallet Adapters

`cantonjs-wallet-adapters` is the experimental wallet boundary package for this repo.

Use it when you want a small `cantonjs`-friendly wrapper around CIP-0103-style providers or the official `@canton-network/dapp-sdk` provider access patterns. Do not use it as a replacement for wallet discovery, custody, or the official SDK's connection UX.

## Install

```bash
npm install cantonjs cantonjs-react cantonjs-wallet-adapters @tanstack/react-query
```

If your app already uses the official SDK for discovery and connection, keep doing that:

```bash
npm install @canton-network/dapp-sdk
```

## Connect A Raw Provider

```ts
import { createCip103Adapter, requireWindowCantonProvider } from 'cantonjs-wallet-adapters'

const wallet = createCip103Adapter(requireWindowCantonProvider())

await wallet.connect()

const network = await wallet.getActiveNetwork()
const accounts = await wallet.listAccounts()

console.log(network.networkId)
console.log(accounts.map((account) => account.partyId))
```

## Bridge Wallet Access Into `cantonjs`

The adapter keeps wallet interop at the edge. `cantonjs` still owns ledger access:

```ts
import { createLedgerClient, jsonApi } from 'cantonjs'
import { createCip103Adapter, requireWindowCantonProvider } from 'cantonjs-wallet-adapters'

const wallet = createCip103Adapter(requireWindowCantonProvider())
await wallet.connect()

const network = await wallet.getActiveNetwork()
const [primary] = await wallet.listAccounts()

if (!primary || !network.ledgerApi || !network.accessToken) {
  throw new Error('Wallet did not expose ledgerApi and accessToken for Ledger API access.')
}

const client = createLedgerClient({
  actAs: primary.partyId,
  transport: jsonApi({
    url: network.ledgerApi,
    token: network.accessToken,
  }),
})
```

## React Example

```tsx
import { useState } from 'react'
import { CantonProvider, useContracts } from 'cantonjs-react'
import { createLedgerClient, jsonApi, type LedgerClient } from 'cantonjs'
import { createCip103Adapter, requireWindowCantonProvider } from 'cantonjs-wallet-adapters'

export function WalletConnectedApp() {
  const [client, setClient] = useState<LedgerClient | null>(null)

  async function connect() {
    const wallet = createCip103Adapter(requireWindowCantonProvider())
    await wallet.connect()

    const network = await wallet.getActiveNetwork()
    const [primary] = await wallet.listAccounts()

    if (!primary || !network.ledgerApi || !network.accessToken) {
      throw new Error('Wallet did not expose ledger access.')
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
    return <button onClick={() => void connect()}>Connect Canton wallet</button>
  }

  return (
    <CantonProvider client={client}>
      <PrivateAssetList />
    </CantonProvider>
  )
}

function PrivateAssetList() {
  const { data } = useContracts({
    templateId: '#my-pkg:Main:Asset',
  })

  return <pre>{JSON.stringify(data, null, 2)}</pre>
}
```

## With `@canton-network/dapp-sdk`

```ts
import * as dappSDK from '@canton-network/dapp-sdk'
import { createCip103Adapter } from 'cantonjs-wallet-adapters'

await dappSDK.connect()

const wallet = createCip103Adapter({
  getConnectedProvider: () => dappSDK.getConnectedProvider(),
})

const activeNetwork = await wallet.getActiveNetwork()
console.log(activeNetwork.networkId)
```
