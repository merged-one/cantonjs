# Why cantonjs?

## The Problem

The existing `@daml/ledger` library has several limitations:

- **Targets deprecated JSON API v1** — not compatible with Canton's modern V2 API
- **Class-based architecture** — poor tree-shaking, large bundle sizes
- **Weak TypeScript types** — `Record<string, unknown>` everywhere
- **No streaming support** — polling only, no WebSocket subscriptions
- **Monolithic package** — imports everything even when you need one function

## The cantonjs Approach

cantonjs draws inspiration from [viem](https://viem.sh/) (Ethereum's modern TypeScript library) and applies the same principles to Canton:

### Function Exports, Not Classes

```typescript
// cantonjs — tree-shakeable
import { createLedgerClient } from 'cantonjs'
const client = createLedgerClient({ transport, actAs: 'Alice::1234' })

// @daml/ledger — not tree-shakeable
import Ledger from '@daml/ledger'
const ledger = new Ledger({ token, httpBaseUrl })
```

### Dependency Injection

All I/O flows through the `Transport` interface. No hidden `fetch()` calls. Tests use mock transports instead of `vi.mock()`:

```typescript
const transport = jsonApi({ url: 'http://localhost:7575', token: jwt })
const client = createLedgerClient({ transport, actAs: 'Alice::1234' })
```

### Real-Time Streaming

AsyncIterator-based WebSocket streams with auto-reconnect:

```typescript
for await (const update of streamUpdates(transport, { beginExclusive: '0' })) {
  // Process updates — auto-reconnects on disconnect
}
```

### Structured Errors

Every error has a code, recovery hints, and a traversable cause chain:

```typescript
import { CantonjsError } from 'cantonjs'

try {
  await client.createContract(templateId, args)
} catch (error) {
  if (error instanceof CantonjsError) {
    console.log(error.code)         // 'CJ3001'
    console.log(error.metaMessages) // ['Check template ID format']
    console.log(error.docsPath)     // '/errors/CJ3001'
  }
}
```

### Type-Safe Codegen

Generate TypeScript types from your Daml models:

```bash
cantonjs-codegen --dar ./model.dar --output ./src/generated
```

```typescript
import { Asset } from './generated/Main.js'

// Full type safety — templateId, choice args, payload all typed
await client.createContract(Asset.templateId, {
  owner: 'Alice',  // type-checked
  value: '100',    // type-checked
})
```

## Companion: cantonctl

cantonjs pairs with [cantonctl](https://github.com/merged-one/cantonctl) ("Hardhat for Canton") for a complete developer workflow:

| Tool | Role | Analogy |
|------|------|---------|
| cantonjs | Client library | viem |
| cantonctl | CLI & tooling | Hardhat |

They share error conventions, JWT formats, and testing philosophy.
