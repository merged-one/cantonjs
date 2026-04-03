# Why cantonjs?

cantonjs exists for application teams that want direct, typed access to a Canton participant's Ledger API V2 from TypeScript. It focuses on the runtime layer inside app code: Ledger, Admin, and Test clients; transports; streaming; errors; testing; and optional React or codegen support.

It is intentionally not the canonical Daml build, test, or codegen toolchain, not the official full-stack reference-app path, and not the official wallet-connected stack. Those roles remain with DPM, Quickstart, and the official dApp SDK, dApp API, Wallet Gateway, and Wallet SDK.

## What Direct Participant App Teams Need

- **Direct API V2 access** — talk to a participant from application code without wrapping everything in a broader framework
- **Small, tree-shakeable exports** — import the runtime surface you actually need
- **Injected transports and auth** — handle request-scoped tokens, sessions, gRPC, and fallback transport composition explicitly
- **Real-time streaming** — follow contract and completion updates without building your own reconnect loop
- **Structured errors** — get machine-readable failures with recovery hints instead of ad hoc exceptions
- **Predictable testing** — use mock transports, recording transports, and sandbox fixtures rather than module-level mocking
- **Optional app-side codegen** — generate TypeScript from existing DAR artifacts when your application needs stronger typing

## The cantonjs Approach

### Function Exports, Not Classes

```typescript
import { createLedgerClient } from 'cantonjs'

const client = createLedgerClient({ transport, actAs: 'Alice::1234' })
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
  // Process updates with automatic reconnect and offset tracking
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

### Optional Codegen For App Types

Generate TypeScript from DAR artifacts your Daml toolchain already produced:

```bash
cantonjs-codegen --dar ./model.dar --output ./src/generated
```

```typescript
import { Asset } from './generated/Main.js'

await client.createContract(Asset.templateId, {
  owner: 'Alice',
  value: '100',
})
```

## Ecosystem Fit

| Tool | Primary role |
|------|--------------|
| cantonjs | Application-side SDK for direct participant work |
| DPM | Canonical Daml build, test, and codegen foundation |
| Quickstart | Official full-stack and reference-app path |
| Official wallet stack | Wallet-connected UX, wallet-provider integration, custody, and gateway responsibilities |
| [cantonctl](https://github.com/merged-one/cantonctl) | CLI companion for sandbox, admin, and test workflows |

These boundaries are captured in the canonical [Positioning note](/positioning).
