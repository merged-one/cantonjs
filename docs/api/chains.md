# Chains API

Pre-defined Canton and Splice-aware network configurations.

## CantonChain Type

```typescript
type CantonChain = {
  readonly id: string
  readonly name: string
  readonly network: 'localnet' | 'devnet' | 'testnet' | 'mainnet'
  readonly participant: {
    readonly jsonApiUrl?: string
    readonly grpcUrl?: string
  }
  readonly scan: {
    readonly url?: string
    readonly discoveryRoot?: string
  }
  readonly validator: {
    readonly apiBaseUrl?: string
    readonly scanProxyBaseUrl?: string
  }
  readonly authAudiences: {
    readonly participant?: string
    readonly scan?: string
    readonly validator?: string
  }
  readonly splice: {
    readonly releaseLine?: string
    readonly resetCycleNote?: string
  }

  readonly jsonApiUrl?: string
  readonly grpcUrl?: string
  readonly scanUrl?: string
  readonly validatorApiUrl?: string
  readonly scanProxyUrl?: string
  readonly resetCycle?: string
}
```

## localNet

Local development network with concrete participant defaults.

```typescript
import { jsonApi } from 'cantonjs'
import { localNet } from 'cantonjs/chains'

const transport = jsonApi({
  url: localNet.participant.jsonApiUrl!,
  token: jwt,
})
```

## devNet

Public dev preset with discovery metadata and release-line hints.

```typescript
import { devNet } from 'cantonjs/chains'

devNet.scan.discoveryRoot
devNet.splice.releaseLine
```

## testNet

Public test preset with discovery metadata and reset guidance.

```typescript
import { testNet } from 'cantonjs/chains'
```

## mainNet

Public main preset without operator-specific participant or validator URLs committed into source.

```typescript
import { mainNet } from 'cantonjs/chains'
```

## Override-Friendly Usage

Use `withChainOverrides()` to layer deployment-specific endpoints on top of the built-ins:

```typescript
import { createLedgerClient, jsonApi } from 'cantonjs'
import { devNet, withChainOverrides } from 'cantonjs/chains'

const chain = withChainOverrides(devNet, {
  participant: {
    jsonApiUrl: import.meta.env.VITE_CANTON_JSON_API_URL,
  },
  scan: {
    url: import.meta.env.VITE_SPLICE_SCAN_URL,
  },
  validator: {
    apiBaseUrl: import.meta.env.VITE_SPLICE_VALIDATOR_URL,
  },
})

const participantUrl = chain.participant.jsonApiUrl
if (!participantUrl) {
  throw new Error('Set VITE_CANTON_JSON_API_URL first.')
}

const client = createLedgerClient({
  transport: jsonApi({ url: participantUrl, token: jwt }),
  actAs: 'Alice::1234',
})
```

## Helper Functions

```typescript
import { defineChainPreset, withChainOverrides } from 'cantonjs/chains'

const custom = defineChainPreset({
  id: 'my-network',
  name: 'My Network',
  network: 'testnet',
  scan: {
    discoveryRoot: 'https://docs.example.com/networks/my-network',
  },
})

const runtime = withChainOverrides(custom, {
  participant: {
    jsonApiUrl: process.env.CANTON_JSON_API_URL,
  },
})
```
