# Wallet Adapters

`cantonjs-wallet-adapters` is the experimental wallet boundary package for this repo.

Use it when you want a thin `cantonjs`-friendly wrapper around CIP-0103-style providers or the official `@canton-network/dapp-sdk` provider access patterns.

Use the official dApp SDK for provider discovery and connection UX. Use `cantonjs-wallet-adapters` only at the edge, after a wallet or provider has already been selected. `cantonjs` consumes wallet/provider output; it does not own wallet-connect responsibilities.

## Install

```bash
npm install cantonjs cantonjs-react cantonjs-wallet-adapters @tanstack/react-query
```

If your app already uses the official SDK for discovery and connection, keep doing that:

```bash
npm install @canton-network/dapp-sdk
```

The responsibility split is explicit:

- the official dApp SDK / dApp API / Wallet Gateway own wallet discovery, connection UX, and wallet-connected responsibilities
- the official Wallet SDK owns wallet-provider and custody-facing responsibilities
- `cantonjs-wallet-adapters` only adapts provider output into a smaller interop layer that `cantonjs` can consume

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

The adapter keeps wallet interop at the edge. `cantonjs` still owns ledger access once the wallet/provider has already exposed the participant URL, token, and active party context:

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

See [Package Architecture](/guide/package-architecture) for the full repo-level split between core, add-ons, adapters, and official wallet interop boundaries.
