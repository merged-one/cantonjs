# Chains API

Pre-defined Canton network configurations.

## CantonChain Type

```typescript
type CantonChain = {
  readonly id: string
  readonly name: string
  readonly url: string
}
```

## localNet

Local development network.

```typescript
import { localNet } from 'cantonjs'

// { id: 'local', name: 'Local Development', url: 'http://localhost:7575' }
const transport = jsonApi({ url: localNet.url, token: jwt })
```

## devNet

Canton development network.

```typescript
import { devNet } from 'cantonjs'
```

## testNet

Canton test network.

```typescript
import { testNet } from 'cantonjs'
```

## mainNet

Canton main network.

```typescript
import { mainNet } from 'cantonjs'
```

## Usage with Clients

```typescript
import { createLedgerClient, jsonApi, localNet } from 'cantonjs'

const client = createLedgerClient({
  transport: jsonApi({ url: localNet.url, token: jwt }),
  actAs: 'Alice::1234',
})
```
