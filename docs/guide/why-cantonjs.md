# Why cantonjs?

`cantonjs` exists because app teams repeatedly need the same runtime layer once they decide to work directly against a Canton participant: typed clients, explicit transport and auth handling, streaming, testing, and a small API surface they can embed inside normal TypeScript services and UIs.

This is a product-scope choice, not a "sell to everyone" story. The repo is centered on participant-connected application code, with optional React, DAR-to-TypeScript codegen, and selected stable/public Splice add-ons around that core. For persona-level guidance, see [Target Users](/guide/target-users). For the detailed "when to use what" matrix, see [Ecosystem Fit](/guide/ecosystem-fit).

## The Gap It Fills

- Raw participant APIs and generated clients stay close to the wire, but most teams still need reusable runtime concerns such as auth injection, streaming, test seams, and structured error handling.
- Official onboarding and wallet-connected tools own different boundaries: Daml lifecycle, end-to-end starter flows, wallet discovery, provider semantics, custody, and gateway responsibilities.
- Teams building participant-connected services and apps still need one app-side TypeScript runtime that fits directly into their codebase once those other boundary decisions are already made.

## What The Repo Optimizes For

- Direct participant-connected application code
- Tree-shakeable function exports instead of class-heavy SDK state
- Explicit transport injection, request-scoped auth, and testability
- Reconnecting streams and structured CJ-coded errors
- Optional React and DAR-to-TypeScript layers for the same app-side runtime
- Selected stable/public Splice add-ons that stay aligned with the participant-first core

## Why A Dedicated SDK Is Justified

| Team | Why `cantonjs` is a fit |
| --- | --- |
| Backend and full-stack participant services | Embed typed Ledger/Admin/Test clients, explicit auth, streaming, and tests directly into service code without adopting a broader framework |
| Participant-private React apps | Reuse the same participant runtime through `cantonjs-react` for private reads, writes, and live updates |
| Integration and data teams | Treat participant state and events as application inputs with durable transport control, stable typing, and predictable failure handling |
| Advanced stable/public Splice integrators | Add public Scan, selected external Validator support, or stable published interfaces without redefining the repo as a universal SDK |

## The cantonjs Runtime Shape

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

## Where It Stops

- `cantonjs` is not the canonical Daml build, test, or codegen toolchain.
- It is not the official full-stack onboarding or reference-app path.
- It is not the official wallet-connected or wallet-provider stack.
- It is not the right lead product for wallet providers, exchanges, custodians, or teams whose main problem is wallet discovery and provider UX.
- It does not promise GA coverage for every validator-private, operator-private, or unstable ecosystem surface.

Those boundaries are captured in the canonical [Positioning note](/positioning), the detailed [Target Users](/guide/target-users) guide, and the tool-by-tool [Ecosystem Fit guide](/guide/ecosystem-fit).
