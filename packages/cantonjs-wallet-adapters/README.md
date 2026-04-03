# cantonjs-wallet-adapters

Experimental wallet and dApp interop adapters for `cantonjs`.

This package is intentionally narrow: it wraps official CIP-0103-style providers and official `@canton-network/dapp-sdk` provider shapes so `cantonjs` consumers can interoperate with the wallet ecosystem without reimplementing a wallet gateway, custody layer, signer backend, or provider stack.

> [!WARNING]
> `cantonjs-wallet-adapters` is experimental. The API may change in minor releases while the upstream wallet ecosystem continues to settle.

## Status

- **Stability:** Experimental
- **Intended ecosystem:** current Canton `3.4.x` / Splice `0.5.x` era wallet-provider interop
- **Support promise:** best-effort only until the CIP-0103 boundary and wallet SDK surface settle further

## Install

```bash
npm install cantonjs-wallet-adapters
```

If you already use the official SDK, it remains the source of truth for wallet discovery and connection UX:

```bash
npm install @canton-network/dapp-sdk
```

## Package Scope

- Adapts raw CIP-0103 providers such as `window.canton`
- Adapts official SDK provider access patterns such as `dappClient.getProvider()` and `dappSDK.getConnectedProvider()`
- Passes through provider-driven actions like `connect`, `disconnect`, `getActiveNetwork`, `prepareExecute`, `prepareExecuteAndWait`, and `signMessage`

It does not:

- discover wallets for you
- implement a wallet gateway
- manage signing providers
- issue or custody keys
- replace `@canton-network/dapp-sdk`
- define the recommended path for new token transfer flows, which should stay on Token Standard helpers

## Quick Start

```ts
import { createCip103Adapter, requireWindowCantonProvider } from 'cantonjs-wallet-adapters'

const wallet = createCip103Adapter(requireWindowCantonProvider())

await wallet.connect()

const network = await wallet.getActiveNetwork()
const accounts = await wallet.listAccounts()

const stop = wallet.onAccountsChanged((nextAccounts) => {
  console.log('accounts changed', nextAccounts)
})

await wallet.signMessage({ message: 'hello canton' })

stop()
await wallet.disconnect()
```

## With `@canton-network/dapp-sdk`

Use the official SDK for discovery and connection. Then adapt its provider for a smaller cantonjs-facing surface:

```ts
import * as dappSDK from '@canton-network/dapp-sdk'
import { createCip103Adapter } from 'cantonjs-wallet-adapters'

await dappSDK.connect()

const wallet = createCip103Adapter({
  getConnectedProvider: () => dappSDK.getConnectedProvider(),
})

const network = await wallet.getActiveNetwork()
```

If you work with a `DappClient`, structural typing also works:

```ts
import { DappClient } from '@canton-network/dapp-sdk'
import { createCip103Adapter } from 'cantonjs-wallet-adapters'

const dappClient = new DappClient(provider)
const wallet = createCip103Adapter(dappClient)
```

## Bridging Into `cantonjs`

The adapter keeps wallet interop at the boundary. `cantonjs` still owns ledger access:

```ts
import { createLedgerClient, jsonApi } from 'cantonjs'
import { createCip103Adapter, requireWindowCantonProvider } from 'cantonjs-wallet-adapters'

const wallet = createCip103Adapter(requireWindowCantonProvider())
await wallet.connect()

const network = await wallet.getActiveNetwork()
const [primary] = await wallet.listAccounts()

if (!network.ledgerApi || !network.accessToken) {
  throw new Error('Wallet did not expose ledgerApi and accessToken for Canton Ledger API access.')
}

const client = createLedgerClient({
  actAs: primary.partyId,
  transport: jsonApi({
    url: network.ledgerApi,
    token: network.accessToken,
  }),
})
```

## API

`createCip103Adapter(source)` returns a small object with:

- `connect()`
- `disconnect()`
- `status()`
- `getActiveNetwork()`
- `listAccounts()`
- `prepareExecute(params)`
- `prepareExecuteAndWait(params)`
- `signMessage(params)`
- `ledgerApi(params)`
- `onStatusChanged(listener)`
- `onAccountsChanged(listener)`
- `onTxChanged(listener)`
- `getProvider()`

Each `on*` method returns an unsubscribe function.

## Browser Helpers

- `getWindowCantonProvider(target?)` returns `window.canton` when present
- `requireWindowCantonProvider(target?)` throws if no CIP-0103 provider is present

These helpers only read the injected provider. They do not install one.

## License

[Apache-2.0](https://github.com/merged-one/cantonjs/blob/main/LICENSE)
