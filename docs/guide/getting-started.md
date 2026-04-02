# Getting Started

cantonjs is the TypeScript interface for the Canton Network Ledger API V2 — **viem for Canton**.

It provides type-safe, tree-shakeable functions for interacting with Canton ledger nodes, with first-class support for streaming, testing, and code generation.

## Installation

```bash
npm install cantonjs
```

## Quick Start

### 1. Create a Transport

The transport layer handles HTTP communication with your Canton node's JSON API V2:

```typescript
import { jsonApi } from 'cantonjs'

const transport = jsonApi({
  url: 'http://localhost:7575',
  token: 'your-jwt-token',
})
```

### 2. Create a LedgerClient

The `LedgerClient` is scoped to a party identity via JWT:

```typescript
import { createLedgerClient } from 'cantonjs'

const client = createLedgerClient({
  transport,
  actAs: 'Alice::1234',
})
```

### 3. Interact with Contracts

```typescript
// Create a contract
const created = await client.createContract(
  '#my-pkg:Main:Asset',
  { owner: 'Alice', value: '100' },
)

// Exercise a choice
const tx = await client.exerciseChoice(
  '#my-pkg:Main:Asset',
  created.contractId,
  'Transfer',
  { newOwner: 'Bob' },
)

// Query active contracts
const contracts = await client.queryContracts('#my-pkg:Main:Asset')
```

### 4. Stream Updates

Subscribe to real-time contract updates using the AsyncIterator pattern:

```typescript
import { streamUpdates } from 'cantonjs'

const controller = new AbortController()

const stream = streamUpdates(transport, {
  beginExclusive: '0',
  signal: controller.signal,
})

for await (const update of stream) {
  console.log('Update:', update.updateId)
}

// Cancel the stream
controller.abort()
```

## Subpath Imports

cantonjs provides focused subpath imports for tree-shaking:

```typescript
import { createLedgerClient } from 'cantonjs/ledger'
import { createAdminClient } from 'cantonjs/admin'
import { createTestClient } from 'cantonjs/testing'
import { localNet, devNet, testNet, mainNet } from 'cantonjs/chains'
import type { TemplateDescriptor, InferPayload } from 'cantonjs/codegen'
```

## What's Next?

- [Transport](/guide/transport) — Configure JSON API, gRPC, or fallback transports
- [LedgerClient](/guide/ledger-client) — Full contract operation reference
- [Streaming](/guide/streaming) — Real-time subscriptions
- [Codegen](/guide/codegen) — Generate TypeScript from Daml models
- [React Hooks](/guide/react) — Build Canton dApps with React
- [Testing](/guide/testing) — Mock transports and sandbox fixtures
